# 📱 SMS Webhook Setup Guide

## ✅ สิ่งที่สร้างเสร็จแล้ว

### 1. SMS Webhook Controller (`sms-webhook.controller.ts`)
- ✅ รับ SMS จาก Mobile App
- ✅ ตรวจสอบ API Key (Security)
- ✅ Parse SMS เพื่อดึงยอดเงิน
- ✅ จับคู่ยอดเงินกับออเดอร์
- ✅ อัปเดตสถานะออเดอร์อัตโนมัติ

### 2. Payment Service (`payments.service.ts`)
- ✅ เพิ่ม `parseSmsAmount()` method
- ✅ รองรับรูปแบบ SMS จาก KBank, SCB, BBL
- ✅ Pattern Matching สำหรับดึงยอดเงิน

### 3. Orders Service (`orders.service.ts`)
- ✅ เพิ่ม `matchOrderByAmount()` method
- ✅ เพิ่ม `confirmPaymentFromSms()` method
- ✅ จับคู่ยอดเงินกับออเดอร์ที่รอชำระเงิน

### 4. DTO (`sms-webhook.dto.ts`)
- ✅ Validation สำหรับ SMS Webhook data

## 🛠️ การตั้งค่า

### Step 1: เพิ่ม SMS_SECRET_KEY ใน .env

เปิดไฟล์ `.env` ในโปรเจค Backend และเพิ่ม:

```env
# SMS Webhook Secret Key (ตั้งให้ยากๆ หน่อยก็ได้ครับ)
SMS_SECRET_KEY=GTX_SECRET_2024
```

**หมายเหตุ:** คุณสามารถเปลี่ยน `GTX_SECRET_2024` เป็นอะไรก็ได้ แต่ต้องจำไว้ให้ดี เพราะต้องเอาไปใส่ในแอปมือถือครับ

### Step 2: รัน Server

```bash
cd Backend
npm run start:dev
```

รอจนขึ้นว่า `Nest application successfully started`

## 🧪 ทดสอบ Endpoint

### Test 1: Smoke Test (Basic)

```bash
curl -X POST http://localhost:3000/payments/webhook/sms \
     -H "Content-Type: application/json" \
     -H "X-API-KEY: GTX_SECRET_2024" \
     -d '{
       "sender": "KBANK",
       "message": "คุณได้รับโอนเงิน 500.00 บาท จากนายทดสอบ เวลา 12:00 น."
     }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "No matching order found for this amount",
  "parsedAmount": 500,
  "matchedOrderId": null
}
```

**หมายเหตุ:** ถ้าไม่มีออเดอร์ที่รอชำระเงิน 500 บาท จะได้ response แบบนี้ (ปกติ)

### Test 2: Test with Matching Order

1. สร้างออเดอร์ที่มียอดเงิน 500 บาท (สถานะ PENDING)
2. ส่ง SMS Webhook:

```bash
curl -X POST http://localhost:3000/payments/webhook/sms \
     -H "Content-Type: application/json" \
     -H "X-API-KEY: GTX_SECRET_2024" \
     -d '{
       "sender": "KBANK",
       "message": "คุณได้รับโอนเงิน 500.00 บาท จากนายทดสอบ เวลา 12:00 น."
     }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment confirmed successfully",
  "parsedAmount": 500,
  "matchedOrderId": 123,
  "orderStatus": "PENDING_CONFIRMATION"
}
```

### Test 3: Invalid API Key

```bash
curl -X POST http://localhost:3000/payments/webhook/sms \
     -H "Content-Type: application/json" \
     -H "X-API-KEY: WRONG_KEY" \
     -d '{
       "sender": "KBANK",
       "message": "คุณได้รับโอนเงิน 500.00 บาท"
     }'
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "message": "Invalid API Key"
}
```

## 📋 รูปแบบ SMS ที่รองรับ

### KBank
- "คุณได้รับโอนเงิน 500.00 บาท จากนายทดสอบ เวลา 12:00 น."
- "รับโอน 1,000.50 Baht จาก..."
- "โอนเงินเข้า 2,500.00 บาท"
- "Deposit 500.00 Baht"

### SCB
- "รับเงิน 500.00 บาท"
- "โอนเข้า 1,000.50 Baht"

### BBL
- "โอนเงิน 500.00 บาท"
- "รับโอน 1,000.50 Baht"

## 🔍 ตรวจสอบ Logs

ดู Server Logs เพื่อตรวจสอบการทำงาน:

```
✅ Received SMS from KBANK: 500 THB
✅ Parsed SMS amount from KBANK: 500 THB (pattern matched: ...)
✅ Matched order #123 with amount 500 THB (order total: 500 THB)
✅ Order #123 payment confirmed via SMS from KBANK. Status: PENDING_CONFIRMATION
```

## ⚠️ หมายเหตุสำคัญ

1. **API Key Security:** อย่าเปิดเผย `SMS_SECRET_KEY` ในโค้ดหรือ commit ลง Git
2. **Amount Matching:** ระบบจะจับคู่ยอดเงินด้วยความคลาดเคลื่อน ±0.01 บาท
3. **Order Status:** ระบบจะค้นหาเฉพาะออเดอร์ที่มีสถานะ `PENDING` หรือ `VERIFYING`
4. **Multiple Orders:** ถ้ามีหลายออเดอร์ที่มียอดเงินเดียวกัน ระบบจะเลือกออเดอร์ล่าสุด

## 🚀 Next Steps

1. ✅ Backend Code: เสร็จแล้ว (รอรับ Webhook)
2. ✅ Security: มีรหัสผ่านป้องกันคนอื่นยิงมั่ว
3. ❌ Public Access: Server ยังอยู่แค่ในเครื่องคุณ (Localhost) - ต้องใช้ ngrok หรือ deploy เพื่อให้มือถือเข้าถึงได้

## 📱 สำหรับ Mobile App

เมื่อ Mobile App ส่ง SMS Webhook มา ต้องส่ง:

```typescript
const response = await fetch('http://YOUR_SERVER_URL/payments/webhook/sms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': 'GTX_SECRET_2024', // ใช้ค่าเดียวกับ .env
  },
  body: JSON.stringify({
    sender: 'KBANK', // หรือ 'SCB', 'BBL'
    message: smsMessage, // ข้อความ SMS ที่ได้รับ
    timestamp: new Date().toISOString(), // optional
  }),
});
```
