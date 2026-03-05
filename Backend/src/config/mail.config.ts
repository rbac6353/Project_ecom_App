import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.GMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.GMAIL_PORT || '587', 10),
  user: process.env.GMAIL_USER || '',
  password: process.env.GMAIL_APP_PASSWORD || '',
  from: process.env.GMAIL_FROM || `"GTXShop Official" <${process.env.GMAIL_USER || 'noreply@gtxshop.com'}>`,
}));

