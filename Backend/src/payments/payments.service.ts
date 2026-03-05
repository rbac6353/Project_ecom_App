import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor() {
    // Initialize Stripe
    // ไม่ระบุ apiVersion เพื่อให้ใช้ default version (ล่าสุด)
    // หรือใช้ '2025-11-17.clover' ถ้าต้องการระบุชัดเจน
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-11-17.clover', // ใช้ version ที่ Stripe library รองรับ
    });
  }

  // สร้าง Payment Intent (ขออนุญาตตัดเงิน)
  async createPaymentIntent(amount: number, currency: string = 'thb') {
    // Stripe รับค่าจำนวนเงินเป็น "สตางค์" (เช่น 100 บาท = 10000)
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), 
      currency: currency,
      automatic_payment_methods: { enabled: true }, // เปิดรับบัตรเครดิต/PromptPay (ถ้าเปิดใน dashboard)
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  }
}

