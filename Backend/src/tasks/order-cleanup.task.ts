import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';

@Injectable()
export class OrderTasksService {
  private readonly logger = new Logger(OrderTasksService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
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
}

