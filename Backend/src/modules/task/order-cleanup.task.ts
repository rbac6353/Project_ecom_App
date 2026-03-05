import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import {
  Order,
  OrderStatus,
  RefundStatus,
  ProductOnOrder,
  Product,
  ProductVariant,
  FlashSaleItem,
  User,
} from '@core/database/entities';
import { NotificationsService } from '@modules/notification/notifications.service';
import { NotificationSettingsService } from '@modules/notification-setting/notification-settings.service';
import { OrdersService } from '@modules/order/orders.service';

@Injectable()
export class OrderTasksService {
  private readonly logger = new Logger(OrderTasksService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(ProductOnOrder)
    private productOnOrderRepo: Repository<ProductOnOrder>,
    @InjectRepository(FlashSaleItem)
    private flashSaleItemRepo: Repository<FlashSaleItem>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly notificationSettingsService: NotificationSettingsService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService, // ✅ Inject OrdersService เพื่อเรียกใช้ cancelExpiredOrders()
  ) {}

  // ✅ ระบบ Auto-Complete หลังจากส่งของแล้ว 7 วัน
  // รันทุกวัน เที่ยงคืน (00:00)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoCompleteOrders() {
    this.logger.log('Starting auto-complete orders task...');
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // หาออเดอร์ที่ "ส่งแล้ว" (SHIPPED หรือ DELIVERED) 
    // และอัปเดตล่าสุดนานกว่า 7 วัน (ใช้ updatedAt เพราะเมื่อร้านกดส่งจะอัปเดต updatedAt)
    const ordersToComplete = await this.orderRepo.find({
      where: [
        {
          orderStatus: OrderStatus.SHIPPED,
          updatedAt: LessThan(sevenDaysAgo),
        },
        {
          orderStatus: OrderStatus.DELIVERED,
          updatedAt: LessThan(sevenDaysAgo),
        },
      ],
    });

