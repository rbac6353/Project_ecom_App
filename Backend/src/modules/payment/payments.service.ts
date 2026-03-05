import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import Stripe from 'stripe';
import * as QRCode from 'qrcode';
import generatePayload = require('promptpay-qr');
import FormData from 'form-data';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);
  private readonly EASYSLIP_TIMEOUT = 10000; // 10 seconds
  private readonly EASYSLIP_MAX_RETRIES = 2; // Retry up to 2 times

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    // โหลดจาก payment config, ConfigService (flat), หรือ process.env
    const secretKey =
      this.configService.get<string>('payment.stripeSecretKey') ||
      this.configService.get<string>('STRIPE_SECRET_KEY') ||
      process.env.STRIPE_SECRET_KEY ||
      '';
    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not set. Add it to Backend/.env to enable Stripe payments. See https://stripe.com/docs/api#authentication',
      );
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover', // ใช้ version ที่ Stripe library รองรับ
    });
  }

  // สร้าง Payment Intent (ขออนุญาตตัดเงิน)
  async createPaymentIntent(amount: number, currency: string = 'thb') {
    const secretKey =
      this.configService.get<string>('payment.stripeSecretKey') ||
      this.configService.get<string>('STRIPE_SECRET_KEY') ||
      process.env.STRIPE_SECRET_KEY;

    this.logger.log(`createPaymentIntent called, amount=${amount}, hasStripeKey=${!!secretKey}`);

    if (!secretKey) {
      this.logger.error('STRIPE_SECRET_KEY is empty when creating PaymentIntent');
      throw new BadRequestException(
        'Stripe is not configured. Please add STRIPE_SECRET_KEY to Backend .env file. See https://stripe.com/docs/api#authentication',
      );
    }

    try {
      const stripe = new Stripe(secretKey, { apiVersion: '2025-11-17.clover' });
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency,
        automatic_payment_methods: { enabled: true },
      });
      this.logger.log('PaymentIntent created successfully');
      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (err: any) {
      this.logger.error(`Stripe createPaymentIntent failed: ${err?.message || err}`);
      const isAuthError = err?.message?.includes('API key') || err?.code === 'invalid_api_key';
      if (isAuthError) {
        throw new BadRequestException(
          'ไม่สามารถเชื่อมต่อ Stripe ได้ (API key ไม่ถูกต้องหรือไม่มี) — ตรวจสอบ Backend/.env ว่ามี STRIPE_SECRET_KEY แล้ว restart Backend',
        );
      }
      throw new BadRequestException(
        err?.message && typeof err.message === 'string' ? err.message : 'Stripe payment failed. Please try again.',
      );
    }
  }

  /**
   * ดึง PROMPTPAY_ID จาก config
   */
  getPromptPayId(): string | null {
    return this.configService.get<string>('payment.promptpayId') || null;
  }

  /**
   * สร้าง Payload string สำหรับ PromptPay QR Code
   * @param amount จำนวนเงิน (บาท)
   * @returns Payload string (EMV QR Code format)
   */
  generatePromptPayPayload(amount: number): string {
    const promptpayId = this.getPromptPayId();
    if (!promptpayId) {
      throw new BadRequestException('PROMPTPAY_ID is not configured');
    }
    return generatePayload(promptpayId, { amount });
  }

  /**
   * สร้าง QR Code สำหรับ PromptPay
   * @param amount จำนวนเงิน (บาท)
   * @returns QR Code Data URL (Base64 string)
   */
  async generatePromptPayQR(amount: number): Promise<string> {
    try {
      // อ่าน PROMPTPAY_ID จาก config
      const promptpayId = this.configService.get<string>('payment.promptpayId');
      
      if (!promptpayId) {
        throw new BadRequestException('PROMPTPAY_ID is not configured');
      }

      // ใช้ promptpay-qr สร้าง payload
      const payload = generatePayload(promptpayId, { amount });

      // ใช้ qrcode แปลง payload เป็น Data URL (Base64 string)
      const qrCodeDataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating PromptPay QR:', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to generate PromptPay QR Code',
      );
    }
  }

  /**
   * ตรวจสอบสลิปโอนเงินผ่าน EasySlip API
   * @param fileBuffer ไฟล์รูปภาพสลิป (Buffer)
   * @param orderTotal ยอดเงินที่ต้องตรวจสอบ (บาท)
   * @returns ผลลัพธ์การตรวจสอบ (แยกแยะระหว่าง Verification Failed กับ API Error)
   */
  async verifySlip(
    fileBuffer: Buffer,
    orderTotal: number,
  ): Promise<{
    success: boolean;
    isApiError?: boolean; // true = API ล่ม/Timeout, false = ตรวจสอบแล้วไม่ผ่าน
    details?: any;
    error?: string;
  }> {
    // อ่าน EASYSLIP_API_KEY จาก config
    const easyslipApiKey = this.configService.get<string>('payment.easyslipApiKey');
    
    if (!easyslipApiKey) {
      throw new BadRequestException('EASYSLIP_API_KEY is not configured');
    }

    // สร้าง FormData และ append ไฟล์รูปภาพ
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: 'slip.jpg',
      contentType: 'image/jpeg',
    });

    // ✅ Retry Logic: ลองส่ง Request หลายครั้งถ้าเกิด Network Error
    let lastError: any = null;
    for (let attempt = 0; attempt <= this.EASYSLIP_MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.warn(
            `EasySlip API retry attempt ${attempt}/${this.EASYSLIP_MAX_RETRIES}`,
          );
          // Wait before retry (exponential backoff: 1s, 2s)
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }

        // ส่ง POST Request ไปที่ EasySlip API
        const response = await firstValueFrom(
          this.httpService.post(
            'https://developer.easyslip.com/api/v1/verify',
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${easyslipApiKey}`,
              },
              timeout: this.EASYSLIP_TIMEOUT, // ✅ Timeout 10 วินาที
            },
          ),
        );

        // Validation Logic
        // ตรวจสอบว่า response status คือ 200
        if (response.status !== 200) {
          this.logger.error(
            `EasySlip API returned non-200 status: ${response.status}`,
          );
          return {
            success: false,
            isApiError: true, // ✅ API Error (ไม่ใช่ Verification Failed)
            error: `EasySlip API returned status ${response.status}`,
          };
        }

        // ตรวจสอบ response.data.status ว่าเป็น 200
        const responseData = response.data as any;
        if (responseData.status !== 200) {
          // ✅ Verification Failed: ตรวจสอบแล้วแต่ไม่ผ่าน (ไม่ใช่ API Error)
          this.logger.warn(
            `EasySlip verification failed: ${responseData.message || 'Unknown error'}`,
          );
          return {
            success: false,
            isApiError: false, // ✅ Verification Failed (ไม่ใช่ API Error)
            error: responseData.message || 'EasySlip verification failed',
          };
        }

        // ดึง response.data.data.amount มาเทียบกับ orderTotal
        const verifiedAmount = responseData.data?.amount;
        
        if (!verifiedAmount) {
          // ✅ Verification Failed: ไม่สามารถอ่านยอดเงินได้
          this.logger.warn('Unable to extract amount from slip');
          return {
            success: false,
            isApiError: false, // ✅ Verification Failed
            error: 'Unable to extract amount from slip',
          };
        }

        // ถ้าไม่ตรงหรือน้อยกว่า ให้ return Verification Failed
        if (verifiedAmount < orderTotal) {
          this.logger.warn(
            `Slip amount (${verifiedAmount}) is less than order total (${orderTotal})`,
          );
          return {
            success: false,
            isApiError: false, // ✅ Verification Failed
            error: `Slip amount (${verifiedAmount}) is less than order total (${orderTotal})`,
          };
        }

        // ✅ Success: ตรวจสอบผ่าน
        this.logger.log(
          `EasySlip verification successful: amount=${verifiedAmount}, orderTotal=${orderTotal}`,
        );
        return {
          success: true,
          details: {
            amount: verifiedAmount,
            orderTotal: orderTotal,
            verified: true,
            ...responseData.data,
          },
        };
      } catch (error: any) {
        lastError = error;

        // ✅ ตรวจสอบว่าเป็น Network Error หรือ Timeout หรือไม่
        const isNetworkError =
          error.code === 'ECONNABORTED' || // Timeout
          error.code === 'ETIMEDOUT' || // Connection timeout
          error.code === 'ENOTFOUND' || // DNS error
          error.code === 'ECONNREFUSED' || // Connection refused
          (error instanceof AxiosError && error.response?.status >= 500) || // 5xx Server Error
          (error instanceof AxiosError && !error.response); // No response (network issue)

        // ถ้าไม่ใช่ Network Error หรือ Retry หมดแล้ว ให้ break loop
        if (!isNetworkError || attempt >= this.EASYSLIP_MAX_RETRIES) {
          break;
        }

        // ถ้าเป็น Network Error และยัง Retry ได้ ให้ continue loop
        this.logger.warn(
          `EasySlip API network error (attempt ${attempt + 1}/${this.EASYSLIP_MAX_RETRIES + 1}): ${error.message}`,
        );
      }
    }

    // ✅ ถ้า Retry หมดแล้วยังไม่สำเร็จ ให้ return API Error
    this.logger.error(
      `EasySlip API failed after ${this.EASYSLIP_MAX_RETRIES + 1} attempts: ${lastError?.message || 'Unknown error'}`,
    );

    // ✅ Handle HTTP errors (4xx Client Error)
    if (lastError?.response) {
      const status = lastError.response.status;
      const message = lastError.response.data?.message || 'EasySlip API error';
      
      // 4xx = Client Error (อาจเป็น Verification Failed)
      if (status >= 400 && status < 500) {
        return {
          success: false,
          isApiError: false, // ✅ Client Error = Verification Failed
          error: message,
        };
      }
      
      // 5xx = Server Error (API Error)
      return {
        success: false,
        isApiError: true, // ✅ Server Error = API Error
        error: `EasySlip API error (${status}): ${message}`,
      };
    }

    // ✅ Network Error หรือ Timeout = API Error
    return {
      success: false,
      isApiError: true, // ✅ API Error
      error:
        lastError instanceof Error
          ? lastError.message
          : 'Failed to verify slip (network error or timeout)',
    };
  }

  /**
   * Parse SMS message จากธนาคารไทยเพื่อดึงยอดเงิน
   * รองรับรูปแบบ SMS จาก KBank, SCB, BBL
   * @param message ข้อความ SMS
   * @param sender ชื่อธนาคาร (เช่น "KBANK", "SCB", "BBL")
   * @returns ยอดเงินที่พบ (บาท) หรือ null ถ้าไม่พบ
   */
  parseSmsAmount(message: string, sender: string): number | null {
    if (!message || typeof message !== 'string') {
      return null;
    }

    // ✅ Patterns สำหรับธนาคารไทย (KBank, SCB, BBL)
    // รูปแบบที่พบบ่อย:
    // - "คุณได้รับโอนเงิน 500.00 บาท จากนายทดสอบ เวลา 12:00 น."
    // - "รับโอน 1,000.50 Baht จาก..."
    // - "โอนเงินเข้า 2,500.00 บาท"
    // - "Deposit 500.00 Baht"
    // - "12/01/69 15:43 บช X-6888 รับโอนจาก X-1730 2.00 คงเหลือ 44.95 บ." (KBank รูปแบบใหม่)
    const patterns = [
      // ✅ KBank รูปแบบใหม่: "รับโอนจาก ... [ยอดเงิน] ... คงเหลือ"
      // ตัวอย่าง: "12/01/69 15:43 บช X-6888 รับโอนจาก X-1730 2.00 คงเหลือ 44.95 บ."
      // Pattern: หาตัวเลขที่อยู่หลัง "รับโอนจาก" และอยู่หน้าคำว่า "คงเหลือ"
      /รับโอนจาก\s+[^\d]*?([\d,]+\.?\d*)\s+คงเหลือ/i,
      
      // ✅ Pattern สำหรับรูปแบบ "X.XX คงเหลือ" (KBank รูปแบบใหม่ - ตรงๆ)
      // ตัวอย่าง: "2.00 คงเหลือ 44.95 บ." หรือ "รับโอน 2.00 คงเหลือ"
      /([\d,]+\.?\d*)\s+คงเหลือ/i,
      
      // KBank patterns (รูปแบบเดิม)
      /(?:รับโอน|โอนเงินเข้า|Deposit)\s*([\d,]+\.?\d*)\s*(?:Baht|บาท)/i,
      /(?:คุณได้รับโอนเงิน|ได้รับโอนเงิน)\s*([\d,]+\.?\d*)\s*(?:บาท|Baht)/i,
      
      // SCB patterns
      /(?:รับเงิน|โอนเข้า)\s*([\d,]+\.?\d*)\s*(?:บาท|Baht)/i,
      /(?:เงินเข้า|โอนเงิน)\s*([\d,]+\.?\d*)\s*(?:บาท|Baht)/i,
      
      // BBL patterns
      /(?:โอนเงิน|รับโอน)\s*([\d,]+\.?\d*)\s*(?:บาท|Baht)/i,
      
      // Generic patterns (fallback)
      /(?:amount|ยอดเงิน|จำนวนเงิน)\s*[:=]?\s*([\d,]+\.?\d*)\s*(?:บาท|Baht|THB)/i,
      /([\d,]+\.?\d*)\s*(?:บาท|Baht|THB)\s*(?:รับโอน|โอนเข้า|Deposit)/i,
    ];

    // ลอง match กับทุก pattern
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        // แปลง string เป็น number (ลบ comma ออก)
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        
        if (!isNaN(amount) && amount > 0) {
          this.logger.log(
            `✅ Parsed SMS amount from ${sender}: ${amount} THB (pattern matched: ${pattern.source})`,
          );
          return amount;
        }
      }
    }

    // ถ้าไม่พบ pattern ใดๆ
    this.logger.warn(
      `⚠️ Could not parse amount from SMS (${sender}): ${message.substring(0, 100)}...`,
    );
    return null;
  }
}

