import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { OrdersService } from '@modules/order/orders.service';
import { SmsWebhookDto } from './dto/sms-webhook.dto';

/**
 * SMS Webhook Controller
 * รับ SMS จาก Mobile App และจับคู่กับออเดอร์ที่รอชำระเงิน
 */
@Controller('payments/webhook')
export class SmsWebhookController {
  private readonly logger = new Logger(SmsWebhookController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    @Inject(forwardRef(() => OrdersService)) // ✅ ใช้ forwardRef เพื่อแก้ Circular Dependency
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * POST /payments/webhook/sms
   * รับ SMS Webhook จาก Mobile App
   * 
   * Headers:
   * - X-API-KEY: SMS_SECRET_KEY (สำหรับ authentication)
   * 
   * Body:
   * {
   *   "sender": "KBANK",
   *   "message": "คุณได้รับโอนเงิน 500.00 บาท จากนายทดสอบ เวลา 12:00 น.",
   *   "timestamp": "2024-01-01T12:00:00Z" (optional)
   * }
   */
  @Post('sms')
  @HttpCode(HttpStatus.OK)
  async handleSmsWebhook(
    @Body() body: SmsWebhookDto,
    @Headers('x-api-key') apiKey: string,
  ) {
    // ✅ 1. ตรวจสอบ API Key (Security)
    const expectedApiKey = this.configService.get<string>('SMS_SECRET_KEY');
    
    if (!expectedApiKey) {
      this.logger.error('SMS_SECRET_KEY is not configured in environment variables');
      throw new BadRequestException('SMS webhook is not configured');
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      this.logger.warn(
        `⚠️ Invalid API Key attempt: ${apiKey ? apiKey.substring(0, 10) + '...' : 'missing'}`,
      );
      throw new BadRequestException('Invalid API Key');
    }

    // ✅ 2. Validate Request Body
    if (!body.sender || !body.message) {
      throw new BadRequestException('Missing required fields: sender, message');
    }

    // ✅ 3. Parse SMS Message เพื่อดึงยอดเงิน
    const amount = this.paymentsService.parseSmsAmount(
      body.message,
      body.sender,
    );

    if (!amount || amount <= 0) {
      this.logger.warn(
        `⚠️ Could not parse amount from SMS (${body.sender}): ${body.message.substring(0, 100)}`,
      );
      return {
        success: false,
        message: 'Could not parse amount from SMS message',
        parsedAmount: null,
      };
    }

    this.logger.log(
      `✅ Received SMS from ${body.sender}: ${amount} THB`,
    );

    // ✅ 4. จับคู่ยอดเงินกับออเดอร์ที่รอชำระเงิน
    // หมายเหตุ: ไม่ระบุ userId เพื่อให้ค้นหาทั้งหมด (รองรับกรณีหลายออเดอร์)
    // ถ้าต้องการให้เฉพาะ user ที่ส่ง SMS ให้เพิ่ม userId ใน body
    const matchedOrder = await this.ordersService.matchOrderByAmount(amount);

    if (!matchedOrder) {
      this.logger.warn(
        `⚠️ No matching order found for amount ${amount} THB`,
      );
      return {
        success: false,
        message: 'No matching order found for this amount',
        parsedAmount: amount,
        matchedOrderId: null,
      };
    }

    // ✅ 5. อัปเดตสถานะออเดอร์เป็น "ชำระเงินแล้ว"
    try {
      const updatedOrder = await this.ordersService.confirmPaymentFromSms(
        matchedOrder.id,
        body.sender,
      );

      this.logger.log(
        `✅ Order #${matchedOrder.id} payment confirmed via SMS from ${body.sender}. Status: ${updatedOrder.orderStatus}`,
      );

      return {
        success: true,
        message: 'Payment confirmed successfully',
        parsedAmount: amount,
        matchedOrderId: matchedOrder.id,
        orderStatus: updatedOrder.orderStatus,
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Error confirming payment for order #${matchedOrder.id}: ${error.message}`,
      );
      
      return {
        success: false,
        message: error.message || 'Failed to confirm payment',
        parsedAmount: amount,
        matchedOrderId: matchedOrder.id,
        error: error.message,
      };
    }
  }
}
