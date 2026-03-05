import { Controller, Post, Get, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '@core/auth';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('intent')
  createIntent(@Body() body: { amount: number }) {
    return this.paymentsService.createPaymentIntent(body.amount);
  }

  /**
   * สร้าง QR Code สำหรับ PromptPay
   * GET /payments/qr-code?amount=1000
   * @param amount จำนวนเงิน (บาท) - query parameter
   * @returns QR Code payload string (EMV QR Code format)
   */
  @UseGuards(JwtAuthGuard)
  @Get('qr-code')
  async getQRCode(@Query('amount') amount: string) {
    // Validate amount
    if (!amount) {
      throw new BadRequestException('Amount is required');
    }

    const amountNumber = parseFloat(amount);
    
    if (isNaN(amountNumber) || amountNumber <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    try {
      // สร้าง payload string สำหรับ QR Code (ไม่ใช่ Data URL)
      const payload = this.paymentsService.generatePromptPayPayload(amountNumber);
      
      if (!payload || typeof payload !== 'string') {
        throw new BadRequestException('Failed to generate QR payload');
      }
      
      console.log(`✅ Generated QR payload for amount: ${amountNumber}, payload length: ${payload.length}`);
      
      return {
        success: true,
        payload: payload, // EMV QR Code payload string (ใช้กับ QRCode component)
        qrCode: await this.paymentsService.generatePromptPayQR(amountNumber), // Data URL สำหรับแสดงผล (optional)
        amount: amountNumber,
      };
    } catch (error) {
      console.error('❌ Error generating QR code:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to generate QR code',
      );
    }
  }
}

