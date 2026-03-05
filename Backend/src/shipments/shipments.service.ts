import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Shipment, ShipmentStatus } from '../entities/shipment.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { TrackingHistory } from '../entities/tracking-history.entity';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(TrackingHistory)
    private readonly trackingRepo: Repository<TrackingHistory>,
    private readonly notificationsService: NotificationsService,
  ) { }

  /**
   * ใช้ตอนร้านกด "พร้อมจัดส่ง" เพื่อสร้าง Shipment ให้คำสั่งซื้อนั้น
   * (สามารถถูกเรียกจาก OrdersService ในขั้นตอนต่อไป)
   */
  async createShipmentForOrder(orderId: number) {
    // ถ้ามี Shipment ของออเดอร์นี้อยู่แล้ว ให้ใช้ตัวเดิม (กันการสร้างซ้ำ)
    const existing = await this.shipmentRepo.findOne({ where: { orderId } });
    if (existing) {
      return existing;
    }

    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isCod = order.paymentMethod === 'COD';

    const shipment = this.shipmentRepo.create({
      orderId,
      status: ShipmentStatus.WAITING_PICKUP,
      codAmount: isCod ? Number(order.cartTotal || 0) : 0,
    });
    const saved = await this.shipmentRepo.save(shipment);

    // ✅ บันทึก Tracking: ร้านเตรียมของพร้อมรอขนส่ง
    // ไม่สร้าง "กำลังค้นหาคนขับ" ที่นี่ เพราะร้านค้ายังไม่กด "พร้อมจัดส่ง"
    // จะสร้าง "กำลังค้นหาคนขับ" เมื่อร้านค้ากด "พร้อมจัดส่ง" (updateStatus เป็น PROCESSING) แทน
    await this.addTrackingLog(
      orderId,
      'PREPARING',
      'ผู้ส่งกำลังเตรียมพัสดุ',
      'ร้านค้ากำลังเตรียมพัสดุสำหรับการจัดส่ง',
    );

    return saved;
  }

  private async addTrackingLog(
    orderId: number,
    status: string,
    title: string,
    description = '',
  ) {
    const log = this.trackingRepo.create({
      orderId,
      status,
      title,
      description,
    });
    return this.trackingRepo.save(log);
  }

  /**
   * Public method สำหรับเรียกจาก OrdersService
   */
  async addTrackingLogDirect(
    orderId: number,
    status: string,
    title: string,
    description = '',
  ) {
    return this.addTrackingLog(orderId, status, title, description);
  }

  /**
   * Dashboard ไรเดอร์: แสดงงานที่ต้องทำของ courierId
   * - type = 'ACTIVE'  → WAITING_PICKUP + งานที่ตัวเองรับแล้ว (IN_TRANSIT, OUT_FOR_DELIVERY)
   * - type = 'HISTORY' → งานที่ตัวเองส่งสำเร็จแล้ว (DELIVERED)
   */
  async getMyTasks(courierId: number, type: 'ACTIVE' | 'HISTORY' = 'ACTIVE') {
    if (type === 'HISTORY') {
      return this.shipmentRepo.find({
        where: {
          courierId,
          status: ShipmentStatus.DELIVERED,
        },
        relations: [
          'order',
          'order.orderedBy',
          'order.productOnOrders',
          'order.productOnOrders.product',
          'order.productOnOrders.product.store',
        ],
        order: { createdAt: 'DESC' },
      });
    }

    // ACTIVE
    return this.shipmentRepo.find({
      where: [
        { status: ShipmentStatus.WAITING_PICKUP },
        {
          courierId,
          status: In([
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.OUT_FOR_DELIVERY,
          ]),
        },
      ],
      relations: [
        'order',
        'order.orderedBy',
        'order.productOnOrders',
        'order.productOnOrders.product',
        'order.productOnOrders.product.store',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * ไรเดอร์กด "รับงาน/รับพัสดุ" จากร้าน
   */
  async pickupPackage(shipmentId: number, courierId: number) {
    const shipment = await this.shipmentRepo.findOne({
      where: { id: shipmentId },
      relations: ['order', 'order.orderedBy'],
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.status !== ShipmentStatus.WAITING_PICKUP) {
      throw new BadRequestException('งานนี้ถูกดำเนินการไปแล้ว');
    }

    shipment.courierId = courierId;
    shipment.status = ShipmentStatus.IN_TRANSIT;
    shipment.pickupTime = new Date();
    await this.shipmentRepo.save(shipment);

    // ✅ บันทึก Tracking: คนขับกำลังเข้ารับพัสดุของคุณ (ไรเดอร์รับงานแล้ว)
    await this.addTrackingLog(
      shipment.orderId,
      'COURIER_ASSIGNED',
      'คนขับกำลังเข้ารับพัสดุของคุณ',
      'ไรเดอร์ได้รับมอบหมายให้รับพัสดุ',
    );

    // ✅ อัปเดตสถานะออเดอร์เป็น RIDER_ASSIGNED (มีไรเดอร์รับงานแล้ว กำลังไปรับ)
    await this.orderRepo.update(shipment.orderId, {
      orderStatus: OrderStatus.RIDER_ASSIGNED,
    });

    // แจ้งเตือนลูกค้า (Push + Inbox)
    this.sendNoti(
      shipment.order.orderedBy,
      'พัสดุถูกรับเข้าระบบแล้ว',
      'ไรเดอร์กำลังนำพัสดุไปยังศูนย์คัดแยก',
      shipment.orderId,
    );

    return shipment;
  }

  /**
   * ไรเดอร์กด "ออกนำจ่าย"
   */
  async outForDelivery(shipmentId: number, courierId: number) {
    const shipment = await this.shipmentRepo.findOne({
      where: { id: shipmentId, courierId },
      relations: ['order', 'order.orderedBy'],
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    shipment.status = ShipmentStatus.OUT_FOR_DELIVERY;
    await this.shipmentRepo.save(shipment);

    // ✅ อัปเดต Order Status เป็น OUT_FOR_DELIVERY
    await this.orderRepo.update(shipment.orderId, {
      orderStatus: OrderStatus.OUT_FOR_DELIVERY,
    });

    await this.addTrackingLog(
      shipment.orderId,
      'OUT_FOR_DELIVERY',
      'พัสดุอยู่ระหว่างการนำส่ง',
      'ไรเดอร์กำลังนำพัสดุไปส่งที่บ้านของคุณ',
    );

    this.sendNoti(
      shipment.order.orderedBy,
      'พัสดุกำลังนำจ่าย',
      'ไรเดอร์กำลังนำพัสดุไปส่งที่บ้านของคุณ',
      shipment.orderId,
    );

    return shipment;
  }

  /**
   * ส่งสำเร็จ (พร้อทแนบรูป/สถานะ COD + ลายเซ็น + พิกัด)
   */
  async completeDelivery(
    shipmentId: number,
    courierId: number,
    data: {
      proofImage?: string;
      collectedCod?: boolean;
      signatureImage?: string;
      location?: { lat: number; lng: number };
    },
  ) {
    const shipment = await this.shipmentRepo.findOne({
      where: { id: shipmentId, courierId },
      relations: ['order', 'order.orderedBy'],
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    shipment.status = ShipmentStatus.DELIVERED;
    shipment.deliveredTime = new Date();
    if (data.proofImage) {
      shipment.proofImage = data.proofImage;
    }
    if (typeof data.collectedCod === 'boolean') {
      shipment.isCodPaid = data.collectedCod;
    }
    if (data.signatureImage) {
      shipment.signatureImage = data.signatureImage;
    }
    if (data.location) {
      shipment.latitude = data.location.lat;
      shipment.longitude = data.location.lng;
    }

    await this.shipmentRepo.save(shipment);

    // อัปเดตออเดอร์เป็น DELIVERED (รอลูกค้ามากด COMPLETED เอง)
    await this.orderRepo.update(shipment.orderId, {
      orderStatus: OrderStatus.DELIVERED,
    });

    await this.addTrackingLog(
      shipment.orderId,
      'DELIVERED',
      'พัสดุถูกจัดส่งสำเร็จแล้ว',
      'ขอบคุณที่ใช้บริการ GTXShop',
    );

    this.sendNoti(
      shipment.order.orderedBy,
      'พัสดุจัดส่งสำเร็จ',
      'กรุณาเปิดแอปและกดรับสินค้าเพื่อยืนยันคำสั่งซื้อ',
      shipment.orderId,
    );

    return shipment;
  }

  private async sendNoti(
    user: User,
    title: string,
    body: string,
    orderId?: number,
  ) {
    if (!user) {
      return;
    }
    try {
      const data =
        orderId != null
          ? {
            type: 'ORDER',
            orderId,
            url: `gtxshop://order/${orderId}`,
          }
          : {};

      // ใช้ sendAndSave เพื่อให้มีทั้ง Push + เก็บในตาราง notification (Inbox)
      await this.notificationsService.sendAndSave(
        user,
        title,
        body,
        'ORDER',
        data,
      );
    } catch (e) {
      // ไม่ต้อง throw ขึ้นไป เพราะไม่อยากให้ flow จัดส่งล้มจากการส่ง noti ไม่ได้
      // แค่ log ไว้พอ
      // eslint-disable-next-line no-console
      console.error('Failed to send courier notification', e);
    }
  }

  /**
   * ใช้โดยหน้าสแกน QR: ดูข้อมูลพัสดุจาก orderId
   * - คืน summary ของออเดอร์ + shipment ที่เกี่ยวข้อง พร้อม action ที่ทำได้
   */
  async getOrderPreviewByOrderId(orderId: number) {
    const shipment = await this.shipmentRepo.findOne({
      where: { orderId },
      relations: [
        'order',
        'order.orderedBy',
        'order.productOnOrders',
        'order.productOnOrders.product',
        'order.productOnOrders.product.store',
      ],
    });

    if (!shipment) {
      throw new NotFoundException('ไม่พบพัสดุสำหรับออเดอร์นี้');
    }

    const { order } = shipment;
    const firstItem = order.productOnOrders?.[0];

    let availableAction: 'PICKUP' | 'DELIVER' | 'NONE' = 'NONE';
    if (shipment.status === ShipmentStatus.WAITING_PICKUP) {
      availableAction = 'PICKUP';
    } else if (
      shipment.status === ShipmentStatus.IN_TRANSIT ||
      shipment.status === ShipmentStatus.OUT_FOR_DELIVERY
    ) {
      availableAction = 'DELIVER';
    }

    return {
      id: order.id,
      shipmentId: shipment.id,
      shipmentStatus: shipment.status,
      orderStatus: order.orderStatus,
      customerName: order.orderedBy?.name || '',
      orderedById: order.orderedById, // ✅ เพิ่ม orderedById เพื่อให้ frontend ตรวจสอบว่า user เป็นเจ้าของออเดอร์หรือไม่
      storeName: firstItem?.product?.store?.name || '',
      shippingAddress: order.shippingAddress,
      totalItems: order.productOnOrders?.length || 0,
      availableAction,
      updatedAt: shipment.updatedAt,
    };
  }

  /**
   * ✅ ดึงข้อมูล shipment detail สำหรับลูกค้า (พร้อม proofImage และ signatureImage)
   */
  async getShipmentByOrderId(orderId: number, userId: number) {
    const shipment = await this.shipmentRepo.findOne({
      where: { orderId },
      relations: ['order', 'order.orderedBy'],
    });

    if (!shipment) {
      throw new NotFoundException('ไม่พบข้อมูลการจัดส่งสำหรับออเดอร์นี้');
    }

    // ✅ ตรวจสอบว่าเป็นเจ้าของออเดอร์หรือไม่
    if (shipment.order.orderedById !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }

    // ✅ ส่งกลับเฉพาะข้อมูลที่ลูกค้าต้องการ
    return {
      id: shipment.id,
      orderId: shipment.orderId,
      status: shipment.status,
      proofImage: shipment.proofImage,
      signatureImage: shipment.signatureImage,
      deliveredTime: shipment.deliveredTime,
      latitude: shipment.latitude,
      longitude: shipment.longitude,
    };
  }

  /**
   * ดึง Timeline การขนส่งของคำสั่งซื้อหนึ่ง ๆ
   * เรียงจากเก่าไปใหม่ (ASC) เพื่อแสดง Timeline ตามลำดับเวลา
   * ถ้าไม่มีข้อมูลใน tracking_history จะสร้าง timeline จาก order status
   */
  async getTrackingTimeline(orderId: number) {
    console.log('🔍 [Backend] getTrackingTimeline called for orderId:', orderId);

    const trackingHistory = await this.trackingRepo.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });

    console.log('📋 [Backend] trackingHistory count:', trackingHistory.length);

    // ดึง order เพื่อมาสร้าง generated timeline เปรียบเทียบ
    const order = await this.orderRepo.findOne({ where: { id: orderId } });

    if (!order) {
      return trackingHistory;
    }

    console.log('📦 [Backend] Order found, status:', order.orderStatus);

    // สร้าง timeline จาก order status ปัจจุบัน (Full Flow)
    const generatedTimeline = this.generateTimelineFromOrderStatus(order);
    console.log('✅ [Backend] Generated timeline size:', generatedTimeline.length);

    // เปรียบเทียบ: ถ้า Generated Timeline มีข้อมูลมากกว่า (ครบกว่า) ให้ใช้ Generated Timeline
    // กรณีนี้จะช่วยแก้ปัญหา Order เก่าที่มี Tracking History ไม่ครบ
    if (generatedTimeline.length > trackingHistory.length) {
      console.log('🚀 [Backend] Using Generated Timeline because it has more steps');
      return generatedTimeline;
    }

    // ถ้า Tracking History มีข้อมูลพอๆ กันหรือมากกว่า ให้ใช้ Tracking History (เพราะเวลาแม่นยำกว่า)
    console.log('✅ [Backend] Using Database Tracking History');
    return trackingHistory;
  }

  /**
   * สร้าง Timeline จาก Order Status (สำหรับ order เก่าที่ไม่มี tracking history)
   */
  private generateTimelineFromOrderStatus(order: Order) {
    const timeline: any[] = [];
    const status = order.orderStatus;
    const createdAt = order.createdAt;
    const updatedAt = order.updatedAt;

    // ลำดับสถานะตาม flow
    const statusFlow = [
      { status: 'ORDER_PLACED', title: 'สั่งซื้อสำเร็จ', description: 'คำสั่งซื้อของคุณได้รับการยืนยันแล้ว' },
      { status: 'PAYMENT_VERIFIED', title: 'ชำระเงินเรียบร้อย', description: 'ชำระเงินสำเร็จแล้ว' },
      { status: 'PENDING_CONFIRMATION', title: 'ร้านค้ายืนยันรับออเดอร์แล้ว', description: 'รอร้านค้าเตรียมสินค้า' },
      { status: 'PROCESSING', title: 'ร้านค้ากำลังเตรียมสินค้า', description: 'ร้านค้ากำลังเตรียมพัสดุสำหรับการจัดส่ง' },
      { status: 'READY_FOR_PICKUP', title: 'สินค้าพร้อมแล้ว กำลังหาไรเดอร์', description: 'ระบบกำลังค้นหาไรเดอร์สำหรับรับพัสดุ' },
      { status: 'RIDER_ASSIGNED', title: 'ไรเดอร์กำลังไปรับสินค้า', description: 'ไรเดอร์ได้รับมอบหมายให้รับพัสดุ' },
      { status: 'PICKED_UP', title: 'ไรเดอร์รับสินค้าแล้ว', description: 'พัสดุอยู่ระหว่างการขนส่ง' },
      { status: 'OUT_FOR_DELIVERY', title: 'กำลังจัดส่งถึงคุณ', description: 'ไรเดอร์กำลังนำพัสดุไปส่งที่บ้านของคุณ' },
      { status: 'DELIVERED', title: 'พัสดุถูกจัดส่งสำเร็จแล้ว', description: 'ขอบคุณที่ใช้บริการ GTXShop' },
      { status: 'COMPLETED', title: 'ยืนยันรับสินค้า', description: 'ออเดอร์เสร็จสมบูรณ์' },
    ];

    // หา index ของ status ปัจจุบัน
    const currentStatusIndex = this.getStatusIndex(status);

    // เพิ่ม step ที่ผ่านมาแล้วใน timeline
    let idCounter = 1;
    for (let i = 0; i <= currentStatusIndex && i < statusFlow.length; i++) {
      const step = statusFlow[i];
      timeline.push({
        id: idCounter++,
        orderId: order.id,
        status: step.status,
        title: step.title,
        description: step.description,
        createdAt: i === 0 ? createdAt : (i === currentStatusIndex ? updatedAt : createdAt),
      });
    }

    return timeline;
  }

  private getStatusIndex(status: string): number {
    // Map order status กับ index ใน statusFlow array
    // statusFlow มี 10 items (index 0-9)
    const statusOrder: Record<string, number> = {
      'PENDING': 0,           // สั่งซื้อสำเร็จ
      'VERIFYING': 1,         // ชำระเงินเรียบร้อย
      'PENDING_CONFIRMATION': 2, // ร้านค้ายืนยันรับออเดอร์แล้ว
      'PROCESSING': 3,        // ร้านค้ากำลังเตรียมสินค้า
      'READY_FOR_PICKUP': 4,  // สินค้าพร้อมแล้ว กำลังหาไรเดอร์
      'RIDER_ASSIGNED': 5,    // ไรเดอร์กำลังไปรับสินค้า
      'SHIPPED': 5,           // (legacy) เหมือน RIDER_ASSIGNED
      'PICKED_UP': 6,         // ไรเดอร์รับสินค้าแล้ว
      'OUT_FOR_DELIVERY': 7,  // กำลังจัดส่งถึงคุณ
      'DELIVERED': 8,         // พัสดุถูกจัดส่งสำเร็จแล้ว
      'COMPLETED': 9,         // ยืนยันรับสินค้า
    };
    return statusOrder[status] ?? 0;
  }

  /**
   * ✅ ไรเดอร์: ดึงงานที่พร้อมรับ (PROCESSING หรือ SHIPPED orders ที่มี Shipment WAITING_PICKUP)
   * หมายเหตุ: รับ SHIPPED ด้วยเพราะ admin อาจเปลี่ยน order status เป็น SHIPPED ก่อนที่จะมีไรเดอร์รับงาน
   */
  async getAvailableJobs() {
    console.log('📋 [getAvailableJobs] Called');

    // หา Shipments ที่ยังไม่มี courierId และ status = WAITING_PICKUP
    const shipments = await this.shipmentRepo.find({
      where: {
        status: ShipmentStatus.WAITING_PICKUP,
        courierId: null, // ยังไม่มีไรเดอร์รับ
      },
      relations: [
        'order',
        'order.orderedBy',
        'order.productOnOrders',
        'order.productOnOrders.product',
        'order.productOnOrders.product.store',
      ],
      order: { createdAt: 'DESC' }, // ใหม่ → เก่า (ออเดอร์ล่าสุดอยู่บนสุด)
    });

    console.log('📦 [getAvailableJobs] Found shipments with WAITING_PICKUP:', shipments.length);
    console.log('📦 [getAvailableJobs] Shipments order statuses:', shipments.map(s => ({
      shipmentId: s.id,
      orderId: s.orderId,
      orderStatus: s.order?.orderStatus,
      courierId: s.courierId,
    })));

    // ✅ กรองออเดอร์ที่มี status = READY_FOR_PICKUP, PROCESSING หรือ SHIPPED
    // READY_FOR_PICKUP = ร้านค้ากดแจ้งขนส่งแล้ว รอไรเดอร์รับงาน
    // PROCESSING = ร้านค้ากำลังเตรียมสินค้า (กรณี SHIPPED อาจเกิดจาก admin)
    const filtered = shipments.filter(
      (s) =>
        s.order.orderStatus === OrderStatus.READY_FOR_PICKUP ||
        s.order.orderStatus === OrderStatus.PROCESSING ||
        s.order.orderStatus === OrderStatus.SHIPPED,
    );

    console.log('✅ [getAvailableJobs] Filtered shipments (READY_FOR_PICKUP/PROCESSING/SHIPPED):', filtered.length);

    // ✅ เพิ่ม latestTracking ให้แต่ละ shipment
    const shipmentsWithTracking = await Promise.all(
      filtered.map(async (shipment) => {
        const timeline = await this.getTrackingTimeline(shipment.orderId);
        const latest = timeline.length > 0 ? timeline[timeline.length - 1] : null;
        return {
          ...shipment,
          latestTracking: latest
            ? {
              title: latest.title,
              description: latest.description,
            }
            : null,
        };
      }),
    );

    return shipmentsWithTracking;
  }

  /**
   * ✅ ไรเดอร์: ดึงงานที่ตัวเองรับแล้ว (SHIPPED, OUT_FOR_DELIVERY)
   */
  async getMyActiveJobs(courierId: number) {
    const shipments = await this.shipmentRepo.find({
      where: {
        courierId,
        status: In([
          ShipmentStatus.IN_TRANSIT,
          ShipmentStatus.OUT_FOR_DELIVERY,
        ]),
      },
      relations: [
        'order',
        'order.orderedBy',
        'order.productOnOrders',
        'order.productOnOrders.product',
        'order.productOnOrders.product.store',
      ],
      order: { updatedAt: 'DESC' }, // ล่าสุด → เก่า
    });

    // ✅ เพิ่ม latestTracking ให้แต่ละ shipment
    const shipmentsWithTracking = await Promise.all(
      shipments.map(async (shipment) => {
        const timeline = await this.getTrackingTimeline(shipment.orderId);
        const latest = timeline.length > 0 ? timeline[timeline.length - 1] : null;
        return {
          ...shipment,
          latestTracking: latest
            ? {
              title: latest.title,
              description: latest.description,
            }
            : null,
        };
      }),
    );

    return shipmentsWithTracking;
  }

  /**
   * ✅ ไรเดอร์: อัปเดตสถานะ Shipment พร้อมหลักฐาน (ถ้ามี)
   */
  async updateShipmentStatus(
    shipmentId: number,
    courierId: number,
    status: ShipmentStatus,
    evidence?: {
      proofImage?: string;
      signatureImage?: string;
      location?: { lat: number; lng: number };
      collectedCod?: boolean;
      failedReason?: string;
    },
  ) {
    const shipment = await this.shipmentRepo.findOne({
      where: { id: shipmentId, courierId },
      relations: ['order', 'order.orderedBy'],
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found or not assigned to you');
    }

    // อัปเดตสถานะ
    shipment.status = status;

    // อัปเดตหลักฐาน (ถ้ามี)
    if (evidence) {
      if (evidence.proofImage) {
        shipment.proofImage = evidence.proofImage;
      }
      if (evidence.signatureImage) {
        shipment.signatureImage = evidence.signatureImage;
      }
      if (evidence.location) {
        shipment.latitude = evidence.location.lat;
        shipment.longitude = evidence.location.lng;
      }
      if (typeof evidence.collectedCod === 'boolean') {
        shipment.isCodPaid = evidence.collectedCod;
      }
      if (evidence.failedReason) {
        shipment.failedReason = evidence.failedReason;
      }
    }

    // อัปเดตเวลา
    if (status === ShipmentStatus.IN_TRANSIT && !shipment.pickupTime) {
      shipment.pickupTime = new Date();
    }
    if (status === ShipmentStatus.DELIVERED && !shipment.deliveredTime) {
      shipment.deliveredTime = new Date();
    }

    await this.shipmentRepo.save(shipment);

    // อัปเดตสถานะ Order ตาม Shipment Status
    let orderStatus: OrderStatus;
    switch (status) {
      case ShipmentStatus.IN_TRANSIT:
        orderStatus = OrderStatus.SHIPPED;
        await this.addTrackingLog(
          shipment.orderId,
          'PICKED_UP',
          'บริษัทขนส่งเข้ารับพัสดุเรียบร้อยแล้ว',
          'พัสดุอยู่ระหว่างการขนส่ง',
        );
        break;
      case ShipmentStatus.OUT_FOR_DELIVERY:
        orderStatus = OrderStatus.OUT_FOR_DELIVERY;
        await this.addTrackingLog(
          shipment.orderId,
          'OUT_FOR_DELIVERY',
          'พัสดุอยู่ระหว่างการนำส่ง',
          'ไรเดอร์กำลังนำพัสดุไปส่งที่บ้านของคุณ',
        );
        break;
      case ShipmentStatus.DELIVERED:
        orderStatus = OrderStatus.DELIVERED;
        await this.addTrackingLog(
          shipment.orderId,
          'DELIVERED',
          'พัสดุถูกจัดส่งสำเร็จแล้ว',
          'ขอบคุณที่ใช้บริการ GTXShop',
        );
        break;
      case ShipmentStatus.FAILED:
        // ไม่เปลี่ยน orderStatus เมื่อส่งไม่สำเร็จ
        await this.addTrackingLog(
          shipment.orderId,
          'DELIVERY_FAILED',
          'การจัดส่งไม่สำเร็จ',
          evidence?.failedReason || 'ไม่สามารถจัดส่งได้',
        );
        return shipment;
      default:
        return shipment;
    }

    // อัปเดต Order Status
    await this.orderRepo.update(shipment.orderId, {
      orderStatus,
    });

    // ส่งแจ้งเตือนลูกค้า
    if (shipment.order.orderedBy) {
      let title = 'อัปเดตสถานะการจัดส่ง';
      let body = `ออเดอร์ #${shipment.orderId} อยู่ในสถานะ: ${status}`;

      if (status === ShipmentStatus.IN_TRANSIT) {
        title = 'พัสดุถูกรับเข้าระบบแล้ว';
        body = 'ไรเดอร์กำลังนำพัสดุไปยังศูนย์คัดแยก';
      } else if (status === ShipmentStatus.OUT_FOR_DELIVERY) {
        title = 'พัสดุกำลังนำจ่าย';
        body = 'ไรเดอร์กำลังนำพัสดุไปส่งที่บ้านของคุณ';
      } else if (status === ShipmentStatus.DELIVERED) {
        title = 'พัสดุจัดส่งสำเร็จ';
        body = 'กรุณาเปิดแอปและกดรับสินค้าเพื่อยืนยันคำสั่งซื้อ';
      }

      this.sendNoti(shipment.order.orderedBy, title, body, shipment.orderId);
    }

    return shipment;
  }
}


