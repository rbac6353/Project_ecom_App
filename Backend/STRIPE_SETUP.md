# 💳 Stripe Payment Gateway Setup

## 📝 การตั้งค่า Stripe Secret Key

### ขั้นตอนที่ 1: เพิ่ม STRIPE_SECRET_KEY ใน .env

เปิดไฟล์ `Backend/.env` แล้วเพิ่มบรรทัดนี้:

```env
STRIPE_SECRET_KEY=your_stripe_secret_key_here
```

### ขั้นตอนที่ 2: Restart Backend Server

หลังจากเพิ่ม STRIPE_SECRET_KEY แล้ว ให้ restart Backend:

```bash
cd Backend
npm run start:dev
```

### ✅ ตรวจสอบว่า Setup สำเร็จ

เมื่อ Backend รันแล้ว ตรวจสอบว่าไม่มี error เกี่ยวกับ Stripe:
- ไม่มี error "Stripe requires an API key"
- API endpoint `/payments/intent` พร้อมใช้งาน

---

## 🔑 Stripe Keys ที่ใช้ในโปรเจคนี้

### Publishable Key (Frontend)
```
pk_test_51SNshiCuM4gJBzeMSrz6iKFkznCS9pILDUV339dT6osvwqbn5DJxRGmDu4oknwT8iD5eTz7YilPh1gMfrugPPsgC003DqGHwxW
```
- ใช้ใน: `GTXShopApp/App.tsx` (StripeProvider)
- ไม่เป็นความลับ สามารถ commit ลง Git ได้

### Secret Key (Backend)
```
(ใส่คีย์จาก Stripe Dashboard → Developers → API keys — ขึ้นต้นด้วย sk_test_...)
```
- ใช้ใน: `Backend/.env` (STRIPE_SECRET_KEY)
- **เป็นความลับ ห้าม commit ลง Git! ใส่เฉพาะใน .env**

---

## 🧪 Test Cards สำหรับทดสอบ

เมื่อทดสอบใน Test Mode ใช้บัตรทดสอบเหล่านี้:

### บัตรเครดิตสำเร็จ
- **Number**: `4242 4242 4242 4242`
- **MM/YY**: `12/30` (หรือวันที่อนาคตใดๆ)
- **CVC**: `123`
- **ZIP**: `12345` (ถ้าถาม)

### บัตรเครดิตถูกปฏิเสธ
- **Number**: `4000 0000 0000 0002`

### บัตรเครดิตต้อง Authentication
- **Number**: `4000 0025 0000 3155`

---

## 📚 เอกสารเพิ่มเติม

- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe React Native SDK](https://stripe.dev/stripe-react-native/)
- [Stripe Dashboard](https://dashboard.stripe.com/test/dashboard)

