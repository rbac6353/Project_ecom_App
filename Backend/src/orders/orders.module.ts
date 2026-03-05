import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { InvoiceService } from './invoice.service'; // ✅ Import InvoiceService
import { Order } from '../entities/order.entity';
import { ProductOnOrder } from '../entities/product-on-order.entity';
import { Cart } from '../entities/cart.entity';
import { ProductOnCart } from '../entities/product-on-cart.entity';
import { Coupon } from '../entities/coupon.entity';
import { User } from '../entities/user.entity';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity'; // ✅ Import ProductVariant
import { Shipment } from '../entities/shipment.entity'; // ✅ Import Shipment
import { NotificationsModule } from '../notifications/notifications.module';
import { CouponsModule } from '../coupons/coupons.module';
import { UsersModule } from '../users/users.module';
import { StoresModule } from '../stores/stores.module';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module'; // ✅ Import CloudinaryModule
import { ShipmentsModule } from '../shipments/shipments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      ProductOnOrder,
      Cart,
      ProductOnCart,
      Coupon,
      User,
      Product,
      ProductVariant, // ✅ เพิ่ม ProductVariant
      Shipment, // ✅ เพิ่ม Shipment
    ]),
    NotificationsModule, // เพิ่ม NotificationsModule
    CouponsModule, // เพิ่ม CouponsModule
    UsersModule, // ✅ เพิ่ม UsersModule
    StoresModule, // ✅ เพิ่ม StoresModule
    NotificationSettingsModule, // ✅ เพิ่ม NotificationSettingsModule
    CloudinaryModule, // ✅ เพิ่ม CloudinaryModule
    ShipmentsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, InvoiceService], // ✅ เพิ่ม InvoiceService
  exports: [OrdersService],
})
export class OrdersModule {}