    if (ordersToComplete.length > 0) {
      this.logger.log(`Found ${ordersToComplete.length} orders to auto-complete.`);

      for (const order of ordersToComplete) {
        order.orderStatus = OrderStatus.COMPLETED;
        order.receivedAt = new Date(); // ถือว่าได้รับวันนี้
        await this.orderRepo.save(order);
        this.logger.log(`Auto-completed order #${order.id}`);
      }

      this.logger.log(`Successfully auto-completed ${ordersToComplete.length} orders.`);
    } else {
      this.logger.log('No orders to auto-complete.');
    }
  }

  // ✅ ระบบ Auto-Restock สำหรับออเดอร์ที่ไม่ยอมจ่ายเงิน
  // รันทุก 1 นาที เพื่อตรวจสอบออเดอร์ที่หมดเวลาชำระเงิน
  @Cron(CronExpression.EVERY_MINUTE) // ทุก 1 นาที
  async handleCron() {
    this.logger.log('Starting auto-restock expired orders task...');

    const now = new Date();
    // ตั้งค่าเวลาหมดอายุ: 15 นาที (สำหรับ production)
    // ใช้ paymentExpiredAt แทน createdAt เพื่อให้ตรงกับเวลาที่กำหนดไว้ตอนสร้าง order
      const expiredOrders = await this.orderRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.productOnOrders', 'productOnOrders')
        .leftJoinAndSelect('productOnOrders.product', 'product')
        .leftJoinAndSelect('productOnOrders.variant', 'variant')
        .leftJoinAndSelect('order.orderedBy', 'orderedBy') // ✅ Join User เพื่อส่ง notification
        .where('order.orderStatus IN (:...statuses)', {
          statuses: [OrderStatus.PENDING, OrderStatus.VERIFYING],
        })
        .andWhere(
          '(order.paymentExpiredAt IS NOT NULL AND order.paymentExpiredAt < :now) OR (order.paymentExpiredAt IS NULL AND order.createdAt < :expiryTime)',
          {
            now,
            expiryTime: new Date(now.getTime() - 15 * 60 * 1000), // Fallback: 15 นาทีถ้าไม่มี paymentExpiredAt
          },
        )
        .getMany();

    if (expiredOrders.length === 0) {
      this.logger.log('No expired orders to restock.');
      return;
    }

    this.logger.log(
      `Found ${expiredOrders.length} expired orders to cancel and restock.`,
    );

    let successCount = 0;
    let errorCount = 0;

    // Loop ผ่าน Order ที่หมดอายุทีละรายการ
    for (const order of expiredOrders) {
      // ใช้ Transaction (queryRunner) เพื่อความปลอดภัยของข้อมูล
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // อัปเดตสถานะ Order เป็น 'CANCELLED'
        await queryRunner.manager.update(Order, { id: order.id }, { orderStatus: OrderStatus.CANCELLED });

        // Loop ผ่านสินค้าในตะกร้า (ProductOnOrder)
        // ✅ หมายเหตุ: ระบบใหม่ใช้ "Reserve Stock on Creation"
        // - ตัดสต็อกทันทีเมื่อสร้าง Order (PENDING)
        // - ถ้า Order หมดอายุ (PENDING ที่หมดเวลา) ต้องคืนสต็อก
        // - ถ้าออเดอร์ชำระเงินสำเร็จแล้ว (PROCESSING หรือสูงกว่า) แล้วถูกยกเลิก ต้องคืนสต็อก
        
        // ✅ ตรวจสอบว่าต้องคืนสต็อกหรือไม่
        // - PENDING/VERIFYING ที่หมดเวลา: ต้องคืนสต็อก (เพราะตัดสต็อกตอนสร้าง Order แล้ว)
        // - PROCESSING หรือสูงกว่า: ต้องคืนสต็อก (เพราะชำระเงินแล้ว)
        const shouldRestock = order.orderStatus === OrderStatus.PENDING || 
                              order.orderStatus === OrderStatus.VERIFYING ||
                              order.orderStatus === OrderStatus.PROCESSING || 
                              order.orderStatus === OrderStatus.PENDING_CONFIRMATION ||
                              order.orderStatus === OrderStatus.READY_FOR_PICKUP ||
                              order.orderStatus === OrderStatus.SHIPPED ||
                              order.orderStatus === OrderStatus.DELIVERED;
        
        if (shouldRestock && order.productOnOrders && order.productOnOrders.length > 0) {
          this.logger.log(`  → Order #${order.id} (status: ${order.orderStatus}), restocking items...`);
          
          // ✅ Sort items by ID เพื่อป้องกัน Deadlock
          const sortedItems = [...order.productOnOrders].sort((a, b) => a.id - b.id);
          
          for (const item of sortedItems) {
            try {
              // ✅ ถ้ามี Variant ให้คืนสต็อกที่ Variant ก่อน
              if (item.variantId) {
                const variant = await queryRunner.manager.findOne(ProductVariant, {
                  where: { id: item.variantId },
                  lock: { mode: 'pessimistic_write' }, // 🔒 Lock เพื่อป้องกัน concurrent access
                });
                if (variant) {
                  variant.stock += item.count;
                  await queryRunner.manager.save(variant);
                  this.logger.log(
                    `  → Restocked variant #${item.variantId}: +${item.count} units (now: ${variant.stock})`,
                  );
                }
              } else {
                // ✅ คืนสต็อกสินค้าหลัก: บวก `product.quantity` กลับคืน
                const product = await queryRunner.manager.findOne(Product, {
                  where: { id: item.productId },
                  lock: { mode: 'pessimistic_write' }, // 🔒 Lock เพื่อป้องกัน concurrent access
                });

                if (product) {
                  // คืนสต็อกสินค้าหลัก
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
                    `  → Restocked product #${item.productId}: +${item.count} units (now: ${product.quantity}), -${item.count} sold (now: ${newSold})`,
                  );
                }
              }

              // ✅ ตรวจสอบว่าสินค้านี้เป็น Flash Sale หรือไม่
              // หา Flash Sale Item ที่ตรงกับ productId และยัง Active อยู่
              const flashSaleItem = await queryRunner.manager
                .createQueryBuilder(FlashSaleItem, 'fsi')
                .innerJoin('fsi.flashSale', 'fs')
                .where('fsi.productId = :productId', { productId: item.productId })
                .andWhere('fs.isActive = :isActive', { isActive: true })
                .andWhere('fs.startTime <= :now', { now })
                .andWhere('fs.endTime >= :now', { now })
                .setLock('pessimistic_write') // 🔒 Lock เพื่อป้องกัน concurrent access
                .getOne();

              if (flashSaleItem) {
                // ✅ คืนสต็อกในตาราง `FlashSaleItem` (ลด `sold` ใน flash_sale_item)
                // ใช้ Atomic Update เพื่อความปลอดภัย และป้องกันไม่ให้ sold ติดลบ
                const currentSold = flashSaleItem.sold || 0;
                const newSold = Math.max(0, currentSold - item.count);
                await queryRunner.manager.update(
                  FlashSaleItem,
                  { id: flashSaleItem.id },
                  { sold: newSold },
                );

                this.logger.log(
                  `  → Restocked Flash Sale item #${flashSaleItem.id} (product #${item.productId}): -${item.count} sold (now: ${newSold}/${flashSaleItem.limitStock})`,
                );
              }
            } catch (itemError) {
              // Error Handling ใน Loop เพื่อไม่ให้ Cron Job พังถ้าสินค้าเดียวมีปัญหา
              this.logger.error(
                `❌ Error restocking item #${item.id} in order #${order.id}:`,
                itemError,
              );
              // ยังคงดำเนินการต่อกับสินค้าถัดไป
            }
          }
        } else {
          this.logger.log(`  → Order #${order.id} was not paid (status: ${order.orderStatus}), no stock to restock`);
        }

        // Commit Transaction ถ้าทุกอย่างสำเร็จ
        await queryRunner.commitTransaction();

        // ✅ Send Notification: Auto-Cancellation
        // Fire-and-forget: ไม่ให้ notification error ทำให้ transaction พัง
        // ต้องส่งหลังจาก commit transaction แล้ว
        this.sendCancellationNotification(order).catch((err) => {
          this.logger.error(
            `Failed to send cancellation notification for order #${order.id}:`,
            err,
          );
        });

        // บันทึก Log ว่าได้ยกเลิกออเดอร์ ID ไหนไปบ้าง
        const expiryInfo = order.paymentExpiredAt
          ? `paymentExpiredAt: ${order.paymentExpiredAt}`
          : `createdAt: ${order.createdAt} (fallback: 15 minutes)`;
        this.logger.log(
          `✅ Auto-cancelled and restocked order #${order.id} (${expiryInfo})`,
        );
        successCount++;
      } catch (error) {
        // Rollback Transaction ถ้ามี error
        await queryRunner.rollbackTransaction();
        this.logger.error(`❌ Error processing expired order #${order.id}:`, error);
        errorCount++;
      } finally {
        // Release QueryRunner
        await queryRunner.release();
      }
    }

    this.logger.log(
      `Auto-restock completed: ${successCount} successful, ${errorCount} errors`,
    );
  }

  // ✅ Helper: Send Cancellation Notification
  private async sendCancellationNotification(order: Order): Promise<void> {
    try {
      // ดึงข้อมูล User (ถ้ายังไม่มีใน order.orderedBy)
      let user: User | null = null;
      if (order.orderedBy) {
        user = order.orderedBy;
      } else {
        user = await this.userRepo.findOne({
          where: { id: order.orderedById },
        });
      }

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
        'คำสั่งซื้อถูกยกเลิก',
        `คำสั่งซื้อ #${order.id} ถูกยกเลิกอัตโนมัติ เนื่องจากเกินเวลาชำระเงินที่กำหนด`,
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
      // Don't throw - this is fire-and-forget
    }
  }

  // ✅ ระบบ Auto-Cancellation สำหรับออเดอร์ที่ร้านค้าไม่ยืนยันภายใน 24 ชั่วโมง
  // รันทุก 1 นาที เพื่อตรวจสอบออเดอร์ที่หมดเวลายืนยัน
  @Cron(CronExpression.EVERY_MINUTE) // ทุก 1 นาที
  async handleExpiredConfirmationOrders() {
    this.logger.debug('⏳ [OrderTasksService] Checking for expired confirmation orders...');
    
    try {
      // ใช้ cancelExpiredOrders() ที่มี logic ครบแล้ว (รวมถึง processRefund())
      const result = await this.ordersService.cancelExpiredOrders();
      
      if (result.cancelled > 0 || result.errors > 0) {
        this.logger.log(
          `✅ [OrderTasksService] Expired confirmation check completed: ${result.cancelled} cancelled, ${result.errors} errors`,
        );
      }
    } catch (error) {
      this.logger.error(
        '❌ [OrderTasksService] Error in handleExpiredConfirmationOrders:',
        error,
      );
    }
  }
}

