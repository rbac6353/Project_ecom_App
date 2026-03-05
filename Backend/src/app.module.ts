import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { MailerModule } from '@nestjs-modules/mailer';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { join } from 'path';
import { validateEnv } from './config/validation.schema';

// ⭐ Import DatabaseModule แทน TypeOrmModule
import { DatabaseModule } from '@core/database';
import { AuthModule } from '@core/auth';
// ⭐ Import Configurations
import configurations from '@config/index';
import { UsersModule } from './modules/user/users.module';
import { ProductsModule } from './modules/product/products.module';
import { CategoriesModule } from './modules/category/categories.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/order/orders.module';
import { ReviewsModule } from './modules/review/reviews.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { PaymentsModule } from './modules/payment/payments.module';
import { CouponsModule } from './modules/coupon/coupons.module';
import { StoresModule } from './modules/store/stores.module';
import { AdminLogsModule } from './modules/admin/admin-logs.module';
import { ChatModule } from './modules/chat/chat.module';
import { FaqsModule } from './modules/faq/faqs.module';
import { NotificationSettingsModule } from './modules/notification-setting/notification-settings.module';
import { NotificationsModule } from './modules/notification/notifications.module';
import { BannersModule } from './modules/banner/banners.module';
import { ReturnsModule } from './modules/return/returns.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from './modules/task/tasks.module';
import { ShipmentsModule } from './modules/shipment/shipments.module';
import { HealthModule } from './modules/health/health.module';
import { FlashSaleModule } from './modules/flash-sale/flash-sale.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { StoreWalletModule } from './modules/store-wallet/store-wallet.module';
import { AiModule } from './modules/ai/ai.module';

// ✅ Validate environment variables on startup
validateEnv();

@Module({
  imports: [
    ScheduleModule.forRoot(), // ✅ เพิ่ม ScheduleModule สำหรับ Cron Jobs
    ConfigModule.forRoot({
      isGlobal: true,
      // โหลด .env: รองรับทั้งรันจาก src (dev) และจาก dist (build) — dist มีโครงสร้าง dist/src จึงต้องขึ้น 2 ระดับถึง Backend/
      envFilePath: [
        join(__dirname, '..', '..', '.env'), // เมื่อรันจาก dist/src → โหลด Backend/.env
        join(__dirname, '..', '.env'),        // เมื่อรันจาก src หรือ dist
        join(process.cwd(), '.env'),          // จาก current working directory (รันจากโฟลเดอร์ Backend)
        '.env',
      ],
      load: configurations, // ⭐ โหลดไฟล์ config ทั้งหมด
    }),

    // ⭐ Database Module (ใหม่)
    DatabaseModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('mail.host'),
          port: configService.get('mail.port'),
          secure: false, // true for 465, false for other ports
          auth: {
            user: configService.get('mail.user'),
            pass: configService.get('mail.password'),
          },
        },
        defaults: {
          from: configService.get('mail.from'),
        },
        template: {
          dir: join(__dirname, 'mail/templates'), // path ที่เก็บไฟล์ .ejs
          adapter: new EjsAdapter(),
          options: {
            strict: false, // ✅ เปลี่ยนเป็น false เพื่อให้ template ไม่ error เมื่อตัวแปรไม่มีค่า
          },
        },
      }),
    }),
    // ตั้งค่า Rate Limit (Global) - ป้องกัน DDoS/Spam
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 วินาที (1 นาที)
      limit: 20,  // ยิงได้สูงสุด 20 ครั้งต่อ IP
    }]),
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    WishlistModule,
    PaymentsModule,
    CouponsModule,
    StoresModule,
    AdminLogsModule,
    ChatModule,
    FaqsModule,
    NotificationSettingsModule,
    NotificationsModule,
    BannersModule,
    ReturnsModule,
    TasksModule, // ✅ เพิ่ม TasksModule สำหรับ Cron Jobs
    ShipmentsModule, // ✅ โมดูลสำหรับระบบขนส่ง
    HealthModule, // ✅ Health Check Module
    FlashSaleModule, // ✅ Flash Sale Module
    WalletModule, // ✅ Wallet Module
    StoreWalletModule, // ✅ Store Wallet Module
    AiModule, // ✅ AI Product Assistant (Gemini)
  ],
  providers: [
    // ✅ เปิดใช้งาน Rate Limiting (Global Guard)
    // ⚠️  หมายเหตุ: สามารถใช้ @SkipThrottle() ใน controller/route ที่ต้องการยกเว้น
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }

