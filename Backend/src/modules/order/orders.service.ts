import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm'; // ✅ เพิ่ม DataSource
import { MailerService } from '@nestjs-modules/mailer';
import {
  Order,
  OrderStatus,
  RefundStatus,
  ProductOnOrder,
  Cart,
  ProductOnCart,
  Coupon,
  User,
  Product,
  ProductVariant,
  Shipment,
  FlashSaleItem,
  FlashSale,
  WalletTransactionType,
} from '@core/database/entities';
import { NotificationsService } from '@modules/notification/notifications.service';
import { CouponsService } from '@modules/coupon/coupons.service';
import { NotificationSettingsService } from '@modules/notification-setting/notification-settings.service';
import { StoresService } from '@modules/store/stores.service';
import { ShipmentsService } from '@modules/shipment/shipments.service';
import { FlashSaleService } from '@modules/flash-sale/flash-sale.service';
import { AdminLogsService } from '@modules/admin/admin-logs.service';
import { WalletService } from '@modules/wallet/wallet.service';
import { StoreWalletService } from '@modules/store-wallet/store-wallet.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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
    private readonly flashSaleService: FlashSaleService, // ✅ เพิ่ม FlashSaleService
    private readonly adminLogsService: AdminLogsService, // ✅ เพิ่ม AdminLogsService
    private readonly walletService: WalletService, // ✅ เพิ่ม WalletService สำหรับคืนเงินเข้า Wallet
    private readonly storeWalletService: StoreWalletService, // ✅ เพิ่ม StoreWalletService สำหรับเครดิตรายได้ให้ร้านค้า
    private dataSource: DataSource, // ✅ Inject DataSource เพื่อใช้ Transaction
  ) {}

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
    this.logger.log(`Creating order for user ${userId}`, 'createOrder');
    
    // ✅ 1. ใช้ Transaction เพื่อให้การทำงานทั้งหมดเป็น Atomic
    return await this.dataSource.transaction(async (manager) => {
      try {
      // ✅ 2. ดึงข้อมูลตะกร้าของผู้ใช้ (Cart) เพื่อดูว่าจะซื้ออะไร
      // ✅ เพิ่ม relation variant เพื่อดึง variantId
      const cart = await manager.findOne(Cart, {
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

      // ✅ 3. Sort cart items by ID เพื่อป้องกัน Deadlock (optional but recommended)
      const sortedCartItems = [...cart.productOnCarts].sort((a, b) => a.id - b.id);

      // ✅ 4. วนลูปสินค้าในตะกร้าทีละชิ้น (Critical Section 🔴)
      for (const cartItem of sortedCartItems) {
        let priceToUse: number;
        let productName: string;

        // ---------------------------------------------------------
        // ✅ กรณีที่ 1: สินค้ามีตัวเลือก (มี variantId ในตะกร้า)
        // ---------------------------------------------------------
        if (cartItem.variantId) {
          // 🔒 Lock แถว Variant เพื่อป้องกัน concurrent access
          const variant = await manager.findOne(ProductVariant, {
            where: { id: cartItem.variantId },
            lock: { mode: 'pessimistic_write' },
          });

          if (!variant) {
            throw new NotFoundException(
              `ไม่พบตัวเลือกสินค้า ID ${cartItem.variantId}`,
            );
          }

          // ✅ Check Stock: เช็คสต็อกตัวเลือก
          if (variant.stock < cartItem.count) {
            throw new BadRequestException(
              `ตัวเลือก "${variant.name}" หมดแล้ว (เหลือ ${variant.stock} ชิ้น, ต้องการ ${cartItem.count} ชิ้น)`,
            );
          }

          // ✅ Deduct Stock: ตัดสต็อกทันที (Reserve Stock on Creation)
          variant.stock -= cartItem.count;
          await manager.save(variant);
          this.logger.log(
            `✅ Reserved variant #${variant.id}: -${cartItem.count} units (now: ${variant.stock})`,
          );

          // ใช้ราคาของตัวเลือก (ถ้ามี) หรือราคาจาก Cart หรือ Product
          priceToUse =
            variant.price ||
            cartItem.price ||
            (await manager.findOne(Product, {
              where: { id: cartItem.productId },
            }))?.price ||
            0;

          // ดึงชื่อสินค้า
          const product = await manager.findOne(Product, {
            where: { id: cartItem.productId },
          });
          productName = product?.title || 'Unknown Product';
          productName += ` (${variant.name})`; // ต่อชื่อรุ่นเข้าไป (Optional)
        }
        // ---------------------------------------------------------
        // ✅ กรณีที่ 2: สินค้าไม่มีตัวเลือก (ตัดสต็อกแม่)
        // ---------------------------------------------------------
        else {
          // 🔒 Lock แถว Product เพื่อป้องกัน concurrent access
          const product = await manager.findOne(Product, {
            where: { id: cartItem.productId },
            lock: { mode: 'pessimistic_write' },
          });

          if (!product) {
            throw new NotFoundException(
              `ไม่พบสินค้า ID ${cartItem.productId}`,
            );
          }

          // ✅ ตรวจสอบ Flash Sale ก่อนตัดสต็อก
          let flashSalePrice: number | null = null;
          let flashSaleItem: FlashSaleItem | null = null;
          
          try {
            // หา FlashSaleItem ที่ Active และสินค้านี้อยู่ใน Flash Sale
            const flashSalePriceResult = await this.flashSaleService.getFlashSalePrice(product.id);
            if (flashSalePriceResult !== null) {
              // 🔒 Lock FlashSaleItem เพื่อป้องกัน concurrent access
              const now = new Date();
              flashSaleItem = await manager
                .createQueryBuilder(FlashSaleItem, 'fsi')
                .innerJoin('fsi.flashSale', 'fs')
                .where('fsi.productId = :productId', { productId: product.id })
                .andWhere('fs.isActive = :isActive', { isActive: true })
                .andWhere('fs.startTime <= :now', { now })
                .andWhere('fs.endTime >= :now', { now })
                .setLock('pessimistic_write') // 🔒 Lock FlashSaleItem
                .getOne();

              if (flashSaleItem) {
                const flashSale = flashSaleItem.flashSale;
                
                // ตรวจสอบเวลาและสต็อก Flash Sale
                if (
                  flashSale.isActive &&
                  now >= flashSale.startTime &&
                  now <= flashSale.endTime &&
                  flashSaleItem.sold < flashSaleItem.limitStock
                ) {
                  flashSalePrice = flashSalePriceResult;
                  
                  // ✅ Check Stock: ตรวจสอบสต็อก Flash Sale
                  if (flashSaleItem.sold + cartItem.count > flashSaleItem.limitStock) {
                    throw new BadRequestException(
                      `สินค้า "${product.title}" ใน Flash Sale หมดแล้ว (เหลือ ${flashSaleItem.limitStock - flashSaleItem.sold} ชิ้น, ต้องการ ${cartItem.count} ชิ้น)`,
                    );
                  }

                  // ✅ Deduct Stock: ตัดสต็อก Flash Sale ทันที (Reserve Stock on Creation)
                  flashSaleItem.sold += cartItem.count;
                  await manager.save(flashSaleItem);
                  this.logger.log(
                    `✅ Reserved Flash Sale item #${flashSaleItem.id} (product #${product.id}): +${cartItem.count} sold (now: ${flashSaleItem.sold}/${flashSaleItem.limitStock})`,
                  );

                  // ใช้ราคา Flash Sale
                  priceToUse = flashSalePrice;
                }
              }
            }
          } catch (error) {
            // ถ้า Flash Sale มีปัญหา ให้ใช้ราคาปกติ
            if (error instanceof BadRequestException) {
              throw error; // Re-throw BadRequestException
            }
            console.warn('Flash Sale check failed, using regular price:', error);
          }

          // ถ้าไม่ใช่ Flash Sale ให้ใช้ราคาปกติ
          if (flashSalePrice === null) {
            // ✅ Check Stock: เช็คสต็อกสินค้าปกติ
            if (product.quantity < cartItem.count) {
              throw new BadRequestException(
                `สินค้า "${product.title}" มีไม่พอ (เหลือ ${product.quantity} ชิ้น, ต้องการ ${cartItem.count} ชิ้น)`,
              );
            }

            // ✅ Deduct Stock: ตัดสต็อกสินค้าปกติทันที (Reserve Stock on Creation)
            product.quantity -= cartItem.count;
            await manager.save(product);
            this.logger.log(
              `✅ Reserved product #${product.id}: -${cartItem.count} units (now: ${product.quantity})`,
            );

            priceToUse = cartItem.price || product.price;
          }

          // ✅ Increment Sold Count: เพิ่มยอดขายรวมของตัวแม่ (Sold Count)
          await manager.increment(
            Product,
            { id: cartItem.productId },
            'sold',
            cartItem.count,
          );
          this.logger.log(`✅ Incremented sold for product #${cartItem.productId}: +${cartItem.count}`);

          productName = product.title || 'Unknown Product';
        }

        // ✅ 5. สร้างรายการสินค้าในออเดอร์ (Snapshot ราคา ณ ตอนซื้อ)
        const orderItem = new ProductOnOrder();
        orderItem.product = await manager.findOne(Product, {
          where: { id: cartItem.productId },
        });
        orderItem.variantId = cartItem.variantId || null; // ✅ บันทึก variantId
        orderItem.count = cartItem.count;
        orderItem.price = Number(priceToUse);

        orderItemsEntities.push(orderItem);
        calculatedTotal += Number(priceToUse) * cartItem.count;
      }

      // ✅ 6. คำนวณยอดรวมสุดท้าย (รวมค่าส่ง/ส่วนลด ถ้ามี)
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
          const coupon = await manager.findOne(Coupon, {
            where: { id: couponId },
          });
          if (coupon) {
            coupon.isUsed = true;
            coupon.usedAt = new Date();
            await manager.save(coupon);
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

      // ✅ 7. สร้าง Order Object
      const order = new Order();
      order.orderedBy = { id: userId } as User;
      order.cartTotal = finalTotal;
      order.shippingAddress = shippingAddress;
      order.shippingPhone = shippingPhone;
      // ✅ กำหนดสถานะเริ่มต้นตามวิธีชำระเงิน
      // - COD, STRIPE: ลูกค้าชำระแล้ว / ยืนยันจ่ายปลายทางแน่นอน → รอร้านค้ายืนยันออเดอร์ (PENDING_CONFIRMATION)
      //   ร้านค้าต้องกด "ยอมรับออเดอร์" ก่อน จึงจะเข้าสู่ขั้นตอนเตรียมสินค้า (PROCESSING)
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

      // ✅ ตั้งเวลาหมดอายุการยืนยันรับออเดอร์ (24 ชั่วโมง) - เมื่อ status เป็น PENDING_CONFIRMATION
      if (order.orderStatus === OrderStatus.PENDING_CONFIRMATION) {
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 24);
        order.confirmationDeadline = deadline;
      }

      // ✅ 8. บันทึกออเดอร์
      const savedOrder = await manager.save(order);

      // ✅ 9. ลบสินค้าออกจากตะกร้า (เพราะซื้อไปแล้ว)
      await manager.delete(ProductOnCart, { cartId: cart.id });

      // (Optional) รีเซ็ตยอดรวมตะกร้า
      cart.cartTotal = 0;
      await manager.save(cart);

      // ✅ Transaction จะ commit อัตโนมัติเมื่อ function return
      
      // ✅ Return order ที่สร้างเสร็จแล้ว (พร้อม relations)
      return savedOrder;
      } catch (err) {
        // ❌ 12. ถ้ามี Error (เช่น ของหมด, Database พัง) ให้ย้อนกลับทุกอย่าง!
        // Transaction จะ rollback อัตโนมัติเมื่อ throw error
        this.logger.error(`Order creation failed for user ${userId}: ${err.message}`, err.stack, 'createOrder');
        throw err; // โยน Error กลับไปให้ Frontend รู้ (Transaction จะ rollback อัตโนมัติ)
      }
    }).then(async (savedOrder) => {
      // ✅ ดำเนินการนอก Transaction (หลัง commit สำเร็จ)
      
      // ✅ ดึงข้อมูล User อีกครั้ง (นอก Transaction)
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      
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

      this.logger.log(`Order ${orderWithItems.id} created successfully for user ${userId}`, 'createOrder');
      return orderWithItems;
    });
  }

  async findAll(userId: number): Promise<Order[]> {
    try {
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
      // ✅ Wrap ใน try-catch เพื่อป้องกัน error จาก order หนึ่งตัวทำให้ทั้ง request fail
      const checkedOrders = await Promise.all(
        orders.map(async (order) => {
          try {
            return await this.checkAndCancelExpired(order);
          } catch (error) {
            // Log error แต่ยัง return order เดิมเพื่อไม่ให้ request fail
            console.error(`Error checking/cancelling expired order ${order.id}:`, error);
            return order;
          }
        })
      );

      return checkedOrders;
    } catch (error) {
      // Log the full error for debugging
      console.error('❌ Error in findAll orders:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        userId,
      });
      // Return empty array instead of throwing to prevent 500 error
      // This allows the frontend to continue working even if there's a database issue
      return [];
    }
  }

  // ✅ ฟังก์ชันช่วยเช็คและยกเลิกออเดอร์ที่หมดเวลาชำระเงินอัตโนมัติ (Lazy Check)
  private async checkAndCancelExpired(order: Order): Promise<Order> {
    try {
      if (order.orderStatus === OrderStatus.PENDING && order.paymentExpiredAt) {
        const now = new Date();
        const expireTime = new Date(order.paymentExpiredAt);

        // ✅ เช็คว่า expireTime เป็น valid date
        if (isNaN(expireTime.getTime())) {
          console.warn(`⚠️ Order #${order.id} has invalid paymentExpiredAt: ${order.paymentExpiredAt}`);
          return order;
        }

        if (now > expireTime) {
          // หมดเวลาแล้ว! ยกเลิกออเดอร์อัตโนมัติ
          console.log(`⏰ Order #${order.id} expired, auto-cancelling...`);
          order.orderStatus = OrderStatus.CANCELLED;
          // ✅ คืนสต็อกสินค้าทุกชิ้นในออเดอร์ (เพราะลูกค้าไม่ได้จ่ายทันเวลา)
          await this.restockOrderItems(order);
          await this.orderRepository.save(order);
        }
      }
    } catch (error) {
      // Log error แต่ไม่ throw เพื่อไม่ให้ request fail
      console.error(`Error in checkAndCancelExpired for order ${order.id}:`, error);
    }
    return order;
  }

  // ✅ ฟังก์ชันคืนสต็อกสินค้าเมื่อออเดอร์ถูกยกเลิก
  // รองรับทั้งการส่ง `orderId` (สำหรับ Task/Cron) และส่ง `Order` (ภายใน service)
  async restockOrderItems(orderOrId: number | Order): Promise<void> {
    const order =
      typeof orderOrId === 'number'
        ? await this.orderRepository.findOne({
            where: { id: orderOrId },
            relations: [
              'productOnOrders',
              'productOnOrders.product',
              'productOnOrders.variant',
            ],
          })
        : orderOrId;

    if (!order) {
      this.logger.warn(
        `[restockOrderItems] Order not found (id: ${orderOrId})`,
      );
      return;
    }

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

  async findOne(id: number, additionalRelations?: string[]): Promise<Order> {
    const defaultRelations = [
      'productOnOrders',
      'productOnOrders.product',
      'productOnOrders.product.images',
      'productOnOrders.variant', // ✅ เพิ่ม variant สำหรับ invoice
      'orderedBy', // ✅ เพิ่ม orderedBy สำหรับ invoice
      'coupon',
    ];
    
    const relations = additionalRelations 
      ? [...new Set([...defaultRelations, ...additionalRelations])] // รวม relations และลบ duplicates
      : defaultRelations;
    
    const order = await this.orderRepository.findOne({
      where: { id },
      relations,
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
      // คืนสต็อก
      await this.restockOrderItems(order);

      // ถ้าก่อนหน้าถือว่า "จ่ายแล้ว" ให้คืนเงินเข้า Wallet ตามช่องทาง
      await this.processRefund(
        { ...order, orderStatus: previousStatus } as Order,
      );
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

  // ✅ Analytics: Top Selling Products
  async getTopProducts(limit: number = 10, days?: number) {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.store', 'store')
      .where('product.isActive = :active', { active: true });

    // Filter by date range if provided
    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      queryBuilder
        .innerJoin('product.productOnOrders', 'productOnOrder')
        .innerJoin('productOnOrder.order', 'order')
        .andWhere('order.createdAt >= :startDate', { startDate })
        .andWhere('order.orderStatus != :status', { status: OrderStatus.CANCELLED });
    }

    return queryBuilder
      .orderBy('product.sold', 'DESC')
      .take(limit)
      .getMany();
  }

  // ✅ Analytics: Sales by Category
  async getSalesByCategory(days?: number) {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.productOnOrders', 'productOnOrder')
      .innerJoin('productOnOrder.product', 'product')
      .innerJoin('product.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('SUM(productOnOrder.price * productOnOrder.count)', 'totalRevenue')
      .addSelect('COUNT(DISTINCT order.id)', 'orderCount')
      .where('order.orderStatus != :status', { status: OrderStatus.CANCELLED })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('totalRevenue', 'DESC');

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    }

    return queryBuilder.getRawMany();
  }

  // ✅ Analytics: Revenue by Period (Daily/Weekly/Monthly)
  async getRevenueByPeriod(period: 'daily' | 'weekly' | 'monthly' = 'daily', days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    let dateFormat: string;
    let groupBy: string;

    switch (period) {
      case 'weekly':
        dateFormat = "DATE_FORMAT(order.createdAt, '%Y-%u')"; // Year-Week
        groupBy = "DATE_FORMAT(order.createdAt, '%Y-%u')";
        break;
      case 'monthly':
        dateFormat = "DATE_FORMAT(order.createdAt, '%Y-%m')"; // Year-Month
        groupBy = "DATE_FORMAT(order.createdAt, '%Y-%m')";
        break;
      default: // daily
        dateFormat = "DATE(order.createdAt)";
        groupBy = "DATE(order.createdAt)";
    }

    return this.orderRepository
      .createQueryBuilder('order')
      .select(dateFormat, 'period')
      .addSelect('SUM(order.cartTotal)', 'revenue')
      .addSelect('COUNT(order.id)', 'orderCount')
      .where('order.createdAt >= :startDate', { startDate })
      .andWhere('order.orderStatus != :status', { status: OrderStatus.CANCELLED })
      .groupBy(groupBy)
      .orderBy('period', 'ASC')
      .getRawMany();
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

  /**
   * ✅ Smart Cancel Order
   * - PENDING / VERIFYING / PENDING_CONFIRMATION → ยกเลิกทันที + restock + auto-refund (wallet สำหรับ PromptPay/QR)
   * - PROCESSING / READY_FOR_PICKUP              → CANCELLATION_REQUESTED (ให้ร้านค้าอนุมัติทีหลัง)
   * - SHIPPED / DELIVERED / COMPLETED           → ไม่อนุญาตให้ยกเลิก (ให้ใช้ขั้นตอนขอคืนสินค้าแทน)
   */
  async cancelOrder(
    orderId: number,
    userId: number,
    reason?: string,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: [
        'productOnOrders',
        'productOnOrders.product',
        'productOnOrders.variant',
        'orderedBy',
      ],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.orderedById !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ยกเลิกคำสั่งซื้อนี้');
    }

    const previousStatus = order.orderStatus;

    const instantStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.VERIFYING,
      OrderStatus.PENDING_CONFIRMATION,
    ];

    const requestStatuses: OrderStatus[] = [
      OrderStatus.PROCESSING,
      OrderStatus.READY_FOR_PICKUP,
    ];

    // ❌ เคสที่เลยจุดยกเลิกแล้ว
    if (
      order.orderStatus === OrderStatus.SHIPPED ||
      order.orderStatus === OrderStatus.OUT_FOR_DELIVERY ||
      order.orderStatus === OrderStatus.DELIVERED ||
      order.orderStatus === OrderStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'ไม่สามารถยกเลิกคำสั่งซื้อได้ กรุณาใช้ขั้นตอนขอคืนสินค้าแทน',
      );
    }

    // ✅ เคส A: ยกเลิกทันที (ก่อนร้านดำเนินการ)
    if (instantStatuses.includes(order.orderStatus)) {
      order.orderStatus = OrderStatus.CANCELLED;
      if (reason) {
        order.refundReason = reason;
      }

      // คืนสต็อก
      await this.restockOrderItems(order);

      // คืนเงินเข้า Wallet (ถ้าเข้าเงื่อนไขการจ่ายเงิน + ช่องทางรองรับ)
      await this.processRefund(
        { ...order, orderStatus: previousStatus } as Order,
      );

      const saved = await this.orderRepository.save(order);
      return this.findOne(saved.id);
    }

    // ✅ เคส B: ขออนุมัติยกเลิก (ร้านรับออเดอร์ไปแล้ว)
    if (requestStatuses.includes(order.orderStatus)) {
      order.orderStatus = OrderStatus.CANCELLATION_REQUESTED;
      if (reason) {
        order.refundReason = reason;
      }
      const saved = await this.orderRepository.save(order);
      return this.findOne(saved.id);
    }

    // เคสอื่น เช่น ถูกยกเลิกไปแล้ว
    throw new BadRequestException('ไม่สามารถยกเลิกคำสั่งซื้อนี้ได้');
  }

  // ✅ ลูกค้ายืนยันรับสินค้า (ปิดออเดอร์ + ให้แต้มสะสม)
  async completeOrder(orderId: number, userId: number): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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

      // ✅ คำนวณแต้มสะสมจากยอดคำสั่งซื้อ (เช่น 10 บาท = 1 แต้ม)
      const total = Number((order as any).cartTotal || 0);
      const pointsEarned = total > 0 ? Math.floor(total / 10) : 0;

      // สำหรับระบบนี้ เราถือว่า COMPLETED คือออเดอร์ที่ปิดงานแล้ว
      // ✅ Update order status และ receivedAt ใน transaction
      await queryRunner.manager.update(Order, { id: orderId }, {
        orderStatus: OrderStatus.COMPLETED,
        receivedAt: new Date(),
      });

      // ✅ บวกแต้มให้ลูกค้า (orderedById) ไม่ใช่ courier (ใน transaction)
      if (pointsEarned > 0) {
        await queryRunner.manager.increment(
          User,
          { id: order.orderedById },
          'points',
          pointsEarned,
        );
      }

      await queryRunner.commitTransaction();
      
      this.logger.log(`Order ${orderId} completed. Points earned: ${pointsEarned}`, 'completeOrder');

      // ✅ เครดิตรายได้ให้ร้านค้า (นอก transaction เพราะเป็น separate atomic operation)
      // ดำเนินการหลัง commit เพื่อไม่ให้ error จาก wallet ทำให้ order completion fail
      await this.creditStoreRevenue(order);

      return {
        ...(await this.findOne(orderId)), // ส่งออเดอร์เวอร์ชันล่าสุดกลับไป
        pointsEarned,
      };
    } catch (error) {
      this.logger.error(`Failed to complete order ${orderId}: ${error.message}`, error.stack, 'completeOrder');
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * ✅ เครดิตรายได้จากการขายเข้ากระเป๋าร้านค้า
   * คำนวณรายได้ตาม storeId ของแต่ละ product ใน order
   * รองรับกรณี Multi-vendor (1 order มีสินค้าจากหลายร้าน)
   */
  private async creditStoreRevenue(order: Order): Promise<void> {
    try {
      if (!order.productOnOrders || order.productOnOrders.length === 0) {
        this.logger.warn(`[creditStoreRevenue] Order #${order.id} has no items, skipping store revenue credit`);
        return;
      }

      // Group products by storeId and calculate revenue per store
      const revenueByStore = new Map<number, number>();

      for (const item of order.productOnOrders) {
        const storeId = item.product?.storeId;
        if (!storeId) {
          this.logger.warn(
            `[creditStoreRevenue] Order #${order.id}, Item #${item.id}: Product has no storeId, skipping`,
          );
          continue;
        }

        // คำนวณรายได้ = ราคา × จำนวน
        const itemRevenue = Number(item.price || 0) * item.count;
        const currentTotal = revenueByStore.get(storeId) || 0;
        revenueByStore.set(storeId, currentTotal + itemRevenue);
      }

      // เครดิตรายได้ให้แต่ละร้านค้า
      for (const [storeId, revenue] of revenueByStore) {
        if (revenue <= 0) {
          this.logger.warn(
            `[creditStoreRevenue] Order #${order.id}, Store #${storeId}: Revenue is ${revenue}, skipping`,
          );
          continue;
        }

        try {
          await this.storeWalletService.addRevenue(
            storeId,
            revenue,
            `ORDER-${order.id}`,
          );

          this.logger.log(
            `💰 [creditStoreRevenue] Credited ${revenue.toFixed(2)} THB to Store #${storeId} for Order #${order.id}`,
          );
        } catch (walletError) {
          // ❌ Log error แต่ไม่ throw เพื่อไม่ให้กระทบ order completion
          // ต้อง alert admin เพื่อ manual fix
          this.logger.error(
            `❌ [creditStoreRevenue] CRITICAL: Failed to credit ${revenue.toFixed(2)} THB to Store #${storeId} for Order #${order.id}:`,
            walletError,
          );
          // TODO: ส่ง alert ให้ admin หรือบันทึกลง error queue เพื่อ retry ภายหลัง
        }
      }
    } catch (error) {
      // ❌ Log error แต่ไม่ throw เพื่อไม่ให้กระทบ order completion
      this.logger.error(
        `❌ [creditStoreRevenue] Unexpected error processing store revenue for Order #${order.id}:`,
        error,
      );
    }
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

  // ✅ User อัปโหลดสลิปการโอนเงิน (Legacy method - ควรใช้ updateSlipWithVerification หรือ updateSlipWithoutVerification แทน)
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

    // ✅ Security: ตรวจสอบว่า imageUrl ไม่ใช่ empty string
    if (!imageUrl || imageUrl.trim() === '') {
      throw new BadRequestException('URL สลิปไม่ถูกต้อง');
    }
    order.paymentSlipUrl = imageUrl.trim(); // ใช้ trimmed value
    order.orderStatus = OrderStatus.VERIFYING; // เปลี่ยนสถานะเป็น รอตรวจสอบ

    try {
      // ✅ บันทึกข้อมูล - Database Unique Constraint จะป้องกันการบันทึกสลิปซ้ำแบบถาวร
      return await this.orderRepository.save(order);
    } catch (error: any) {
      // ✅ Handle duplicate key errors จาก database unique constraints (Permanent Unique)
      // Error Code: ER_DUP_ENTRY (1062) = Duplicate entry for unique key
      if (error.code === 'ER_DUP_ENTRY' || error.code === 1062) {
        // ✅ Log warning สำหรับ Audit Trail
        this.logger.warn(
          `[updateSlip] Duplicate slip attempt detected - Order #${orderId}, User #${userId}, URL: ${imageUrl.substring(0, 50)}...`,
        );

        // ✅ ตรวจสอบว่า error เกิดจาก paymentSlipUrl หรือ slipReference
        const errorMessage = error.message || '';
        if (
          errorMessage.includes('paymentSlipUrl') ||
          errorMessage.includes('idx_order_payment_slip_url_permanent')
        ) {
          throw new BadRequestException(
            'สลิปนี้ถูกใช้งานไปแล้วในออเดอร์อื่น (ไม่สามารถใช้ซ้ำได้ตามนโยบายความปลอดภัย)',
          );
        } else if (
          errorMessage.includes('slipReference') ||
          errorMessage.includes('idx_order_slip_reference_permanent')
        ) {
          throw new BadRequestException(
            'Reference ของสลิปนี้ถูกใช้งานไปแล้วในออเดอร์อื่น (ไม่สามารถใช้ซ้ำได้ตามนโยบายความปลอดภัย)',
          );
        } else {
          // Generic duplicate error
          throw new BadRequestException(
            'สลิปนี้ถูกใช้งานไปแล้วในออเดอร์อื่น (ไม่สามารถใช้ซ้ำได้ตามนโยบายความปลอดภัย)',
          );
        }
      }
      // Re-throw other errors
      this.logger.error(
        `[updateSlip] Unexpected error saving order #${orderId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * ✅ ตัดสต็อกจริงเมื่อชำระเงินสำเร็จ (Optimistic Inventory)
   * เรียกใช้เมื่อตรวจสอบสลิปผ่านแล้ว หรือ Admin ยืนยันการชำระเงิน
   * 
   * ⚠️ สำคัญ: ใช้ Pessimistic Locking เพื่อป้องกัน Overselling
   * เช็คสต็อก "ณ วินาทีที่จ่ายเงิน" เพื่อป้องกันกรณีสินค้าหมดระหว่างรอชำระเงิน
   * 
   * @param order Order object ที่มี productOnOrders
   * @param manager Optional EntityManager จาก transaction (ถ้ามีจะใช้ transaction เดียวกัน, ถ้าไม่มีจะสร้างใหม่)
   * @deprecated ใช้ "Reserve Stock on Creation" แล้ว ไม่ต้องเรียกใช้ method นี้
   */
  private async confirmStockDeduction(order: Order, manager?: any): Promise<void> {
    if (!order.productOnOrders || order.productOnOrders.length === 0) {
      this.logger.warn(`Order #${order.id} has no items to process`);
      return;
    }

    // ✅ ถ้าไม่มี manager จาก transaction ให้สร้าง queryRunner ใหม่ (backward compatibility)
    const shouldCreateRunner = !manager;
    let queryRunner: any = null;
    let entityManager: any = manager;
    
    if (shouldCreateRunner) {
      queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      entityManager = queryRunner.manager;
    }

    try {
      this.logger.log(`🔄 Finalizing payment for order #${order.id} - Checking and deducting stock...`);

      for (const item of order.productOnOrders) {
        const product = await entityManager.findOne(Product, {
          where: { id: item.productId },
        });

        if (!product) {
          throw new BadRequestException(`ไม่พบสินค้า ID ${item.productId}`);
        }

        // ✅ ตรวจสอบว่าเป็น Flash Sale Item หรือไม่ (ณ วินาทีที่จ่ายเงิน)
        const now = new Date();
        
        // 🔒 ล็อคแถว Flash Sale Item เพื่อป้องกัน Overselling
        const flashSaleItem = await entityManager
          .createQueryBuilder(FlashSaleItem, 'fsi')
          .innerJoin('fsi.flashSale', 'fs')
          .where('fsi.productId = :productId', { productId: item.productId })
          .andWhere('fs.isActive = :isActive', { isActive: true })
          .andWhere('fs.startTime <= :now', { now })
          .andWhere('fs.endTime >= :now', { now })
          .setLock('pessimistic_write') // 🔒 ล็อคแถว Flash Sale Item
          .getOne();

        let isFlashSaleItem = false;

        if (flashSaleItem) {
          isFlashSaleItem = true;

          // 🚨 เช็คด่านสุดท้าย: ของหมดหรือยัง? (ณ วินาทีที่จ่ายเงิน)
          if (flashSaleItem.sold + item.count > flashSaleItem.limitStock) {
            if (shouldCreateRunner && queryRunner) {
              await queryRunner.rollbackTransaction();
            }
            throw new BadRequestException(
              `ขออภัย สินค้า "${product.title}" ใน Flash Sale หมดแล้ว! (มาช้าไปนิดเดียว) กรุณาติดต่อผู้ดูแลระบบเพื่อคืนเงิน`,
            );
          }

          // ✅ ถ้าของเหลือ -> ตัดสต็อก Flash Sale ตอนนี้เลย (ใช้ Atomic Update)
          const reserveResult = await this.flashSaleService.reserveFlashSaleStock(
            flashSaleItem.id,
            item.count,
          );

          if (!reserveResult.success) {
            if (shouldCreateRunner && queryRunner) {
              await queryRunner.rollbackTransaction();
            }
            throw new BadRequestException(
              reserveResult.message || `ไม่สามารถจองสต็อก Flash Sale สำหรับ "${product.title}" ได้`,
            );
          }

          this.logger.log(
            `✅ Deducted Flash Sale item #${flashSaleItem.id} (product #${item.productId}): +${item.count} sold`,
          );
        }

        // ✅ ตัดสต็อกสินค้าปกติ (ถ้าไม่ใช่ Flash Sale)
        if (!isFlashSaleItem) {
          // ถ้ามี Variant ให้ตัดสต็อกที่ Variant
          if (item.variantId) {
            const variant = await entityManager.findOne(ProductVariant, {
              where: { id: item.variantId },
              lock: { mode: 'pessimistic_write' }, // 🔒 ล็อคแถว Variant
            });

            if (!variant) {
              throw new BadRequestException(`ไม่พบตัวเลือกสินค้า ID ${item.variantId}`);
            }

            // 🚨 เช็คด่านสุดท้าย: ของหมดหรือยัง?
            if (variant.stock < item.count) {
              if (shouldCreateRunner && queryRunner) {
                await queryRunner.rollbackTransaction();
              }
              throw new BadRequestException(
                `ขออภัย ตัวเลือก "${variant.name}" หมดแล้ว! (เหลือ ${variant.stock} ชิ้น, ต้องการ ${item.count} ชิ้น) กรุณาติดต่อผู้ดูแลระบบเพื่อคืนเงิน`,
              );
            }

            // ✅ ถ้าของเหลือ -> ตัดสต็อก Variant ตอนนี้เลย
            variant.stock -= item.count;
            await entityManager.save(variant);
            this.logger.log(
              `✅ Deducted variant #${item.variantId}: -${item.count} units (now: ${variant.stock})`,
            );
          } else {
            // ไม่มี Variant -> ตัดสต็อกที่ตัว Product แม่
            const productLocked = await entityManager.findOne(Product, {
              where: { id: item.productId },
              lock: { mode: 'pessimistic_write' }, // 🔒 ล็อคแถว Product
            });

            if (!productLocked) {
              throw new BadRequestException(`ไม่พบสินค้า ID ${item.productId}`);
            }

            // 🚨 เช็คด่านสุดท้าย: ของหมดหรือยัง?
            if (productLocked.quantity < item.count) {
              if (shouldCreateRunner && queryRunner) {
                await queryRunner.rollbackTransaction();
              }
              throw new BadRequestException(
                `ขออภัย สินค้า "${productLocked.title}" หมดแล้ว! (เหลือ ${productLocked.quantity} ชิ้น, ต้องการ ${item.count} ชิ้น) กรุณาติดต่อผู้ดูแลระบบเพื่อคืนเงิน`,
              );
            }

            // ✅ ถ้าของเหลือ -> ตัดสต็อก Product ตอนนี้เลย
            productLocked.quantity -= item.count;
            await entityManager.save(productLocked);
            this.logger.log(
              `✅ Deducted product #${item.productId}: -${item.count} units (now: ${productLocked.quantity})`,
            );
          }

          // เพิ่มยอดขาย (Sold Count) สำหรับสินค้าปกติ
          await entityManager.increment(
            Product,
            { id: item.productId },
            'sold',
            item.count,
          );
          this.logger.log(`✅ Incremented sold for product #${item.productId}: +${item.count}`);
        }
      }

      if (shouldCreateRunner && queryRunner) {
        await queryRunner.commitTransaction();
      }
      this.logger.log(`✅ Successfully finalized payment and deducted stock for order #${order.id}`);
    } catch (error) {
      if (shouldCreateRunner && queryRunner) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.error(`❌ Error finalizing payment for order #${order.id}:`, error);
      
      // ⚠️ ต้องแจ้ง User ว่า "ขออภัย สินค้าหมดระหว่างดำเนินการ คืนเงิน"
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'ไม่สามารถตัดสต็อกได้ กรุณาติดต่อผู้ดูแลระบบเพื่อคืนเงิน',
      );
    } finally {
      if (shouldCreateRunner && queryRunner) {
        await queryRunner.release();
      }
    }
  }

  // ✅ ตรวจสอบว่าสลิปนี้เคยถูกใช้ในออเดอร์อื่นแล้วหรือไม่ (ตรวจสอบ URL)
  async findOrderBySlipUrl(
    slipUrl: string,
    excludeOrderId?: number,
  ): Promise<Order | null> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.paymentSlipUrl = :slipUrl', { slipUrl })
      .andWhere('order.orderStatus NOT IN (:...cancelledStatuses)', {
        cancelledStatuses: [OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      });

    // ถ้ามี excludeOrderId ให้ยกเว้นออเดอร์นั้น
    if (excludeOrderId) {
      queryBuilder.andWhere('order.id != :excludeOrderId', {
        excludeOrderId,
      });
    }

    return queryBuilder.getOne();
  }

  // ✅ ตรวจสอบว่าสลิปนี้เคยถูกใช้ในออเดอร์อื่นแล้วหรือไม่ (ตรวจสอบ reference number จาก EasySlip)
  // ใช้ข้อมูลจาก verificationDetails ที่เก็บไว้ใน JSON field หรือ column อื่น
  // สำหรับตอนนี้ ตรวจสอบจาก paymentSlipUrl ที่เหมือนกัน (ถ้าอัพโหลดไฟล์เดียวกัน URL จะเหมือนกัน)
  async findOrderBySlipReference(
    reference: string,
    excludeOrderId?: number,
  ): Promise<Order | null> {
    // ✅ ตรวจสอบจาก paymentSlipUrl ที่มี reference ใน URL หรือจากข้อมูลอื่น
    // สำหรับตอนนี้ ใช้วิธีง่ายๆ คือตรวจสอบ paymentSlipUrl ที่เหมือนกัน
    // ถ้าต้องการให้แม่นยำมากขึ้น อาจจะต้องเพิ่ม column ใหม่ใน Order entity เพื่อเก็บ reference number
    
    // ตรวจสอบจาก paymentSlipUrl ที่มี reference ใน URL
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.paymentSlipUrl LIKE :reference', { reference: `%${reference}%` })
      .andWhere('order.orderStatus NOT IN (:...cancelledStatuses)', {
        cancelledStatuses: [OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      });

    // ถ้ามี excludeOrderId ให้ยกเว้นออเดอร์นั้น
    if (excludeOrderId) {
      queryBuilder.andWhere('order.id != :excludeOrderId', {
        excludeOrderId,
      });
    }

    return queryBuilder.getOne();
  }

  // ✅ User อัปโหลดสลิปและตรวจสอบผ่านแล้ว (เปลี่ยนสถานะเป็น PROCESSING)
  // ⚠️ ใช้ Transaction และ Pessimistic Lock เพื่อป้องกัน Race Condition
  async updateSlipWithVerification(
    orderId: number,
    userId: number,
    imageUrl: string,
    verificationDetails?: any,
    slipReference?: string | null,
  ): Promise<Order> {
    // ✅ ถ้าไม่ได้รับ slipReference ให้ดึงจาก verificationDetails (backward compatibility)
    const finalSlipReference =
      slipReference ||
      verificationDetails?.reference ||
      verificationDetails?.transactionId ||
      verificationDetails?.transferId ||
      null;

    // ✅ ใช้ Transaction เพื่อให้การทำงานทั้งหมดเป็น Atomic
    return await this.dataSource.transaction(async (manager) => {
      // ✅ ใช้ Pessimistic Lock เพื่อ lock Order row
      const order = await manager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :orderId', { orderId })
        .leftJoinAndSelect('order.productOnOrders', 'productOnOrders')
        .leftJoinAndSelect('productOnOrders.product', 'product')
        .leftJoinAndSelect('productOnOrders.variant', 'variant')
        .getOne();

      if (!order) {
        throw new NotFoundException('ไม่พบออเดอร์');
      }

      // ตรวจสอบว่าเป็นเจ้าของออเดอร์
      if (order.orderedById !== userId) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขออเดอร์นี้');
      }

      // ตรวจสอบว่าออเดอร์อยู่ในสถานะที่สามารถอัปโหลดสลิปได้
      if (order.orderStatus === OrderStatus.CANCELLED) {
        throw new BadRequestException(
          'ออเดอร์นี้ถูกยกเลิกแล้วเนื่องจากหมดเวลาชำระเงิน กรุณาสร้างออเดอร์ใหม่',
        );
      }
      
      if (order.orderStatus !== OrderStatus.PENDING && order.orderStatus !== OrderStatus.VERIFYING) {
        throw new BadRequestException(
          `ออเดอร์นี้ไม่สามารถอัปโหลดสลิปได้ (สถานะปัจจุบัน: ${order.orderStatus})`,
        );
      }

      // ✅ หมายเหตุ: ไม่ต้องตัดสต็อกอีกแล้ว เพราะระบบใช้ "Reserve Stock on Creation"
      // สต็อกถูกตัดไปแล้วตอนสร้าง Order (ใน createOrder)
      // this.confirmStockDeduction(order, manager); // ❌ ไม่ต้องเรียกใช้แล้ว

      // ✅ Strict Mode: Database Unique Constraint จะจัดการ duplicate detection อัตโนมัติ
      // ไม่ต้อง explicit check เพราะ Unique Index จะ reject ทันที (รวมถึง cancelled orders)
      // หมายเหตุ: Explicit check ถูกลบออกเพื่อให้ Database Constraint ทำงานเต็มที่ (Strict Mode)

      // อัปเดตข้อมูลสลิป
      // ✅ Security: ตรวจสอบว่า imageUrl และ finalSlipReference ไม่ใช่ empty string
      // MySQL Unique Index จะ ignore NULL แต่จะตรวจสอบ empty string เป็น duplicate
      // ดังนั้นต้องจัดการ empty string ใน application level
      if (!imageUrl || imageUrl.trim() === '') {
        throw new BadRequestException('URL สลิปไม่ถูกต้อง');
      }
      order.paymentSlipUrl = imageUrl.trim();
      
      if (finalSlipReference && finalSlipReference.trim() !== '') {
        order.slipReference = finalSlipReference.trim();
      } else {
        order.slipReference = null; // ใช้ NULL แทน empty string เพื่อให้ Unique Index ignore
      }
      
      // ✅ เปลี่ยนสถานะเป็น PENDING_CONFIRMATION (รอร้านค้ายืนยันรับออเดอร์)
      // ร้านค้าต้องกด "ยอมรับออเดอร์" เพื่อเปลี่ยนเป็น PROCESSING
      order.orderStatus = OrderStatus.PENDING_CONFIRMATION;
      
      // ✅ ตั้งเวลาหมดอายุการยืนยันรับออเดอร์ (24 ชั่วโมง)
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 24);
      order.confirmationDeadline = deadline;

      try {
        // บันทึกข้อมูลใน transaction
        // ✅ Database Unique Constraint จะป้องกันการบันทึกสลิปซ้ำแบบถาวร
        const savedOrder = await manager.save(order);

        // ✅ Send Notification: Verification Success (Auto)
        // Fire-and-forget: ไม่ให้ notification error ทำให้ transaction พัง
        this.sendPaymentSuccessNotification(savedOrder).catch((err) => {
          this.logger.error(
            `Failed to send payment success notification for order #${savedOrder.id}:`,
            err,
          );
        });

        return savedOrder;
      } catch (error: any) {
        // ✅ Strict Mode: Handle duplicate key errors จาก database unique constraints
        // Error Code: ER_DUP_ENTRY (1062) = Duplicate entry for unique key
        // Database Constraint จะ reject ทันที ไม่ว่า orderStatus จะเป็นอะไร (รวมถึง cancelled orders)
        if (error.code === 'ER_DUP_ENTRY' || error.code === 1062) {
          // ✅ Log warning สำหรับ Audit Trail
          this.logger.warn(
            `[updateSlipWithVerification] ⚠️ STRICT MODE: Duplicate slip attempt detected - Order #${orderId}, User #${userId}, URL: ${imageUrl.substring(0, 50)}...`,
          );

          // ✅ ตรวจสอบว่า error เกิดจาก paymentSlipUrl หรือ slipReference
          const errorMessage = error.message || '';
          if (
            errorMessage.includes('paymentSlipUrl') ||
            errorMessage.includes('idx_order_payment_slip_url_permanent')
          ) {
            throw new BadRequestException(
              'สลิปนี้ถูกใช้งานไปแล้วในออเดอร์อื่น (ไม่สามารถใช้ซ้ำได้)',
            );
          } else if (
            errorMessage.includes('slipReference') ||
            errorMessage.includes('idx_order_slip_reference_permanent')
          ) {
            throw new BadRequestException(
              'Reference ของสลิปนี้ถูกใช้งานไปแล้วในออเดอร์อื่น (ไม่สามารถใช้ซ้ำได้)',
            );
          } else {
            // Generic duplicate error - Strict Mode
            throw new BadRequestException(
              'สลิปนี้ถูกใช้งานไปแล้วในออเดอร์อื่น (ไม่สามารถใช้ซ้ำได้)',
            );
          }
        }
        // Re-throw other errors
        this.logger.error(
          `[updateSlipWithVerification] Unexpected error saving order #${orderId}:`,
          error,
        );
        throw error;
      }
    });
  }

  // ✅ Helper: Send Payment Success Notification
  private async sendPaymentSuccessNotification(order: Order): Promise<void> {
    try {
      // ดึงข้อมูล User พร้อม notification settings
      const user = await this.userRepository.findOne({
        where: { id: order.orderedById },
      });

      if (!user) {
        this.logger.warn(
          `User not found for order #${order.id}, skipping notification`,
        );
        return;
      }

      // ตรวจสอบ notification settings
      const settings = await this.notificationSettingsService.findMySettings(
        user.id,
      );

      if (settings && !settings.orderUpdate) {
        this.logger.debug(
          `User #${user.id} has disabled order update notifications`,
        );
        return;
      }

      // ส่ง Notification
      await this.notificationsService.sendAndSave(
        user,
        'ชำระเงินสำเร็จ!',
        `คำสั่งซื้อ #${order.id} ของคุณได้รับการยืนยันแล้ว ทางร้านจะรีบจัดส่งให้เร็วที่สุด`,
        'ORDER_PAID',
        {
          url: `gtxshop://order/${order.id}`,
          orderId: order.id,
        },
      );

      this.logger.log(
        `Payment success notification sent to user #${user.id} for order #${order.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending payment success notification for order #${order.id}:`,
        error,
      );
      // Don't throw - this is fire-and-forget
    }
  }

  // ✅ Fallback: อัปโหลดสลิปโดยไม่ตรวจสอบ (กรณี EasySlip API ล่ม)
  // ตั้งสถานะเป็น VERIFYING เพื่อให้ Admin ตรวจสอบด้วยตนเอง
  async updateSlipWithoutVerification(
    orderId: number,
    userId: number,
    imageUrl: string,
  ): Promise<Order> {
    this.logger.warn(
      `[updateSlipWithoutVerification] Order #${orderId}: EasySlip API unavailable, saving slip for manual verification`,
    );

    // ✅ ใช้ Transaction เพื่อให้การทำงานทั้งหมดเป็น Atomic
    return await this.dataSource.transaction(async (manager) => {
      // ✅ ใช้ Pessimistic Lock เพื่อ lock Order row
      const order = await manager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :orderId', { orderId })
        .leftJoinAndSelect('order.productOnOrders', 'productOnOrders')
        .leftJoinAndSelect('productOnOrders.product', 'product')
        .leftJoinAndSelect('productOnOrders.variant', 'variant')
        .getOne();

      if (!order) {
        throw new NotFoundException('ไม่พบออเดอร์');
      }

      // ตรวจสอบว่าเป็นเจ้าของออเดอร์
      if (order.orderedById !== userId) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขออเดอร์นี้');
      }

      // ตรวจสอบว่าออเดอร์อยู่ในสถานะที่สามารถอัปโหลดสลิปได้
      if (order.orderStatus === OrderStatus.CANCELLED) {
        throw new BadRequestException(
          'ออเดอร์นี้ถูกยกเลิกแล้วเนื่องจากหมดเวลาชำระเงิน กรุณาสร้างออเดอร์ใหม่',
        );
      }
      
      if (order.orderStatus !== OrderStatus.PENDING && order.orderStatus !== OrderStatus.VERIFYING) {
        throw new BadRequestException(
          `ออเดอร์นี้ไม่สามารถอัปโหลดสลิปได้ (สถานะปัจจุบัน: ${order.orderStatus})`,
        );
      }

      // ✅ หมายเหตุ: ไม่ต้องตัดสต็อกอีกแล้ว เพราะระบบใช้ "Reserve Stock on Creation"
      // สต็อกถูกตัดไปแล้วตอนสร้าง Order (ใน createOrder)

      // ✅ Strict Mode: Database Unique Constraint จะจัดการ duplicate detection อัตโนมัติ
      // ไม่ต้อง explicit check เพราะ Unique Index จะ reject ทันที (รวมถึง cancelled orders)
      // หมายเหตุ: Explicit check ถูกลบออกเพื่อให้ Database Constraint ทำงานเต็มที่ (Strict Mode)

      // อัปเดตข้อมูลสลิป (ไม่มีการตรวจสอบยอดเงิน)
      // ✅ Security: ตรวจสอบว่า imageUrl ไม่ใช่ empty string
      // MySQL Unique Index จะ ignore NULL แต่จะตรวจสอบ empty string เป็น duplicate
      if (!imageUrl || imageUrl.trim() === '') {
        throw new BadRequestException('URL สลิปไม่ถูกต้อง');
      }
      order.paymentSlipUrl = imageUrl.trim(); // ใช้ trimmed value
      // ✅ ตั้งสถานะเป็น VERIFYING (รอเจ้าหน้าที่ตรวจสอบด้วยตนเอง)
      order.orderStatus = OrderStatus.VERIFYING;

      try {
        // บันทึกข้อมูลใน transaction
        // ✅ Database Unique Constraint จะป้องกันการบันทึกสลิปซ้ำแบบถาวร
        const savedOrder = await manager.save(order);
        this.logger.log(
          `[updateSlipWithoutVerification] Order #${orderId}: Slip saved, status set to VERIFYING for manual verification`,
        );

        // ✅ Send Notification: Fallback Mode (Manual Check)
        // Fire-and-forget: ไม่ให้ notification error ทำให้ transaction พัง
        this.sendPaymentVerifyingNotification(savedOrder).catch((err) => {
          this.logger.error(
            `Failed to send payment verifying notification for order #${savedOrder.id}:`,
            err,
          );
        });

        return savedOrder;
      } catch (error: any) {
        // ✅ Strict Mode: Handle duplicate key errors จาก database unique constraints
        // Error Code: ER_DUP_ENTRY (1062) = Duplicate entry for unique key
        // Database Constraint จะ reject ทันที ไม่ว่า orderStatus จะเป็นอะไร (รวมถึง cancelled orders)
        if (error.code === 'ER_DUP_ENTRY' || error.code === 1062) {
          // ✅ Log warning สำหรับ Audit Trail
          this.logger.warn(
            `[updateSlipWithoutVerification] ⚠️ STRICT MODE: Duplicate slip attempt detected - Order #${orderId}, User #${userId}, URL: ${imageUrl.substring(0, 50)}...`,
          );

          // ✅ ตรวจสอบว่า error เกิดจาก paymentSlipUrl หรือ slipReference
          const errorMessage = error.message || '';
          if (
            errorMessage.includes('paymentSlipUrl') ||
            errorMessage.includes('idx_order_payment_slip_url_permanent')
          ) {
            throw new BadRequestException(
              'สลิปนี้ถูกใช้งานไปแล้วในออเดอร์อื่น (ไม่สามารถใช้ซ้ำได้)',
            );
          } else if (
            errorMessage.includes('slipReference') ||
            errorMessage.includes('idx_order_slip_reference_permanent')
          ) {
            throw new BadRequestException(
              'Reference ของสลิปนี้ถูกใช้งานไปแล้วในออเดอร์อื่น (ไม่สามารถใช้ซ้ำได้)',
            );
          } else {
            // Generic duplicate error - Strict Mode
            throw new BadRequestException(
              'สลิปนี้ถูกใช้งานไปแล้วในออเดอร์อื่น (ไม่สามารถใช้ซ้ำได้)',
            );
          }
        }
        // Re-throw other errors
        this.logger.error(
          `[updateSlipWithoutVerification] Unexpected error saving order #${orderId}:`,
          error,
        );
        throw error;
      }
    });
  }

  // ✅ Helper: Send Payment Verifying Notification (Fallback Mode)
  private async sendPaymentVerifyingNotification(order: Order): Promise<void> {
    try {
      // ดึงข้อมูล User พร้อม notification settings
      const user = await this.userRepository.findOne({
        where: { id: order.orderedById },
      });

      if (!user) {
        this.logger.warn(
          `User not found for order #${order.id}, skipping notification`,
        );
        return;
      }

      // ตรวจสอบ notification settings
      const settings = await this.notificationSettingsService.findMySettings(
        user.id,
      );

      if (settings && !settings.orderUpdate) {
        this.logger.debug(
          `User #${user.id} has disabled order update notifications`,
        );
        return;
      }

      // ส่ง Notification
      await this.notificationsService.sendAndSave(
        user,
        'ได้รับสลิปแล้ว!',
        `คำสั่งซื้อ #${order.id} กำลังรอการตรวจสอบยอดเงินจากเจ้าหน้าที่`,
        'ORDER_VERIFYING',
        {
          url: `gtxshop://order/${order.id}`,
          orderId: order.id,
        },
      );

      this.logger.log(
        `Payment verifying notification sent to user #${user.id} for order #${order.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending payment verifying notification for order #${order.id}:`,
        error,
      );
      // Don't throw - this is fire-and-forget
    }
  }

  // ✅ Admin ยืนยันยอดเงิน
  async confirmPayment(orderId: number): Promise<Order> {
    const order = await this.findOne(orderId, ['productOnOrders', 'productOnOrders.product', 'productOnOrders.variant']);

    // ตรวจสอบว่าออเดอร์อยู่ในสถานะ VERIFYING
    if (order.orderStatus !== OrderStatus.VERIFYING) {
      throw new BadRequestException('ออเดอร์นี้ไม่ได้อยู่ในสถานะรอตรวจสอบ');
    }

    // ✅ หมายเหตุ: ไม่ต้องตัดสต็อกอีกแล้ว เพราะระบบใช้ "Reserve Stock on Creation"
    // สต็อกถูกตัดไปแล้วตอนสร้าง Order (ใน createOrder)
    // this.confirmStockDeduction(order); // ❌ ไม่ต้องเรียกใช้แล้ว

    const previousStatus = order.orderStatus;
    // ✅ เปลี่ยนเป็น PENDING_CONFIRMATION (รอร้านยอมรับออเดอร์)
    // ร้านค้าต้องกด "ยอมรับออเดอร์" เพื่อเปลี่ยนเป็น PROCESSING
    order.orderStatus = OrderStatus.PENDING_CONFIRMATION;
    
    // ✅ ตั้งเวลาหมดอายุการยืนยันรับออเดอร์ (24 ชั่วโมง)
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 24);
    order.confirmationDeadline = deadline;

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

  // ✅ Admin: อนุมัติสลิป (Manual Verification)
  async approveSlip(orderId: number, adminId: number): Promise<Order> {
    return await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ['orderedBy'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('ไม่พบออเดอร์');
      }

      if (order.orderStatus !== OrderStatus.VERIFYING && !(order.orderStatus === OrderStatus.PENDING && order.paymentSlipUrl)) {
        throw new BadRequestException('ออเดอร์นี้ไม่อยู่ในสถานะที่รอการอนุมัติสลิป');
      }

      order.orderStatus = OrderStatus.PENDING_CONFIRMATION;
      
      try {
        const savedOrder = await manager.save(order);

        await this.adminLogsService.logAction(
          adminId,
          'APPROVE_SLIP',
          'ORDER',
          orderId,
          `Admin อนุมัติสลิปสำหรับ Order #${orderId}`,
        );

        this.sendPaymentSuccessNotificationByUser(order.orderedBy, savedOrder.id).catch((err) =>
          this.logger.error(`Failed to send payment success notification after admin approval for order ${savedOrder.id}: ${err.message}`),
        );

        return savedOrder;
      } catch (error: any) {
        // ✅ Handle duplicate key errors (แม้ว่าจะไม่น่าจะเกิดใน approveSlip แต่เพื่อความปลอดภัย)
        if (error.code === 'ER_DUP_ENTRY' || error.code === 1062) {
          this.logger.error(
            `[approveSlip] Unexpected duplicate entry error for order #${orderId}:`,
            error,
          );
          throw new BadRequestException(
            'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
          );
        }
        throw error;
      }
    });
  }

  // ✅ Admin: ปฏิเสธสลิป (Manual Verification)
  async rejectSlip(orderId: number, adminId: number, reason: string): Promise<Order> {
    return await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ['orderedBy'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('ไม่พบออเดอร์');
      }

      if (order.orderStatus !== OrderStatus.VERIFYING && order.orderStatus !== OrderStatus.PENDING) {
        throw new BadRequestException('ออเดอร์นี้ไม่อยู่ในสถานะที่สามารถปฏิเสธสลิปได้');
      }

      order.paymentSlipUrl = null;
      order.slipReference = null;
      order.orderStatus = OrderStatus.PENDING; // กลับไปรอชำระเงินใหม่
      const expiredAt = new Date();
      expiredAt.setMinutes(expiredAt.getMinutes() + 30); // ให้เวลา 30 นาทีในการอัปโหลดใหม่
      order.paymentExpiredAt = expiredAt;

      try {
        const savedOrder = await manager.save(order);

        await this.adminLogsService.logAction(
          adminId,
          'REJECT_SLIP',
          'ORDER',
          orderId,
          `Admin ปฏิเสธสลิปสำหรับ Order #${orderId} ด้วยเหตุผล: ${reason}`,
        );

        this.sendPaymentRejectedNotification(order.orderedBy, savedOrder.id, reason).catch((err) =>
          this.logger.error(`Failed to send payment rejected notification after admin rejection for order ${savedOrder.id}: ${err.message}`),
        );

        return savedOrder;
      } catch (error: any) {
        // ✅ Handle duplicate key errors (แม้ว่าจะไม่น่าจะเกิดใน rejectSlip เพราะตั้งค่าเป็น null แต่เพื่อความปลอดภัย)
        if (error.code === 'ER_DUP_ENTRY' || error.code === 1062) {
          this.logger.error(
            `[rejectSlip] Unexpected duplicate entry error for order #${orderId}:`,
            error,
          );
          throw new BadRequestException(
            'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
          );
        }
        throw error;
      }
    });
  }

  // ✅ Admin: ดึงออเดอร์ที่สถานะ VERIFYING (รอตรวจสอบ)
  async findAllVerifying(): Promise<Order[]> {
    return this.orderRepository.find({
      where: { orderStatus: OrderStatus.VERIFYING },
      relations: [
        'productOnOrders',
        'productOnOrders.product',
        'productOnOrders.product.images',
        'productOnOrders.variant',
        'orderedBy',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  // ✅ Helper: ส่ง Notification เมื่อชำระเงินสำเร็จ (ใช้ User และ OrderId)
  private async sendPaymentSuccessNotificationByUser(user: User, orderId: number): Promise<void> {
    try {
      await this.notificationsService.sendAndSave(
        user,
        'ชำระเงินสำเร็จ!',
        `คำสั่งซื้อ #${orderId} ของคุณได้รับการยืนยันแล้ว ทางร้านจะรีบจัดส่งให้เร็วที่สุด`,
        'ORDER_PAID',
        { url: `gtxshop://order/${orderId}`, orderId },
      );
    } catch (error) {
      this.logger.error(`Failed to send payment success notification for order ${orderId}:`, error);
    }
  }

  // ✅ Helper: ส่ง Notification เมื่อสลิปถูกปฏิเสธ
  private async sendPaymentRejectedNotification(user: User, orderId: number, reason: string): Promise<void> {
    try {
      await this.notificationsService.sendAndSave(
        user,
        'สลิปถูกปฏิเสธ',
        `สลิปของคุณถูกปฏิเสธเนื่องจาก: ${reason} กรุณาตรวจสอบและแนบหลักฐานใหม่`,
        'ORDER_CANCELLED',
        { url: `gtxshop://order/${orderId}`, orderId },
      );
    } catch (error) {
      this.logger.error(`Failed to send payment rejected notification for order ${orderId}:`, error);
    }
  }

  /**
   * จับคู่ยอดเงินจาก SMS กับออเดอร์ที่รอชำระเงิน
   * ค้นหาออเดอร์ที่มี cartTotal ตรงกับยอดเงินที่ได้รับ (ยอมรับความคลาดเคลื่อน ±0.01 บาท)
   * @param amount ยอดเงินจาก SMS (บาท)
   * @param userId ID ของผู้ใช้ (optional - ถ้ามีจะ filter เฉพาะออเดอร์ของ user นั้น)
   * @returns ออเดอร์ที่ตรงกับยอดเงิน หรือ null ถ้าไม่พบ
   */
  async matchOrderByAmount(
    amount: number,
    userId?: number,
  ): Promise<Order | null> {
    if (!amount || amount <= 0) {
      return null;
    }

    // ✅ ค้นหาออเดอร์ที่มี cartTotal ตรงกับยอดเงิน (ยอมรับความคลาดเคลื่อน ±0.01 บาท)
    // Filter เฉพาะออเดอร์ที่:
    // 1. ยังไม่ได้ชำระเงิน (PENDING, VERIFYING)
    // 2. cartTotal ตรงกับยอดเงินที่ได้รับ (±0.01 บาท)
    // 3. (Optional) เป็นออเดอร์ของ user ที่ระบุ
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.orderStatus IN (:...statuses)', {
        statuses: [OrderStatus.PENDING, OrderStatus.VERIFYING],
      })
      .andWhere('order.cartTotal BETWEEN :minAmount AND :maxAmount', {
        minAmount: amount - 0.01,
        maxAmount: amount + 0.01,
      })
      .orderBy('order.createdAt', 'DESC') // เอา order ล่าสุดก่อน
      .limit(1);

    // ถ้ามี userId ให้ filter เพิ่ม
    if (userId) {
      queryBuilder.andWhere('order.orderedById = :userId', { userId });
    }

    const order = await queryBuilder.getOne();

    if (order) {
      this.logger.log(
        `✅ Matched order #${order.id} with amount ${amount} THB (order total: ${order.cartTotal} THB)`,
      );
    } else {
      this.logger.warn(
        `⚠️ No matching order found for amount ${amount} THB${userId ? ` (user: ${userId})` : ''}`,
      );
    }

    return order;
  }

  /**
   * อัปเดตสถานะออเดอร์เป็น "ชำระเงินแล้ว" เมื่อได้รับ SMS ยืนยันการโอนเงิน
   * @param orderId ID ของออเดอร์
   * @param smsSender ชื่อธนาคารที่ส่ง SMS (เช่น "KBANK")
   * @returns ออเดอร์ที่อัปเดตแล้ว
   */
  async confirmPaymentFromSms(
    orderId: number,
    smsSender: string,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    // ตรวจสอบสถานะออเดอร์
    if (order.orderStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'ออเดอร์นี้ถูกยกเลิกแล้ว ไม่สามารถยืนยันการชำระเงินได้',
      );
    }

    if (
      order.orderStatus === OrderStatus.PENDING_CONFIRMATION ||
      order.orderStatus === OrderStatus.PROCESSING ||
      order.orderStatus === OrderStatus.SHIPPED ||
      order.orderStatus === OrderStatus.DELIVERED
    ) {
      this.logger.warn(
        `⚠️ Order #${orderId} already has status ${order.orderStatus}, skipping SMS confirmation`,
      );
      return order; // Return existing order without updating
    }

    // ✅ อัปเดตสถานะเป็น PENDING_CONFIRMATION (รอร้านค้ายืนยัน)
    order.orderStatus = OrderStatus.PENDING_CONFIRMATION;
    
    // ✅ ตั้งเวลาหมดอายุการยืนยันรับออเดอร์ (24 ชั่วโมง)
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 24);
    order.confirmationDeadline = deadline;
    
    // ✅ บันทึกข้อมูล SMS (optional - สำหรับ audit trail)
    // สามารถเพิ่ม field ใน Order entity เพื่อเก็บ SMS metadata ได้

    const savedOrder = await this.orderRepository.save(order);

    this.logger.log(
      `✅ Order #${orderId} payment confirmed via SMS from ${smsSender}. Status updated to PENDING_CONFIRMATION`,
    );

    // ✅ Send Notification: Payment Success (Auto)
    this.sendPaymentSuccessNotification(savedOrder).catch((err) => {
      this.logger.error(
        `Failed to send payment success notification for order #${savedOrder.id}:`,
        err,
      );
    });

    return savedOrder;
  }

  // ✅ ระบบ Auto-Cancellation สำหรับออเดอร์ที่ร้านค้าไม่ยืนยันภายใน 24 ชั่วโมง
  async cancelExpiredOrders(): Promise<{ cancelled: number; errors: number }> {
    this.logger.log('[cancelExpiredOrders] Checking for expired confirmation orders...');

    const now = new Date();

    // Query หา Order ที่:
    // - Status = PENDING_CONFIRMATION
    // - confirmationDeadline < NOW() (หมดเวลาแล้ว)
    // - isAutoCancelled = false (เพื่อไม่ให้รันซ้ำ)
    const expiredOrders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.productOnOrders', 'productOnOrders')
      .leftJoinAndSelect('productOnOrders.product', 'product')
      .leftJoinAndSelect('productOnOrders.variant', 'variant')
      .leftJoinAndSelect('order.orderedBy', 'orderedBy')
      .where('order.orderStatus = :status', { status: OrderStatus.PENDING_CONFIRMATION })
      .andWhere('order.confirmationDeadline IS NOT NULL')
      .andWhere('order.confirmationDeadline < :now', { now })
      .andWhere('order.isAutoCancelled = :isAutoCancelled', { isAutoCancelled: false })
      .getMany();

    if (expiredOrders.length === 0) {
      this.logger.log('[cancelExpiredOrders] No expired orders found.');
      return { cancelled: 0, errors: 0 };
    }

    this.logger.log(
      `[cancelExpiredOrders] Found ${expiredOrders.length} expired orders to cancel.`,
    );

    let successCount = 0;
    let errorCount = 0;

    // Loop ผ่าน Order ที่หมดอายุทีละรายการ
    for (const order of expiredOrders) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // 1. เปลี่ยน Status เป็น CANCELLED
        await queryRunner.manager.update(
          Order,
          { id: order.id },
          {
            orderStatus: OrderStatus.CANCELLED,
            isAutoCancelled: true,
          },
        );

        // 2. Restock สินค้า (คืนสต็อกกลับ)
        if (order.productOnOrders && order.productOnOrders.length > 0) {
          this.logger.log(
            `[cancelExpiredOrders] Order #${order.id}: Restocking ${order.productOnOrders.length} items...`,
          );

          // Sort items by ID เพื่อป้องกัน Deadlock
          const sortedItems = [...order.productOnOrders].sort((a, b) => a.id - b.id);

          for (const item of sortedItems) {
            try {
              // ✅ กรณีที่ 1: มี Variant -> คืนสต็อก Variant
              if (item.variantId && item.variant) {
                const variant = await queryRunner.manager.findOne(ProductVariant, {
                  where: { id: item.variantId },
                  lock: { mode: 'pessimistic_write' },
                });

                if (variant) {
                  variant.stock += item.count;
                  await queryRunner.manager.save(variant);
                  this.logger.log(
                    `[cancelExpiredOrders]   → Restocked variant #${item.variantId}: +${item.count} units (now: ${variant.stock})`,
                  );
                }
              } else {
                // ✅ กรณีที่ 2: ไม่มี Variant -> คืนสต็อก Product
                const product = await queryRunner.manager.findOne(Product, {
                  where: { id: item.productId },
                  lock: { mode: 'pessimistic_write' },
                });

                if (product) {
                  product.quantity += item.count;
                  await queryRunner.manager.save(product);

                  // ลดจำนวนที่ขายไป: ลบ `product.sold` ออก (ต้องไม่ให้ติดลบ)
                  const currentSold = product.sold || 0;
                  const newSold = Math.max(0, currentSold - item.count);
                  await queryRunner.manager.update(
                    Product,
                    { id: item.productId },
                    { sold: newSold },
                  );

                  this.logger.log(
                    `[cancelExpiredOrders]   → Restocked product #${item.productId}: +${item.count} units (now: ${product.quantity}), -${item.count} sold (now: ${newSold})`,
                  );
                }
              }

              // ✅ ตรวจสอบว่าสินค้านี้เป็น Flash Sale หรือไม่
              const flashSaleItem = await queryRunner.manager
                .createQueryBuilder(FlashSaleItem, 'fsi')
                .innerJoin('fsi.flashSale', 'fs')
                .where('fsi.productId = :productId', { productId: item.productId })
                .andWhere('fs.isActive = :isActive', { isActive: true })
                .andWhere('fs.startTime <= :now', { now })
                .andWhere('fs.endTime >= :now', { now })
                .setLock('pessimistic_write')
                .getOne();

              if (flashSaleItem) {
                const currentSold = flashSaleItem.sold || 0;
                const newSold = Math.max(0, currentSold - item.count);
                await queryRunner.manager.update(
                  FlashSaleItem,
                  { id: flashSaleItem.id },
                  { sold: newSold },
                );

                this.logger.log(
                  `[cancelExpiredOrders]   → Restocked Flash Sale item #${flashSaleItem.id} (product #${item.productId}): -${item.count} sold (now: ${newSold}/${flashSaleItem.limitStock})`,
                );
              }
            } catch (itemError) {
              this.logger.error(
                `[cancelExpiredOrders] ❌ Error restocking item #${item.id} in order #${order.id}:`,
                itemError,
              );
              // ยังคงดำเนินการต่อกับสินค้าถัดไป
            }
          }
        }

        // 3. 💸 Trigger ระบบคืนเงิน (ถ้าจ่ายเงินแล้ว)
        // เช็คว่าจ่ายเงินแล้วหรือยัง (PENDING_CONFIRMATION = จ่ายเงินแล้ว หรือมี paymentSlipUrl)
        const isPaid = 
          order.orderStatus === OrderStatus.PENDING_CONFIRMATION || 
          (order.paymentSlipUrl !== null && order.paymentSlipUrl !== '');
        
        if (isPaid) {
          // เรียก processRefund() เพื่อตั้งค่า refundStatus = PENDING
          await this.processRefund(order, queryRunner);
        }

        // 4. Commit Transaction
        await queryRunner.commitTransaction();

        // 5. Log ข้อมูล
        this.logger.log(
          `[cancelExpiredOrders] ✅ Auto-cancelled order #${order.id} (confirmationDeadline: ${order.confirmationDeadline})`,
        );

        // 6. Send Notification (Fire-and-forget)
        if (order.orderedBy) {
          this.sendCancellationNotification(order).catch((err) => {
            this.logger.error(
              `[cancelExpiredOrders] Failed to send cancellation notification for order #${order.id}:`,
              err,
            );
          });
        }

        successCount++;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(
          `[cancelExpiredOrders] ❌ Error processing expired order #${order.id}:`,
          error,
        );
        errorCount++;
      } finally {
        await queryRunner.release();
      }
    }

    this.logger.log(
      `[cancelExpiredOrders] Completed: ${successCount} cancelled, ${errorCount} errors`,
    );

    return { cancelled: successCount, errors: errorCount };
  }

  /**
   * ✅ ระบบคืนเงิน (Refund System) - เมื่อออเดอร์ถูกยกเลิกและจ่ายเงินแล้ว
   * ใช้ใน Cron / Auto-cancel flow
   * - ถ้าเป็นช่องทางที่รองรับ Wallet → คืนเงินเข้า Wallet อัตโนมัติ
   * - ถ้าเป็นช่องทางอื่น → ตั้ง refundStatus เป็น PENDING ให้ไปจัดการภายนอก (เช่น คืนบัตร)
   */
  async processRefund(order: Order, queryRunner?: any): Promise<void> {
    try {
      // เช็คว่าจ่ายเงินแล้วหรือยัง (PaymentStatus = PAID ในเชิง Business)
      const isPaid =
        order.orderStatus === OrderStatus.PENDING_CONFIRMATION ||
        (order.paymentSlipUrl !== null && order.paymentSlipUrl !== '');

      if (!isPaid) {
        this.logger.debug(
          `[processRefund] Order #${order.id} was not paid (status: ${order.orderStatus}, slipUrl: ${order.paymentSlipUrl}), skipping refund`,
        );
        return;
      }

      const paymentMethod = (order.paymentMethod || '').toUpperCase();
      const supportsWalletRefund =
        paymentMethod === 'PROMPTPAY' ||
        paymentMethod === 'PROMPTPAY_QR' ||
        paymentMethod === 'QR' ||
        paymentMethod === 'QR_CODE' ||
        paymentMethod === 'BANK_TRANSFER';

      // ป้องกันการคืนเงินซ้ำ
      if (order.refundStatus === RefundStatus.APPROVED) {
        this.logger.debug(
          `[processRefund] Order #${order.id} already refunded (refundStatus: ${order.refundStatus}), skipping`,
        );
        return;
      }

      // ช่องทางที่รองรับการคืนเข้า Wallet → ดำเนินการคืนเงินอัตโนมัติ
      if (supportsWalletRefund) {
        try {
          const amount = Number(order.cartTotal || 0);
          if (amount <= 0) {
            this.logger.warn(
              `[processRefund] Order #${order.id} has non-positive amount (${order.cartTotal}), skip wallet refund`,
            );
            return;
          }

          await this.walletService.creditWallet(order.orderedById, {
            amount,
            type: WalletTransactionType.REFUND,
            referenceId: `ORDER-${order.id}`,
            description: `Refund for Order #${order.id}`,
          });

          const updateData: Partial<Order> = {
            refundStatus: RefundStatus.APPROVED,
            refundDate: new Date(),
          };

          if (queryRunner) {
            await queryRunner.manager.update(Order, { id: order.id }, updateData);
          } else {
            await this.orderRepository.update({ id: order.id }, updateData);
          }

          this.logger.log(
            `💰 [processRefund] Refunded ${amount} THB to wallet for Order #${order.id} (paymentMethod: ${paymentMethod})`,
          );
        } catch (walletError) {
          this.logger.error(
            `❌ [processRefund] Wallet refund failed for Order #${order.id}:`,
            walletError,
          );
          // ไม่ throw เพื่อไม่ให้ transaction หลักพัง (โดยเฉพาะใน Cron)
        }
        return;
      }

      // ช่องทางอื่นที่ต้องคืนเงินภายนอก (เช่น บัตร) → ตั้ง refundStatus เป็น PENDING
      if (order.refundStatus === RefundStatus.NONE) {
        const updateData: any = {
          refundStatus: RefundStatus.PENDING,
        };

        if (queryRunner) {
          await queryRunner.manager.update(Order, { id: order.id }, updateData);
        } else {
          await this.orderRepository.update({ id: order.id }, updateData);
        }

        this.logger.log(
          `💰 [processRefund] Refund Request created for Order #${order.id} (Amount: ${order.cartTotal} THB, Status: PENDING, paymentMethod: ${paymentMethod})`,
        );
      } else {
        this.logger.debug(
          `[processRefund] Order #${order.id} already has refundStatus: ${order.refundStatus}, skipping`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ [processRefund] Error processing refund for Order #${order.id}:`,
        error,
      );
      // Don't throw - ให้ transaction ทำงานต่อได้
    }
  }

  /**
   * ✅ Manual Refund → Admin เรียกใช้งานเพื่อคืนเงินเข้า Wallet
   */
  async refundToWallet(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    const isPaid =
      order.orderStatus === OrderStatus.PENDING_CONFIRMATION ||
      (order.paymentSlipUrl !== null && order.paymentSlipUrl !== '');

    if (!isPaid) {
      throw new BadRequestException(
        `Order #${order.id} is not paid, cannot refund to wallet`,
      );
    }

    const paymentMethod = (order.paymentMethod || '').toUpperCase();
    const supportsWalletRefund =
      paymentMethod === 'PROMPTPAY' ||
      paymentMethod === 'PROMPTPAY_QR' ||
      paymentMethod === 'QR' ||
      paymentMethod === 'QR_CODE' ||
      paymentMethod === 'BANK_TRANSFER';

    if (!supportsWalletRefund) {
      throw new BadRequestException(
        `Payment method ${paymentMethod || 'UNKNOWN'} does not support wallet refund`,
      );
    }

    if (order.refundStatus === RefundStatus.APPROVED) {
      throw new BadRequestException(
        `Order #${order.id} has already been refunded`,
      );
    }

    const amount = Number(order.cartTotal || 0);
    if (amount <= 0) {
      throw new BadRequestException(
        `Order #${order.id} has non-positive amount (${order.cartTotal}), cannot refund`,
      );
    }

    await this.walletService.creditWallet(order.orderedById, {
      amount,
      type: WalletTransactionType.REFUND,
      referenceId: `ORDER-${order.id}`,
      description: `Refund for Order #${order.id}`,
    });

    order.refundStatus = RefundStatus.APPROVED;
    order.refundDate = new Date();

    const saved = await this.orderRepository.save(order);

    this.logger.log(
      `💰 [refundToWallet] Manually refunded ${amount} THB to wallet for Order #${order.id} (paymentMethod: ${paymentMethod})`,
    );

    return saved;
  }

  // ✅ Helper: Send Cancellation Notification
  private async sendCancellationNotification(order: Order): Promise<void> {
    try {
      let user: User | null = null;
      if (order.orderedBy) {
        user = order.orderedBy;
      } else {
        user = await this.userRepository.findOne({
          where: { id: order.orderedById },
        });
      }

      if (!user) {
        this.logger.warn(
          `User not found for order #${order.id}, skipping notification`,
        );
        return;
      }

      const settings = await this.notificationSettingsService.findMySettings(
        user.id,
      );

      if (settings && !settings.orderUpdate) {
        this.logger.debug(
          `User #${user.id} has disabled order update notifications`,
        );
        return;
      }

      await this.notificationsService.sendAndSave(
        user,
        'คำสั่งซื้อถูกยกเลิก',
        `คำสั่งซื้อ #${order.id} ถูกยกเลิกอัตโนมัติ เนื่องจากร้านค้าไม่ยืนยันรับออเดอร์ภายใน 24 ชั่วโมง ระบบจะคืนเงินให้อัตโนมัติ`,
        'ORDER_CANCELLED',
        {
          url: `gtxshop://order/${order.id}`,
          orderId: order.id,
        },
      );

      this.logger.log(
        `Cancellation notification sent to user #${user.id} for order #${order.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending cancellation notification for order #${order.id}:`,
        error,
      );
    }
  }
}

