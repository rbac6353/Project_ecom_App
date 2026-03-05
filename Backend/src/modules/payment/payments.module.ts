import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { SmsWebhookController } from './sms-webhook.controller';
import { OrdersModule } from '@modules/order/orders.module';

@Module({
  imports: [
    ConfigModule, // Import ConfigModule เพื่อใช้ ConfigService ใน PaymentsService
    HttpModule.register({
      timeout: 30000, // 30 seconds
      maxRedirects: 5,
    }),
    forwardRef(() => OrdersModule), // ✅ ใช้ forwardRef เพื่อแก้ Circular Dependency
  ],
  controllers: [PaymentsController, SmsWebhookController],
  providers: [PaymentsService],
  exports: [PaymentsService], // Export PaymentsService เพื่อให้ module อื่นเรียกใช้ได้
})
export class PaymentsModule {}

