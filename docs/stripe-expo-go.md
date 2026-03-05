# Stripe ใน Expo Go (iOS/Android)

## ความจริงจากเอกสาร Expo และข้อจำกัด

### ✅ สิ่งที่ Expo รองรับ
- **Expo รวม Native Module ของ Stripe ไว้ใน Expo Go แล้ว** — เปิด Payment Sheet (กรอกบัตร) ใน Expo Go ได้ ไม่ต้องใช้ stub
- แต่ละ Expo SDK ต้องการเวอร์ชัน `@stripe/stripe-react-native` ที่ตรงกัน ควรติดตั้งด้วย:
  ```bash
  npx expo install @stripe/stripe-react-native
  ```

### ⚠️ ข้อจำกัดใน Expo Go (ที่นักพัฒนาเจอจริง)
1. **Apple Pay / Google Pay** — ใช้ใน Expo Go ไม่ได้ ต้องใช้ Development Build หรือ EAS Build (ต้องผูก Certificate กับแอป)
2. **Deep link หลัง 3D Secure / OTP** — บัตรหลายใบจะเด้งไปยืนยันตัวตนในเบราว์เซอร์หรือแอปธนาคาร ตอนกดยืนยันเสร็จระบบต้อง "กลับเข้าแอป" ถ้า `returnURL` / `urlScheme` ตั้งผิด แอปจะไม่รับ redirect และ Payment Sheet อาจค้างหรือฟ้อง error
3. **Version mismatch** — ถ้าโปรเจกต์ใช้เวอร์ชัน Stripe ใหม่กว่าที่ Expo Go บันเดิลไว้ อาจเจอ error เรื่อง native module

### การตั้งค่าในโปรเจกต์นี้
- **App.tsx**: ใช้ Stripe จริงบน native (รวม Expo Go), ส่ง `urlScheme` ให้ StripeProvider ตาม [Expo Stripe doc](https://docs.expo.dev/versions/v54.0.0/sdk/stripe/) เพื่อให้ redirect กลับเข้าแอปได้
- **CheckoutScreen**: ใช้ `returnURL: Linking.createURL('stripe-redirect')` แทน `boxify://` เพื่อให้ทั้ง Expo Go และแอป build จริงใช้ scheme ที่ถูก
- ใช้ **stub** เฉพาะเมื่อรันบน **web**
