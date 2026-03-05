import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Order,
  ProductOnOrder,
  Product,
  ProductVariant,
  FlashSaleItem,
  User,
} from '@core/database/entities';
import { OrderTasksService } from './order-cleanup.task';
import { NotificationsModule } from '@modules/notification/notifications.module';
import { NotificationSettingsModule } from '@modules/notification-setting/notification-settings.module';
import { OrdersModule } from '@modules/order/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      ProductOnOrder,
      Product,
      ProductVariant,
      FlashSaleItem,
      User,
    ]),
    NotificationsModule,
    NotificationSettingsModule,
    forwardRef(() => OrdersModule), // ✅ ใช้ forwardRef เพื่อแก้ Circular Dependency
  ],
  providers: [OrderTasksService],
})
export class TasksModule {}

