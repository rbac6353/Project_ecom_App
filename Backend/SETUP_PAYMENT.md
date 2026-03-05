# 🚀 ขั้นตอนที่ 1: ติดตั้ง Dependencies และตั้งค่า Environment (Backend)

## ✅ สิ่งที่ทำเสร็จแล้ว

### 1. ติดตั้ง Packages
ติดตั้ง packages ต่อไปนี้เรียบร้อยแล้ว:
- ✅ `promptpay-qr` - สำหรับสร้าง QR Code PromptPay
- ✅ `qrcode` - Library สำหรับสร้าง QR Code
- ✅ `form-data` - สำหรับส่ง FormData (มีอยู่แล้วใน axios)
- ✅ `@types/qrcode` - TypeScript types สำหรับ qrcode
- ✅ `axios` - HTTP client (มีอยู่แล้ว)

**หมายเหตุ**: `@nestjs/axios` ไม่จำเป็นเพราะเราใช้ `axios` โดยตรงได้

### 2. สร้าง Payment Config
สร้างไฟล์ `Backend/src/config/payment.config.ts` เพื่อจัดการ environment variables:
- `PROMPTPAY_ID` - เบอร์โทรศัพท์หรือเลขบัตรประชาชน
- `EASYSLIP_API_KEY` - API Key จาก EasySlip

### 3. อัปเดต Config Index
อัปเดต `Backend/src/config/index.ts` เพื่อรวม `paymentConfig` เข้าไปในระบบ config

### 4. อัปเดต Validation Schema
อัปเดต `Backend/src/config/validation.schema.ts` เพื่อเพิ่ม documentation สำหรับตัวแปรใหม่

## 📝 สิ่งที่ต้องทำต่อ

### 1. สร้างไฟล์ `.env`
สร้างไฟล์ `.env` ในโฟลเดอร์ `Backend/` (ถ้ายังไม่มี) และเพิ่มตัวแปรต่อไปนี้:

```env
# Payment Configuration
PROMPTPAY_ID=0820844920
EASYSLIP_API_KEY=your_easyslip_api_key_here
```

### 2. ตรวจสอบ Config
ตรวจสอบว่า `app.module.ts` โหลด config ได้ถูกต้อง:

```typescript
// ใน app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
  load: configurations, // ✅ รวม paymentConfig แล้ว
}),
```

### 3. ทดสอบการใช้งาน Config
ทดสอบว่า config ทำงานได้โดยสร้าง service หรือ controller ที่ใช้:

```typescript
import { ConfigService } from '@nestjs/config';

constructor(private configService: ConfigService) {}

// ดึงค่า PROMPTPAY_ID
const promptpayId = this.configService.get<string>('payment.promptpayId');
console.log('PROMPTPAY_ID:', promptpayId);

// ดึงค่า EASYSLIP_API_KEY
const easyslipApiKey = this.configService.get<string>('payment.easyslipApiKey');
console.log('EASYSLIP_API_KEY:', easyslipApiKey);
```

## 📚 เอกสารเพิ่มเติม

ดูไฟล์ `ENV_SETUP.md` สำหรับรายละเอียดเพิ่มเติมเกี่ยวกับการตั้งค่า environment variables

## ✅ Checklist

- [x] ติดตั้ง packages (promptpay-qr, qrcode, form-data, @types/qrcode)
- [x] สร้าง payment.config.ts
- [x] อัปเดต config/index.ts
- [x] อัปเดต validation.schema.ts
- [ ] สร้างไฟล์ .env และเพิ่ม PROMPTPAY_ID, EASYSLIP_API_KEY
- [ ] ทดสอบการใช้งาน ConfigService

## 🔍 ตรวจสอบการติดตั้ง

รันคำสั่งต่อไปนี้เพื่อตรวจสอบว่า packages ติดตั้งสำเร็จ:

```bash
cd Backend
npm list promptpay-qr qrcode form-data @types/qrcode
```

ควรเห็น output แสดงว่า packages ติดตั้งแล้ว
