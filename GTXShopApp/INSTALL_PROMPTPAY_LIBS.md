# 📦 ติดตั้ง Libraries สำหรับ PromptPay QR Code

## ขั้นตอนการติดตั้ง

เปิด Terminal ที่ `GTXShopApp` แล้วรันคำสั่งต่อไปนี้:

```bash
# ติดตั้ง react-native-qrcode-svg (สำหรับวาด QR Code)
npx expo install react-native-qrcode-svg

# ติดตั้ง promptpay-qr (สำหรับสร้าง Payload ตามมาตรฐาน PromptPay)
npm install promptpay-qr
```

## ⚠️ หมายเหตุ

- `react-native-qrcode-svg` ใช้สำหรับวาด QR Code บนหน้าจอ
- `promptpay-qr` ใช้สำหรับสร้าง Payload (ข้อความใน QR) ตามมาตรฐานธนาคารแห่งประเทศไทย
- หลังจากติดตั้งเสร็จ ให้ Restart Metro Bundler และแอป

## 🔧 การตั้งค่า PromptPay ID

แก้ไขไฟล์ `GTXShopApp/screens/checkout/PromptPayScreen.tsx`:

```typescript
// เปลี่ยนเป็นเบอร์โทรศัพท์หรือเลขบัตรประชาชนของคุณที่ผูกพร้อมเพย์
const PROMPTPAY_ID = '0812345678'; // ⚠️ เปลี่ยนเป็นเบอร์จริงของคุณ
```

**รูปแบบที่รองรับ:**
- เบอร์โทรศัพท์: `0812345678` (10 หลัก)
- เลขบัตรประชาชน: `1234567890123` (13 หลัก)

## ✅ วิธีทดสอบ

1. สร้างออเดอร์ใหม่ → เลือก "QR PromptPay"
2. เปิดแอปธนาคาร (KPlus, SCB Easy, Krungthai NEXT, etc.)
3. สแกน QR Code บนหน้าจอ
4. ตรวจสอบว่าแสดงชื่อและยอดเงินถูกต้อง

