import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  promptpayId: process.env.PROMPTPAY_ID || '',
  easyslipApiKey: process.env.EASYSLIP_API_KEY || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
}));
