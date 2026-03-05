import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { InvoiceService } from './invoice.service'; // ✅ Import InvoiceService
import { Order, ProductOnOrder, Cart, ProductOnCart, Coupon, User, Product, ProductVariant, Shipment, Image } from '@core/database/entities';
import { NotificationsModule } from '@modules/notification/notifications.module';
import { CouponsModule } from '@modules/coupon/coupons.module';
import { UsersModule } from '@modules/user/users.module';
import { StoresModule } from '@modules/store/stores.module';
import { NotificationSettingsModule } from '@modules/notification-setting/notification-settings.module';
import { CloudinaryModule } from '@modules/storage/cloudinary.module';
import { ShipmentsModule } from '@modules/shipment/shipments.module';
import { FlashSaleModule } from '@modules/flash-sale/flash-sale.module';
import { PaymentsModule } from '@modules/payment/payments.module'; // ✅ Import PaymentsModule
import { AdminLogsModule } from '@modules/admin/admin-logs.module'; // ✅ Import AdminLogsModule
import { WalletModule } from '@modules/wallet/wallet.module'; // ✅ Import WalletModule
import { StoreWalletModule } from '@modules/store-wallet/store-wallet.module'; // ✅ Import StoreWalletModule

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
      Image, // ✅ เพิ่ม Image เพื่อแก้ปัญหารูปภาพไม่ขึ้น
    ]),
    NotificationsModule, // เพิ่ม NotificationsModule
    CouponsModule, // เพิ่ม CouponsModule
    UsersModule, // ✅ เพิ่ม UsersModule
    StoresModule, // ✅ เพิ่ม StoresModule
    NotificationSettingsModule, // ✅ เพิ่ม NotificationSettingsModule
    CloudinaryModule, // ✅ เพิ่ม CloudinaryModule
    ShipmentsModule,
    FlashSaleModule, // ✅ เพิ่ม FlashSaleModule
    forwardRef(() => PaymentsModule), // ✅ ใช้ forwardRef เพื่อแก้ Circular Dependency
    AdminLogsModule, // ✅ เพิ่ม AdminLogsModule เพื่อใช้ AdminLogsService
    WalletModule, // ✅ เพิ่ม WalletModule เพื่อใช้ WalletService
    StoreWalletModule, // ✅ เพิ่ม StoreWalletModule เพื่อเครดิตรายได้ให้ร้านค้า
  ],
  controllers: [OrdersController],
  providers: [OrdersService, InvoiceService], // ✅ เพิ่ม InvoiceService
  exports: [OrdersService],
})
export class OrdersModule { }

