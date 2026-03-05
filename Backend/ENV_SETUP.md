# Environment Variables Setup Guide

## ไฟล์ .env

สร้างไฟล์ `.env` ในโฟลเดอร์ `Backend/` และเพิ่มตัวแปรต่อไปนี้:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=ecom1

# JWT Configuration
JWT_SECRET=LINKUPSHOP_SECRET_KEY_12345

# Application Configuration
PORT=3000
NODE_ENV=development
APP_NAME=GTXShop
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006

# Cloudinary Configuration (Optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Mail Configuration (Optional)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=noreply@gtxshop.com

# Stripe Configuration (Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# Payment Configuration (สำหรับ PromptPay และ EasySlip)
PROMPTPAY_ID=0820844920
EASYSLIP_API_KEY=your_easyslip_api_key_here

# AI Product Assistant (Gemini) - Optional
GEMINI_API_KEY=your_gemini_api_key_here
```

## ตัวแปรที่ต้องตั้งค่า

### PROMPTPAY_ID
- **ค่า**: `0963803407` (เบอร์โทรศัพท์หรือเลขบัตรประชาชน)
- **ใช้สำหรับ**: สร้าง QR Code PromptPay

### EASYSLIP_API_KEY
- **ค่า**: API Key จาก EasySlip (คุณจะต้องเติมค่าจริงเอง)
- **ใช้สำหรับ**: ตรวจสอบสลิปโอนเงินผ่าน EasySlip API

### GEMINI_API_KEY (Optional – สำหรับ AI Product Assistant)
- **ค่า**: API Key จาก [Google AI Studio](https://aistudio.google.com/apikey)
- **ใช้สำหรับ**: ฟีเจอร์ "ถาม AI เกี่ยวกับสินค้า" (POST /products/:id/ask-ai)
- **หมายเหตุ**: ถ้าไม่ตั้งค่า ลูกค้าจะได้รับข้อความแจ้งว่า AI ยังไม่ได้ตั้งค่า

## วิธีใช้งาน Config ใน Code

```typescript
import { ConfigService } from '@nestjs/config';

constructor(private configService: ConfigService) {}

// ดึงค่า PROMPTPAY_ID
const promptpayId = this.configService.get<string>('payment.promptpayId');

// ดึงค่า EASYSLIP_API_KEY
const easyslipApiKey = this.configService.get<string>('payment.easyslipApiKey');
```

## หมายเหตุ

- ไฟล์ `.env` ควรอยู่ใน `.gitignore` เพื่อความปลอดภัย
- ใช้ `.env.example` หรือ `ENV_SETUP.md` นี้เป็น template สำหรับทีม
- ใน production ควรใช้ environment variables ของ hosting platform แทนไฟล์ `.env`
