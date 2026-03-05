import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Shipment, ShipmentStatus, Order, OrderStatus, User, TrackingHistory } from '@core/database/entities';
import { NotificationsService } from '@modules/notification/notifications.service';

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
   * ✅ ไรเดอร์กด "รับงาน" (Accept Job) - แค่จองงาน ยังไม่ได้ไปรับของ
   * สถานะยังคงเป็น WAITING_PICKUP แต่ assign courierId แล้ว
   */
  async acceptJob(shipmentId: number, courierId: number) {
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

    // ✅ ถ้ามีไรเดอร์คนอื่นรับไปแล้ว
    if (shipment.courierId && shipment.courierId !== courierId) {
      throw new BadRequestException('งานนี้ถูกรับไปแล้วโดยไรเดอร์คนอื่น');
    }

    // ✅ Assign courier แต่ยังคงสถานะ WAITING_PICKUP
    shipment.courierId = courierId;
    await this.shipmentRepo.save(shipment);

    // ✅ บันทึก Tracking: ไรเดอร์รับงานแล้ว กำลังเดินทางไปรับพัสดุ
    await this.addTrackingLog(
      shipment.orderId,
      'COURIER_ASSIGNED',
      'ไรเดอร์รับงานแล้ว',
      'ไรเดอร์กำลังเดินทางไปรับพัสดุจากร้านค้า',
    );

    // ✅ อัปเดตสถานะออเดอร์เป็น RIDER_ASSIGNED
    await this.orderRepo.update(shipment.orderId, {
      orderStatus: OrderStatus.RIDER_ASSIGNED,
    });

    this.sendNoti(
      shipment.order.orderedBy,
      'ไรเดอร์รับงานแล้ว',
      'ไรเดอร์กำลังเดินทางไปรับพัสดุจากร้านค้า',
      shipment.orderId,
    );

    return shipment;
  }

  /**
   * ✅ ไรเดอร์สแกน QR ที่ร้าน เพื่อยืนยันรับของจริง (Pickup Package)
   * เปลี่ยนสถานะจาก WAITING_PICKUP → IN_TRANSIT
   */
  async pickupPackage(shipmentId: number, courierId: number) {
    const shipment = await this.shipmentRepo.findOne({
      where: { id: shipmentId },
      relations: ['order', 'order.orderedBy'],
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    // ✅ ตรวจสอบว่าเป็นไรเดอร์ที่รับงานนี้หรือไม่
    if (shipment.courierId && shipment.courierId !== courierId) {
      throw new BadRequestException('คุณไม่ได้รับมอบหมายให้รับงานนี้');
    }

    if (shipment.status !== ShipmentStatus.WAITING_PICKUP) {
      throw new BadRequestException('งานนี้ถูกรับไปแล้ว');
    }

    // ✅ ถ้ายังไม่ได้ assign ให้ assign ตอนนี้เลย (กรณีสแกน QR โดยไม่กด "รับงาน" ก่อน)
    if (!shipment.courierId) {
      shipment.courierId = courierId;
    }

    shipment.status = ShipmentStatus.IN_TRANSIT;
    shipment.pickupTime = new Date();
    await this.shipmentRepo.save(shipment);

    // ✅ บันทึก Tracking: ไรเดอร์รับพัสดุจากร้านแล้ว
    await this.addTrackingLog(
      shipment.orderId,
      'PICKED_UP',
      'ไรเดอร์รับพัสดุแล้ว',
      'ไรเดอร์รับพัสดุจากร้านค้าเรียบร้อยแล้ว',
    );

    // ✅ อัปเดตสถานะออเดอร์เป็น PICKED_UP
    await this.orderRepo.update(shipment.orderId, {
      orderStatus: OrderStatus.PICKED_UP,
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
   * ✅ ถ้ายังไม่มี shipment แต่ order อยู่ในสถานะที่พร้อมส่ง จะสร้าง shipment ให้อัตโนมัติ
   * รองรับทั้ง Order ID (number) และ Tracking Number (string)
   */
  async getOrderPreviewByOrderId(identifier: string | number) {
    console.log(`[getOrderPreviewByOrderId] Looking for identifier: ${identifier}`);

    let orderId: number;

    // 1. ตรวจสอบว่าเป็น Numeric ID หรือไม่
    const isNumeric = !isNaN(Number(identifier));

    if (isNumeric) {
      orderId = Number(identifier);
    } else {
      // 2. ถ้าไม่ใช่ตัวเลข ให้ค้นหาจาก Tracking Number ในตาราง Order
      const order = await this.orderRepo.findOne({
        where: { trackingNumber: String(identifier) },
        select: ['id']
      });

      if (!order) {
        console.log(`[getOrderPreviewByOrderId] Tracking Number ${identifier} not found`);
        throw new NotFoundException(`ไม่พบข้อมูลสำหรับหมายเลขพัสดุ ${identifier}`);
      }
      orderId = order.id;
      console.log(`[getOrderPreviewByOrderId] Tracking Number ${identifier} mapped to Order ID ${orderId}`);
    }

    console.log(`[getOrderPreviewByOrderId] Final Order ID: ${orderId}`);

    let shipment = await this.shipmentRepo.findOne({
      where: { orderId },
      relations: [
        'order',
        'order.orderedBy',
        'order.productOnOrders',
        'order.productOnOrders.product',
        'order.productOnOrders.product.store',
      ],
    });

    console.log(`[getOrderPreviewByOrderId] Shipment found: ${shipment ? shipment.id : 'null'}`);

    // ✅ ถ้ายังไม่มี shipment ให้ดึง order มาตรวจสอบก่อน
    if (!shipment) {
      const order = await this.orderRepo.findOne({
        where: { id: orderId },
        relations: [
          'orderedBy',
          'productOnOrders',
          'productOnOrders.product',
          'productOnOrders.product.store',
        ],
      });

      if (!order) {
        console.log(`[getOrderPreviewByOrderId] Order ${orderId} not found`);
        throw new NotFoundException('ไม่พบออเดอร์นี้');
      }

      console.log(`[getOrderPreviewByOrderId] Order ${orderId} found, status: ${order.orderStatus}`);

      // ✅ ตรวจสอบว่า order อยู่ในสถานะที่ควรมี shipment หรือไม่
      const readyForShipmentStatuses = [
        'PROCESSING',
        'READY_FOR_PICKUP',
        'SHIPPED',
        'RIDER_ASSIGNED',
        'PICKED_UP',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'COMPLETED',
      ];

      if (readyForShipmentStatuses.includes(order.orderStatus)) {
        // ✅ สร้าง shipment อัตโนมัติ
        const newShipment = await this.createShipmentForOrder(orderId);

        // ดึง shipment พร้อม relations
        shipment = await this.shipmentRepo.findOne({
          where: { id: newShipment.id },
          relations: [
            'order',
            'order.orderedBy',
            'order.productOnOrders',
            'order.productOnOrders.product',
            'order.productOnOrders.product.store',
          ],
        });
      } else {
        // ✅ ถ้า order ยังไม่พร้อมส่ง ให้แสดงข้อมูล order พร้อมบอกว่ายังไม่พร้อม
        const firstItem = order.productOnOrders?.[0];
        return {
          id: order.id,
          shipmentId: null,
          shipmentStatus: 'NOT_CREATED',
          orderStatus: order.orderStatus,
          customerName: order.orderedBy?.name || '',
          orderedById: order.orderedById,
          storeName: firstItem?.product?.store?.name || '',
          shippingAddress: order.shippingAddress,
          totalItems: order.productOnOrders?.length || 0,
          availableAction: 'NONE' as const,
          updatedAt: order.updatedAt,
          message: `ออเดอร์ยังอยู่ในสถานะ "${order.orderStatus}" รอให้ร้านค้ายอมรับและเตรียมสินค้าก่อน`,
        };
      }
    }

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
    // ✅ ดึงข้อมูล order ก่อนเพื่อเช็ค status และ ownership
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['orderedBy'],
    });

    if (!order) {
      throw new NotFoundException('ไม่พบออเดอร์นี้');
    }

    // ✅ ตรวจสอบว่าเป็นเจ้าของออเดอร์หรือไม่
    if (order.orderedById !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }

    // ✅ ถ้าออเดอร์ยังไม่ถึงขั้นตอนจัดส่ง (PENDING, VERIFYING, PROCESSING, PENDING_CONFIRMATION) ให้ return null
    // ไม่ต้อง throw error เพราะเป็นสถานะปกติที่ยังไม่มี shipment
    if (
      order.orderStatus === OrderStatus.PENDING ||
      order.orderStatus === OrderStatus.VERIFYING ||
      order.orderStatus === OrderStatus.PROCESSING ||
      order.orderStatus === OrderStatus.PENDING_CONFIRMATION
    ) {
      return null; // ยังไม่มี shipment เพราะยังไม่ถึงขั้นตอนจัดส่ง
    }

    // ✅ ดึงข้อมูล shipment (ถ้ามี)
    const shipment = await this.shipmentRepo.findOne({
      where: { orderId },
      relations: ['order', 'order.orderedBy'],
    });

    if (!shipment) {
      // ✅ ถ้าออเดอร์ถึงขั้นตอนจัดส่งแล้วแต่ยังไม่มี shipment ให้ return null (ไม่ throw error)
      // เพราะอาจเป็นกรณีที่ร้านค้ายังไม่ได้สร้าง shipment
      return null;
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
   */
  async getTrackingTimeline(orderId: number) {
    return this.trackingRepo.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * ✅ ไรเดอร์: ดึงงานที่พร้อมรับ (PROCESSING หรือ SHIPPED orders ที่มี Shipment WAITING_PICKUP)
   * หมายเหตุ: รับ SHIPPED ด้วยเพราะ admin อาจเปลี่ยน order status เป็น SHIPPED ก่อนที่จะมีไรเดอร์รับงาน
   */
  async getAvailableJobs() {
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
      order: { createdAt: 'ASC' }, // เก่า → ใหม่
    });

    // ✅ กรองออเดอร์ที่มี status = PROCESSING หรือ SHIPPED
    // (SHIPPED อาจเกิดจาก admin เปลี่ยนสถานะเอง แต่ shipment ยังรอไรเดอร์รับ)
    const filtered = shipments.filter(
      (s) =>
        s.order.orderStatus === OrderStatus.PROCESSING ||
        s.order.orderStatus === OrderStatus.READY_FOR_PICKUP ||
        s.order.orderStatus === OrderStatus.SHIPPED,
    );

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
   * ✅ ไรเดอร์: ดึงงานที่ตัวเองรับแล้ว (WAITING_PICKUP ที่ assign แล้ว, IN_TRANSIT, OUT_FOR_DELIVERY)
   */
  async getMyActiveJobs(courierId: number) {
    const shipments = await this.shipmentRepo.find({
      where: {
        courierId,
        status: In([
          ShipmentStatus.WAITING_PICKUP, // ✅ รวมงานที่รับแล้วแต่ยังไม่ได้ไปรับของ
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


