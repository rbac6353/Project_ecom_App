import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm'; // ✅ เพิ่ม DataSource
import { MailerService } from '@nestjs-modules/mailer';
import {
  Order,
  OrderStatus,
  RefundStatus,
} from '../entities/order.entity';
import { ProductOnOrder } from '../entities/product-on-order.entity';
import { Cart } from '../entities/cart.entity';
import { ProductOnCart } from '../entities/product-on-cart.entity';
import { Coupon } from '../entities/coupon.entity';
import { User } from '../entities/user.entity';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity'; // ✅ Import
import { NotificationsService } from '../notifications/notifications.service';
import { CouponsService } from '../coupons/coupons.service';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { StoresService } from '../stores/stores.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { Shipment } from '../entities/shipment.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(ProductOnOrder)
    private productOnOrderRepository: Repository<ProductOnOrder>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(ProductOnCart)
    private productOnCartRepository: Repository<ProductOnCart>,
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Shipment)
    private shipmentRepository: Repository<Shipment>,
    private readonly mailerService: MailerService,
    private readonly notificationsService: NotificationsService,
    private readonly couponsService: CouponsService,
    private readonly notificationSettingsService: NotificationSettingsService, // ✅ เพิ่ม NotificationSettingsService
    private readonly storesService: StoresService, // ✅ เพิ่ม StoresService
    private readonly shipmentsService: ShipmentsService,
    private dataSource: DataSource, // ✅ Inject DataSource เพื่อใช้ Transaction
  ) { }

  // ✅ ฟังก์ชันคำนวณค่าส่ง (Reusable Logic)
  calculateShippingCost(subtotal: number, totalItemsCount: number): number {
    // กฎที่ 1: ซื้อครบ 1,000 บาท ส่งฟรี
    if (subtotal >= 1000) {
      return 0;
    }

    let shippingCost = 40; // ราคาฐาน

    // กฎที่ 2: ถ้าของเกิน 5 ชิ้น คิดเพิ่มชิ้นละ 10 บาท (ค่าน้ำหนัก)
    if (totalItemsCount > 5) {
      shippingCost += (totalItemsCount - 5) * 10;
    }

    return shippingCost;
  }

  // ✅ API สำหรับ Frontend เรียกดูค่าส่งก่อนกดซื้อ (Preview)
  async getShippingPreview(cartItems: any[]) {
    const subtotal = cartItems.reduce(
      (sum, item) =>
        sum + (Number(item.product?.price || item.price || 0) * item.count),
      0,
    );
    const count = cartItems.reduce((sum, item) => sum + item.count, 0);

    const shippingCost = this.calculateShippingCost(subtotal, count);

    return {
      subtotal,
      shippingCost,
      grandTotal: subtotal + shippingCost,
      isFreeShipping: shippingCost === 0,
    };
  }

  async createOrder(
    userId: number,
    shippingAddress: string,
    shippingPhone: string,
    couponCode?: string,
    paymentMethod: string = 'STRIPE', // ✅ เพิ่ม paymentMethod parameter
  ) {
    // ✅ 1. เริ่มต้น Transaction (เหมือนเปิดเซฟ)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ✅ 2. ดึงข้อมูลตะกร้าของผู้ใช้ (Cart) เพื่อดูว่าจะซื้ออะไร
      // (ต้องใช้ Transaction Manager ดึง เพื่อความชัวร์ใน transaction scope)
      // ✅ เพิ่ม relation variant เพื่อดึง variantId
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { orderedById: userId },
        relations: ['productOnCarts', 'productOnCarts.product', 'productOnCarts.variant'],
      });

      if (!cart || cart.productOnCarts.length === 0) {
        throw new BadRequestException('ตะกร้าสินค้าว่างเปล่า');
      }

      // ✅ ดึงข้อมูล user เพื่อส่งอีเมล (นอก Transaction เพื่อความเร็ว)
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      // ✅ เตรียม Array สำหรับเก็บรายการสินค้าที่จะลงในออเดอร์
      const orderItemsEntities: ProductOnOrder[] = [];
      let calculatedTotal = 0;

      // ✅ 3. วนลูปสินค้าในตะกร้าทีละชิ้น (Critical Section 🔴)
      for (const cartItem of cart.productOnCarts) {
        let priceToUse: number;
        let productName: string;

        // ---------------------------------------------------------
        // ✅ กรณีที่ 1: สินค้ามีตัวเลือก (มี variantId ในตะกร้า)
        // ---------------------------------------------------------
        if (cartItem.variantId) {
          // ล็อคแถว Variant
          const variant = await queryRunner.manager.findOne(ProductVariant, {
            where: { id: cartItem.variantId },
            lock: { mode: 'pessimistic_write' }, // 🔒 Lock
          });

          if (!variant) {
            throw new NotFoundException(
              `ไม่พบตัวเลือกสินค้า ID ${cartItem.variantId}`,
            );
          }

          // เช็คสต็อกตัวเลือก
          if (variant.stock < cartItem.count) {
            throw new BadRequestException(
              `ตัวเลือก "${variant.name}" หมดแล้ว (เหลือ ${variant.stock} ชิ้น, ต้องการ ${cartItem.count} ชิ้น)`,
            );
          }

          // ตัดสต็อกตัวเลือก
          variant.stock -= cartItem.count;
          await queryRunner.manager.save(variant);

          // ใช้ราคาของตัวเลือก (ถ้ามี) หรือราคาจาก Cart หรือ Product
          priceToUse =
            variant.price ||
            cartItem.price ||
            (await queryRunner.manager.findOne(Product, {
              where: { id: cartItem.productId },
            }))?.price ||
            0;

          // ดึงชื่อสินค้า
          const product = await queryRunner.manager.findOne(Product, {
            where: { id: cartItem.productId },
          });
          productName = product?.title || 'Unknown Product';
          productName += ` (${variant.name})`; // ต่อชื่อรุ่นเข้าไป (Optional)
        }
        // ---------------------------------------------------------
        // ✅ กรณีที่ 2: สินค้าไม่มีตัวเลือก (ตัดสต็อกแม่)
        // ---------------------------------------------------------
        else {
          // ล็อคแถว Product
          const product = await queryRunner.manager.findOne(Product, {
            where: { id: cartItem.productId },
            lock: { mode: 'pessimistic_write' }, // 🔒 Lock
          });

          if (!product) {
            throw new NotFoundException(
              `ไม่พบสินค้า ID ${cartItem.productId}`,
            );
          }

          // เช็คสต็อก (ใช้ quantity แทน stock)
          if (product.quantity < cartItem.count) {
            throw new BadRequestException(
              `สินค้า "${product.title}" มีไม่พอ (เหลือ ${product.quantity} ชิ้น, ต้องการ ${cartItem.count} ชิ้น)`,
            );
          }

          // ตัดสต็อกแม่
          product.quantity -= cartItem.count;
          await queryRunner.manager.save(product);

          priceToUse = cartItem.price || product.price;
          productName = product.title || 'Unknown Product';
        }

        // อัปเดตยอดขายรวมของตัวแม่ (Sold Count) ไม่ว่าจะเลือกตัวเลือกไหน
        // ใช้ query builder เพื่อความชัวร์ในการบวกค่าเดิม
        await queryRunner.manager.increment(
          Product,
          { id: cartItem.productId },
          'sold',
          cartItem.count,
        );

        // ✅ 6. สร้างรายการสินค้าในออเดอร์ (Snapshot ราคา ณ ตอนซื้อ)
        const orderItem = new ProductOnOrder();
        orderItem.product = await queryRunner.manager.findOne(Product, {
          where: { id: cartItem.productId },
        });
        orderItem.variantId = cartItem.variantId || null; // ✅ บันทึก variantId
        orderItem.count = cartItem.count;
        orderItem.price = Number(priceToUse);

        orderItemsEntities.push(orderItem);
        calculatedTotal += Number(priceToUse) * cartItem.count;
      }

      // ✅ 7. คำนวณยอดรวมสุดท้าย (รวมค่าส่ง/ส่วนลด ถ้ามี)
      let discountAmount = 0;
      let couponId = null;
      let discountCode = null;

      if (couponCode) {
        try {
          // ใช้ CouponsService เพื่อคำนวณส่วนลด
          const couponResult = await this.couponsService.applyCoupon(
            couponCode,
            calculatedTotal,
          );
          discountAmount = couponResult.discountAmount;
          couponId = couponResult.couponId;
          discountCode = couponResult.code;

          // ทำเครื่องหมายว่าคูปองถูกใช้แล้ว (ใน Transaction)
          const coupon = await queryRunner.manager.findOne(Coupon, {
            where: { id: couponId },
          });
          if (coupon) {
            coupon.isUsed = true;
            coupon.usedAt = new Date();
            await queryRunner.manager.save(coupon);
          }
        } catch (error) {
          // ถ้าโค้ดไม่ถูกต้องหรือใช้ไม่ได้ ให้ข้ามไป
          console.error('Coupon validation error:', error);
          discountAmount = 0;
          couponId = null;
          discountCode = null;
        }
      }

      // ✅ เรียกใช้ฟังก์ชันคำนวณค่าส่ง (แทน Hardcode 40)
      const totalItemsCount = orderItemsEntities.reduce(
        (acc, item) => acc + item.count,
        0,
      );
      const shippingCost = this.calculateShippingCost(
        calculatedTotal,
        totalItemsCount,
      );
      const finalTotal = calculatedTotal + shippingCost - discountAmount;

      // ✅ 8. สร้าง Order Object
      const order = new Order();
      order.orderedBy = { id: userId } as User;
      order.cartTotal = finalTotal;
      order.shippingAddress = shippingAddress;
      order.shippingPhone = shippingPhone;
      // ✅ กำหนดสถานะเริ่มต้นตามวิธีชำระเงิน
      // - COD, STRIPE: ลูกค้าชำระแล้ว / ยืนยันจ่ายปลายทางแน่นอน → รอร้านค้ายืนยันออเดอร์ (PENDING_CONFIRMATION)
      //   ร้านค้าต้องกด \"ยอมรับออเดอร์\" ก่อน จึงจะเข้าสู่ขั้นตอนเตรียมสินค้า (PROCESSING)
      // - BANK_TRANSFER, PROMPTPAY อื่น ๆ: รอการชำระ/ตรวจสลิป → PENDING
      const upperMethod = (paymentMethod || 'STRIPE').toUpperCase();
      const initialStatus =
        upperMethod === 'COD' || upperMethod === 'STRIPE'
          ? OrderStatus.PENDING_CONFIRMATION
          : OrderStatus.PENDING;
      order.orderStatus = initialStatus;
      order.productOnOrders = orderItemsEntities; // ใส่รายการสินค้าลงไป (Cascade จะทำงาน)
      order.discountAmount = discountAmount;
      order.discountCode = discountCode;
      order.couponId = couponId;
      order.paymentMethod = paymentMethod; // ✅ บันทึกวิธีการชำระเงิน

      // ✅ ตั้งเวลาหมดอายุการชำระเงิน (30 นาที) - เฉพาะกรณีที่ต้องชำระเงิน
      if (paymentMethod !== 'COD' && order.orderStatus === OrderStatus.PENDING) {
        const expiredAt = new Date();
        expiredAt.setMinutes(expiredAt.getMinutes() + 30);
        order.paymentExpiredAt = expiredAt;
      }

      // ✅ 9. บันทึกออเดอร์
      const savedOrder = await queryRunner.manager.save(order);

      // ✅ 10. ลบสินค้าออกจากตะกร้า (เพราะซื้อไปแล้ว)
      await queryRunner.manager.delete(ProductOnCart, { cartId: cart.id });

      // (Optional) รีเซ็ตยอดรวมตะกร้า
      cart.cartTotal = 0;
      await queryRunner.manager.save(cart);

      // ✅ 11. Commit Transaction (บันทึกทุกอย่างจริง)
      await queryRunner.commitTransaction();

      // ✅ 12. สร้าง Tracking Log: สั่งซื้อสินค้าสำเร็จ (นอก Transaction)
      try {
        await this.shipmentsService.addTrackingLogDirect(
          savedOrder.id,
          'ORDER_PLACED',
          'สั่งซื้อสินค้าสำเร็จ',
          'คำสั่งซื้อของคุณได้รับการยืนยันแล้ว',
        );
      } catch (err) {
        console.error(`Failed to add tracking log for order ${savedOrder.id}:`, err);
      }

      // ✅ 13. ถ้าสถานะเป็น PROCESSING ให้สร้าง Shipment งานไรเดอร์ (นอก Transaction)
      if (savedOrder.orderStatus === OrderStatus.PROCESSING) {
        try {
          await this.shipmentsService.createShipmentForOrder(savedOrder.id);
        } catch (err) {
          // ไม่ให้ flow ล้ม แต่ log ไว้เพื่อตรวจสอบ
          console.error(
            `Failed to create shipment for order ${savedOrder.id}:`,
            err,
          );
        }
      }

      // ✅ ดึงข้อมูลออเดอร์ที่สมบูรณ์พร้อมสินค้า (นอก Transaction)
      const orderWithItems = await this.findOne(savedOrder.id);

      // ✅ ส่งอีเมลยืนยันคำสั่งซื้อ (ไม่ต้อง await เพื่อไม่ให้ User รอนาน)
      if (user && user.email) {
        // เตรียมข้อมูลสินค้าสำหรับแสดงในอีเมล
        const emailItems = orderWithItems.productOnOrders.map((item) => ({
          productName: item.product?.title || 'Unknown Product',
          quantity: item.count,
          price: item.price.toLocaleString(),
        }));

        // ✅ ตรวจสอบและเตรียมชื่อผู้ใช้ (fallback หลายชั้น)
        const userName = user.name || user.email?.split('@')[0] || 'ลูกค้า';

        this.mailerService
          .sendMail({
            to: user.email,
            subject: `ยืนยันคำสั่งซื้อ #${savedOrder.id} - GTXShop`,
            template: './confirmation',
            context: {
              name: userName, // ✅ ใช้ค่าที่ตรวจสอบแล้ว
              orderId: savedOrder.id,
              items: emailItems,
              total: orderWithItems.cartTotal.toLocaleString(),
            },
          })
          .then(() => console.log(`✅ Email sent to ${user.email}`))
          .catch((e) => console.error('❌ Error sending email:', e));
      }

      return orderWithItems;
    } catch (err) {
      // ❌ 12. ถ้ามี Error (เช่น ของหมด, Database พัง) ให้ย้อนกลับทุกอย่าง!
      console.error('Order Transaction Failed:', err);
      await queryRunner.rollbackTransaction();
      throw err; // โยน Error กลับไปให้ Frontend รู้
    } finally {
      // ✅ 13. ปล่อย Connection
      await queryRunner.release();
    }
  }

  async findAll(userId: number): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      where: { orderedById: userId },
      relations: [
        'productOnOrders',
        'productOnOrders.product',
        'productOnOrders.product.images', // ✅ เพิ่ม relation images เพื่อดึงรูปภาพสินค้า
        'productOnOrders.variant', // ✅ เพิ่ม relation variant
        'coupon',
      ],
      order: { createdAt: 'DESC' },
    });

    // ✅ เช็คและยกเลิกออเดอร์ที่หมดเวลาทุกตัวก่อนส่งกลับ (Lazy Check)
    const checkedOrders = await Promise.all(
      orders.map(order => this.checkAndCancelExpired(order))
    );

    return checkedOrders;
  }

  // ✅ ฟังก์ชันช่วยเช็คและยกเลิกออเดอร์ที่หมดเวลาชำระเงินอัตโนมัติ (Lazy Check)
  private async checkAndCancelExpired(order: Order): Promise<Order> {
    if (order.orderStatus === OrderStatus.PENDING && order.paymentExpiredAt) {
      const now = new Date();
      const expireTime = new Date(order.paymentExpiredAt);

      if (now > expireTime) {
        // หมดเวลาแล้ว! ยกเลิกออเดอร์อัตโนมัติ
        console.log(`⏰ Order #${order.id} expired, auto-cancelling...`);
        order.orderStatus = OrderStatus.CANCELLED;
        // ✅ คืนสต็อกสินค้าทุกชิ้นในออเดอร์ (เพราะลูกค้าไม่ได้จ่ายทันเวลา)
        await this.restockOrderItems(order);
        await this.orderRepository.save(order);
      }
    }
    return order;
  }

  // ✅ ฟังก์ชันคืนสต็อกสินค้าเมื่อออเดอร์ถูกยกเลิก
  private async restockOrderItems(order: Order): Promise<void> {
    if (!order.productOnOrders || order.productOnOrders.length === 0) {
      return;
    }

    for (const item of order.productOnOrders) {
      try {
        // ถ้ามี Variant ให้คืนสต็อกที่ Variant ก่อน
        if (item.variantId) {
          const variant = await this.dataSource.getRepository(ProductVariant).findOne({
            where: { id: item.variantId },
          });
          if (variant) {
            variant.stock += item.count;
            await this.dataSource.getRepository(ProductVariant).save(variant);
          }
        } else {
          // ไม่มี Variant -> คืนสต็อกที่ตัว Product แม่
          const product = await this.productRepository.findOne({
            where: { id: item.productId },
          });
          if (product) {
            product.quantity += item.count;
            await this.productRepository.save(product);
          }
        }

        // ปรับยอดขายให้ลดลงด้วย (ถ้าตอนสร้างออเดอร์เคยเพิ่ม sold ไปแล้ว)
        await this.productRepository.decrement(
          { id: item.productId },
          'sold',
          item.count,
        );
      } catch (error) {
        console.error(
          `❌ Restock error for order ${order.id}, productOnOrder ${item.id}:`,
          error,
        );
      }
    }
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'productOnOrders',
        'productOnOrders.product',
        'productOnOrders.product.images',
        'productOnOrders.variant', // ✅ เพิ่ม variant สำหรับ invoice
        'orderedBy', // ✅ เพิ่ม orderedBy สำหรับ invoice
        'coupon',
      ],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // ✅ เช็คและยกเลิกออเดอร์ที่หมดเวลาก่อนส่งกลับ
    return await this.checkAndCancelExpired(order);
  }

  async updateStatus(
    id: number,
    status: string,
    trackingData?: { trackingNumber: string; provider: string },
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'productOnOrders',
        'productOnOrders.product',
        'productOnOrders.product.images',
        'productOnOrders.variant', // ✅ เพิ่ม relation variant
        'coupon',
        'orderedBy', // ดึง user ด้วยเพื่อส่งแจ้งเตือน
      ],
    });
    if (!order) {
      throw new Error('Order not found');
    }

    const previousStatus = order.orderStatus;

    // ตรวจสอบว่า status ที่ส่งมาเป็นค่าที่ถูกต้องใน Enum
    if (Object.values(OrderStatus).includes(status as OrderStatus)) {
      order.orderStatus = status as OrderStatus;
    } else {
      throw new Error(`Invalid order status: ${status}`);
    }

    // ✅ ถ้ามีการส่งเลขพัสดุมา ให้บันทึกด้วย
    if (trackingData) {
      order.trackingNumber = trackingData.trackingNumber;
      order.logisticsProvider = trackingData.provider;
    }

    // ✅ ถ้าเปลี่ยนเป็น CANCELLED และเดิมยังไม่เคย CANCELLED ให้คืนสต็อกสินค้า
    if (
      order.orderStatus === OrderStatus.CANCELLED &&
      previousStatus !== OrderStatus.CANCELLED
    ) {
      await this.restockOrderItems(order);
    }

    // ✅ ถ้าสถานะเปลี่ยนเป็น PROCESSING, READY_FOR_PICKUP หรือ SHIPPED (จากสถานะอื่น) ให้สร้าง Shipment งานไรเดอร์
    if (
      (order.orderStatus === OrderStatus.PROCESSING ||
        order.orderStatus === OrderStatus.READY_FOR_PICKUP ||
        order.orderStatus === OrderStatus.SHIPPED) &&
      previousStatus !== order.orderStatus
    ) {
      try {
        // สร้าง Shipment (ถ้ายังไม่มี)
        await this.shipmentsService.createShipmentForOrder(order.id);

        // ✅ สร้าง Tracking Log: กำลังค้นหาคนขับ (เมื่อเปลี่ยนเป็น READY_FOR_PICKUP)
        // เพราะนี่คือตอนที่ร้านค้ากด "พร้อมจัดส่ง" จริงๆ
        if (order.orderStatus === OrderStatus.READY_FOR_PICKUP && previousStatus !== OrderStatus.READY_FOR_PICKUP) {
          await this.shipmentsService.addTrackingLogDirect(
            order.id,
            'SEARCHING_COURIER',
            'กำลังค้นหาคนขับ กรุณารอซักครู่',
            'ระบบกำลังค้นหาไรเดอร์สำหรับรับพัสดุ',
          );
        }
      } catch (err) {
        // ไม่ให้ flow ล้ม แต่ log ไว้เพื่อตรวจสอบ
        console.error(
          `Failed to create shipment for order ${order.id}:`,
          err,
        );
      }
    }

    await this.orderRepository.save(order);

    // ✅ เพิ่ม Logic ส่งแจ้งเตือน (เช็ค Settings ก่อน)
    if (order.orderedBy && order.orderedBy.notificationToken) {
      // 1. ดึง Setting ของลูกค้าคนนั้น
      const settings = await this.notificationSettingsService.findMySettings(
        order.orderedBy.id,
      );

      // 2. เช็คว่าเปิดรับ Order Update ไหม?
      if (settings.orderUpdate) {
        let title = 'อัปเดตสถานะคำสั่งซื้อ';
        let body = `ออเดอร์ #${order.id} ของคุณอยู่ในสถานะ: ${status}`;

        if (status === 'SHIPPED') {
          // ✅ ถ้ามีเลขพัสดุ ให้แสดงในข้อความแจ้งเตือน
          if (order.trackingNumber && order.logisticsProvider) {
            body = `ออเดอร์ #${order.id} จัดส่งแล้ว! 🚚\n${order.logisticsProvider}: ${order.trackingNumber}`;
          } else {
            body = `ออเดอร์ #${order.id} จัดส่งแล้ว! 🚚`;
          }
        }
        if (status === 'DELIVERED') {
          body = `ออเดอร์ #${order.id} จัดส่งสำเร็จ ขอบคุณที่ใช้บริการ`;
        }

        // ✅ เรียกใช้ sendAndSave เพื่อบันทึกลง DB และส่ง Push
        this.notificationsService
          .sendAndSave(
            order.orderedBy,
            title,
            body,
            'ORDER',
            { url: `gtxshop://order/${order.id}`, orderId: order.id }, // Deep link
          )
          .catch((err) => console.error('Error sending push notification:', err));
      } else {
        console.log(
          `User ${order.orderedBy.id} turned off order notifications`,
        );
      }
    }

    return this.findOne(id);
  }

  async findAllForAdmin(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: [
        'productOnOrders',
        'productOnOrders.product',
        'productOnOrders.product.images',
        'productOnOrders.variant', // ✅ เพิ่ม relation variant
        'orderedBy', // ดึง user ด้วยเพื่อดูชื่อคนซื้อ
      ],
      order: { createdAt: 'DESC' },
    });
  }

  // ✅ ฟังก์ชันดึงออเดอร์สำหรับ Seller (เฉพาะออเดอร์ของร้านตัวเอง)
  async findAllForSeller(userId: number): Promise<Order[]> {
    // 1. หาร้านค้าของ Seller คนนี้
    const store = await this.storesService.findByOwnerId(userId);
    if (!store) {
      return []; // ถ้าไม่มีร้านค้า ให้คืน array ว่าง
    }

    // 2. ดึงออเดอร์ทั้งหมดที่มีสินค้าของร้านนี้
    const orders = await this.orderRepository.find({
      relations: [
        'productOnOrders',
        'productOnOrders.product',
        'productOnOrders.product.images',
        'productOnOrders.product.store', // ✅ ดึง store เพื่อเช็ค
        'productOnOrders.variant',
        'orderedBy',
      ],
      order: { createdAt: 'DESC' },
    });

    // 3. กรองเฉพาะออเดอร์ที่มีสินค้าของร้านนี้
    const sellerOrders = orders.filter((order) =>
      order.productOnOrders.some(
        (item) => item.product?.store?.id === store.id,
      ),
    );

    return sellerOrders;
  }

  // ✅ ฟังก์ชันดึงสถิติร้านค้า
  async getStoreStats() {
    // 1. กำหนดช่วงเวลา "วันนี้" (ตั้งแต่ 00:00 - 23:59)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 2. นับจำนวนออเดอร์ที่เข้ามา "วันนี้"
    const todayOrdersCount = await this.orderRepository.count({
      where: {
        createdAt: Between(startOfDay, endOfDay),
      },
    });

    // 3. คำนวณ "ยอดขายรวมวันนี้" (Total Revenue)
    // ใช้ createQueryBuilder เพื่อสั่ง SUM เฉพาะยอดเงิน (และไม่นับออเดอร์ที่ยกเลิก)
    const revenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.cartTotal)', 'total') // รวมยอดช่อง cartTotal
      .where('order.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .andWhere('order.orderStatus != :status', {
        status: OrderStatus.CANCELLED,
      }) // ไม่นับที่ยกเลิก
      .getRawOne();

    const todayRevenue = revenueResult.total
      ? parseFloat(revenueResult.total)
      : 0;

    // 4. นับออเดอร์ที่ "รอการจัดส่ง" (Pending/Processing) ทั้งหมด (งานค้าง)
    const pendingOrdersCount = await this.orderRepository.count({
      where: [
        { orderStatus: OrderStatus.PENDING },
        { orderStatus: OrderStatus.PROCESSING },
      ],
    });

    // 5. ส่งค่ากลับไปเป็น Object
    return {
      todayOrders: todayOrdersCount,
      todayRevenue: todayRevenue,
      pendingOrders: pendingOrdersCount,
    };
  }

  // ✅ Platform Stats (ยอดขายรวมทั้งแอพ)
  async getPlatformStats() {
    // 1. ยอดขายรวมทั้งหมด (Lifetime) - ไม่นับออเดอร์ที่ยกเลิก
    const revenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.cartTotal)', 'totalRevenue')
      .where('order.orderStatus != :status', { status: OrderStatus.CANCELLED })
      .getRawOne();

    const totalRevenue = revenueResult.totalRevenue
      ? parseFloat(revenueResult.totalRevenue)
      : 0;

    // 2. จำนวนออเดอร์ทั้งหมด (ไม่นับที่ยกเลิก)
    const cancelledOrders = await this.orderRepository.count({
      where: { orderStatus: OrderStatus.CANCELLED },
    });
    const allOrders = await this.orderRepository.count();
    const totalOrders = allOrders - cancelledOrders;

    // 3. จำนวนออเดอร์ที่สำเร็จ (COMPLETED)
    const completedOrders = await this.orderRepository.count({
      where: { orderStatus: OrderStatus.COMPLETED },
    });

    return {
      totalRevenue,
      totalOrders,
      completedOrders,
    };
  }

  // ✅ สถิติตามเวลา (สำหรับกราฟ)
  async getTimeBasedStats(days: number = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0); // เริ่มต้นวัน

    // 1. ยอดขายรายวัน (ใช้ DATE_FORMAT สำหรับ MySQL)
    const dailyRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('DATE(order.createdAt)', 'date')
      .addSelect('SUM(order.cartTotal)', 'revenue')
      .where('order.createdAt >= :startDate', { startDate })
      .andWhere('order.orderStatus != :status', {
        status: OrderStatus.CANCELLED,
      })
      .groupBy('DATE(order.createdAt)')
      .orderBy('DATE(order.createdAt)', 'ASC')
      .getRawMany();

    // 2. จำนวนออเดอร์รายวัน
    const dailyOrders = await this.orderRepository
      .createQueryBuilder('order')
      .select('DATE(order.createdAt)', 'date')
      .addSelect('COUNT(order.id)', 'count')
      .where('order.createdAt >= :startDate', { startDate })
      .andWhere('order.orderStatus != :status', {
        status: OrderStatus.CANCELLED,
      })
      .groupBy('DATE(order.createdAt)')
      .orderBy('DATE(order.createdAt)', 'ASC')
      .getRawMany();

    // เติมวันที่ที่ไม่มีข้อมูลให้เป็น 0
    const allDates: string[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      allDates.push(date.toISOString().split('T')[0]);
    }

    const revenueMap = new Map(
      dailyRevenue.map((item: any) => [
        item.date?.toISOString()?.split('T')[0] || item.date,
        parseFloat(item.revenue) || 0,
      ]),
    );

    const ordersMap = new Map(
      dailyOrders.map((item: any) => [
        item.date?.toISOString()?.split('T')[0] || item.date,
        parseInt(item.count) || 0,
      ]),
    );

    return {
      dailyRevenue: allDates.map((date) => ({
        date,
        revenue: revenueMap.get(date) || 0,
      })),
      dailyOrders: allDates.map((date) => ({
        date,
        count: ordersMap.get(date) || 0,
      })),
    };
  }

  // ✅ 1. ลูกค้าขอคืนเงิน
  async requestRefund(orderId: number, userId: number, reason: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderedBy', 'productOnOrders'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.orderedById !== userId) {
      throw new ForbiddenException('ไม่ใช่เจ้าของออเดอร์');
    }

    if (order.orderStatus !== OrderStatus.COMPLETED) {
      throw new BadRequestException('ต้องเป็นออเดอร์ที่สำเร็จแล้วจึงจะขอคืนได้');
    }

    if (order.refundStatus !== RefundStatus.NONE) {
      throw new BadRequestException('คำขอนี้ถูกส่งไปแล้ว');
    }

    order.refundStatus = RefundStatus.REQUESTED;
    order.refundReason = reason;

    return this.orderRepository.save(order);
  }

  // ✅ ลูกค้ายืนยันรับสินค้า (ปิดออเดอร์ + ให้แต้มสะสม)
  async completeOrder(orderId: number, userId: number): Promise<any> {
    // ใช้ findOne() ที่มี Lazy Check paymentExpiredAt อยู่แล้ว
    const order = await this.findOne(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // ✅ ตรวจสอบว่าเป็นเจ้าของออเดอร์หรือ courier ที่รับงานส่งของออเดอร์นี้
    const isOrderOwner = order.orderedById === userId || order.orderedBy?.id === userId;

    // ✅ ตรวจสอบว่าเป็น courier ที่รับงานส่งของออเดอร์นี้หรือไม่
    const shipment = await this.shipmentRepository.findOne({
      where: { orderId, courierId: userId },
    });
    const isCourier = !!shipment;

    if (!isOrderOwner && !isCourier) {
      throw new ForbiddenException('ไม่ใช่เจ้าของออเดอร์หรือไรเดอร์ที่รับงานส่งของ');
    }

    // ต้องอยู่ในสถานะ DELIVERED เท่านั้น ถึงจะกดยืนยันรับได้
    if (order.orderStatus !== OrderStatus.DELIVERED) {
      throw new BadRequestException('สถานะออเดอร์ไม่ถูกต้อง กรุณารอให้ไรเดอร์จัดส่งสำเร็จก่อน');
    }

    // สำหรับระบบนี้ เราถือว่า COMPLETED คือออเดอร์ที่ปิดงานแล้ว
    order.orderStatus = OrderStatus.COMPLETED;
    order.receivedAt = new Date();

    await this.orderRepository.save(order);

    // ✅ คำนวณแต้มสะสมจากยอดคำสั่งซื้อ (เช่น 10 บาท = 1 แต้ม)
    // ✅ แต้มสะสมต้องให้กับลูกค้า (orderedById) ไม่ใช่ courier
    const total = Number((order as any).cartTotal || 0);
    const pointsEarned = total > 0 ? Math.floor(total / 10) : 0;

    if (pointsEarned > 0) {
      // บวกแต้มให้ลูกค้า (orderedById) ไม่ใช่ courier
      await this.userRepository.increment({ id: order.orderedById }, 'points', pointsEarned);
    }

    return {
      ...(await this.findOne(orderId)), // ส่งออเดอร์เวอร์ชันล่าสุดกลับไป
      pointsEarned,
    };
  }

  /**
   * ✅ 3. ซื้ออีกครั้ง (Buy Again)
   * หลักการ: ดึงรายการสินค้าในออเดอร์เก่าที่เป็นของ user คนนี้
   * แล้วส่ง list { productId, variantId, count } กลับไปให้ Frontend
   * เพื่อเอาไปยิง API เพิ่มลงตะกร้าเอง (หลีกเลี่ยงการผูก CartService ข้ามโมดูล)
   */
  async buyAgain(orderId: number, userId: number): Promise<{
    orderId: number;
    items: { productId: number; variantId: number | null; count: number }[];
  }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, orderedById: userId },
      relations: ['productOnOrders', 'productOnOrders.product', 'productOnOrders.variant'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // ไม่อนุญาตให้ซื้อซ้ำจากออเดอร์ที่ถูกยกเลิก
    if (order.orderStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException('ไม่สามารถซื้อซ้ำจากออเดอร์ที่ถูกยกเลิกได้');
    }

    const items = order.productOnOrders.map((item) => ({
      productId: item.productId || item.product?.id,
      variantId: item.variantId || null,
      count: item.count,
    }));

    return {
      orderId: order.id,
      items,
    };
  }

  // ✅ 2. ร้านค้าตัดสินใจ (Approve/Reject)
  async decideRefund(
    orderId: number,
    decision: 'APPROVED' | 'REJECTED',
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: [
          'productOnOrders',
          'productOnOrders.product',
          'productOnOrders.variant', // ✅ ดึง variant ด้วย
        ],
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.refundStatus !== RefundStatus.REQUESTED) {
        throw new BadRequestException('ออเดอร์นี้ไม่ได้มีการขอคืนเงิน');
      }

      order.refundStatus =
        decision === 'APPROVED' ? RefundStatus.APPROVED : RefundStatus.REJECTED;
      await queryRunner.manager.save(order);

      // 🔄 ถ้าอนุมัติ -> คืนสต็อกสินค้า (Restock Logic)
      if (decision === 'APPROVED') {
        for (const item of order.productOnOrders) {
          // ✅ กรณีที่ 1: มี Variant -> คืนสต็อก Variant
          if (item.variantId && item.variant) {
            // ล็อคแถว Variant
            const variant = await queryRunner.manager.findOne(ProductVariant, {
              where: { id: item.variantId },
              lock: { mode: 'pessimistic_write' },
            });

            if (variant) {
              // บวกสต็อก Variant กลับ
              variant.stock += item.count;
              await queryRunner.manager.save(variant);
              console.log(
                `✅ Restocked variant ${variant.id}: +${item.count} (now: ${variant.stock})`,
              );
            }
          }
          // ✅ กรณีที่ 2: ไม่มี Variant -> คืนสต็อก Product
          else {
            // ล็อคแถว Product
            const product = await queryRunner.manager.findOne(Product, {
              where: { id: item.productId },
              lock: { mode: 'pessimistic_write' },
            });

            if (product) {
              // บวกสต็อก Product กลับ
              product.quantity += item.count;
              await queryRunner.manager.save(product);
              console.log(
                `✅ Restocked product ${product.id}: +${item.count} (now: ${product.quantity})`,
              );
            }
          }

          // ลดยอดขายของ Product เสมอ (ไม่ว่าจะมี variant หรือไม่)
          await queryRunner.manager.decrement(
            Product,
            { id: item.productId },
            'sold',
            item.count,
          );
          console.log(
            `✅ Decremented sold for product ${item.productId}: -${item.count}`,
          );
        }

        // TODO: เรียก Stripe Refund API ตรงนี้เพื่อคืนเงินเข้าบัตร
        console.log(
          `💰 TODO: Process Stripe refund for order ${orderId}, amount: ${order.cartTotal}`,
        );
      }

      await queryRunner.commitTransaction();
      return this.findOne(orderId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ✅ User อัปโหลดสลิปการโอนเงิน
  async updateSlip(orderId: number, userId: number, imageUrl: string): Promise<Order> {
    const order = await this.findOne(orderId);

    // ตรวจสอบว่าเป็นเจ้าของออเดอร์
    if (order.orderedById !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขออเดอร์นี้');
    }

    // ตรวจสอบว่าออเดอร์อยู่ในสถานะที่สามารถอัปโหลดสลิปได้
    if (order.orderStatus !== OrderStatus.PENDING) {
      throw new BadRequestException('ออเดอร์นี้ไม่สามารถอัปโหลดสลิปได้');
    }

    order.paymentSlipUrl = imageUrl;
    order.orderStatus = OrderStatus.VERIFYING; // เปลี่ยนสถานะเป็น รอตรวจสอบ

    const savedOrder = await this.orderRepository.save(order);

    // ✅ เพิ่ม Tracking Log: ชำระเงินเรียบร้อย
    try {
      await this.shipmentsService.addTrackingLogDirect(
        orderId,
        'PAYMENT_UPLOADED',
        'ชำระเงินเรียบร้อย',
        'รอร้านค้ายืนยันรับออเดอร์',
      );
    } catch (err) {
      console.error(`Failed to add tracking log for order ${orderId}:`, err);
    }

    return savedOrder;
  }

  // ✅ Admin ยืนยันยอดเงิน
  async confirmPayment(orderId: number): Promise<Order> {
    const order = await this.findOne(orderId);

    // ตรวจสอบว่าออเดอร์อยู่ในสถานะ VERIFYING
    if (order.orderStatus !== OrderStatus.VERIFYING) {
      throw new BadRequestException('ออเดอร์นี้ไม่ได้อยู่ในสถานะรอตรวจสอบ');
    }

    const previousStatus = order.orderStatus;
    // ✅ เปลี่ยนเป็น PENDING_CONFIRMATION (รอร้านยอมรับออเดอร์)
    // ร้านค้าต้องกด "ยอมรับออเดอร์" เพื่อเปลี่ยนเป็น PROCESSING
    order.orderStatus = OrderStatus.PENDING_CONFIRMATION;

    // ✅ เพิ่ม Tracking Log: ร้านค้ายืนยันรับออเดอร์แล้ว
    try {
      await this.shipmentsService.addTrackingLogDirect(
        orderId,
        'PAYMENT_VERIFIED',
        'ร้านค้ายืนยันรับออเดอร์แล้ว',
        'รอร้านค้าเตรียมสินค้า',
      );
    } catch (err) {
      console.error(`Failed to add tracking log for order ${orderId}:`, err);
    }

    // ❌ ไม่ต้องสร้าง Shipment ตอนนี้ เพราะยังไม่ถึงขั้นตอนจัดส่ง
    // Shipment จะถูกสร้างเมื่อร้านกด "ยอมรับออเดอร์" และเปลี่ยนเป็น PROCESSING

    // ส่งการแจ้งเตือนให้ผู้ใช้
    if (order.orderedBy && order.orderedBy.notificationToken) {
      const settings = await this.notificationSettingsService.findMySettings(
        order.orderedBy.id,
      );

      if (settings.orderUpdate) {
        this.notificationsService
          .sendAndSave(
            order.orderedBy,
            'ชำระเงินสำเร็จ',
            `ออเดอร์ #${order.id} ของคุณได้รับการยืนยันการชำระเงินแล้ว ร้านค้ากำลังเตรียมจัดส่ง`,
            'ORDER',
            { url: `gtxshop://order/${order.id}`, orderId: order.id },
          )
          .catch((err) => console.error('Error sending push notification:', err));
      }
    }

    return this.orderRepository.save(order);
  }
}

