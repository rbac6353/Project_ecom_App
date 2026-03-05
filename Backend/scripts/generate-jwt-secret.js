// Script สำหรับสร้าง JWT Secret ที่ปลอดภัย
// วิธีใช้: node scripts/generate-jwt-secret.js

const crypto = require('crypto');

// สุ่ม Key ยาว 64 ตัวอักษร (32 bytes = 64 hex characters)
const secret = crypto.randomBytes(32).toString('hex');

console.log('\n🔐 JWT Secret ที่สุ่มได้:');
console.log('='.repeat(60));
console.log(secret);
console.log('='.repeat(60));
console.log('\n📝 นำไปใส่ในไฟล์ Backend/.env:');
console.log(`JWT_SECRET=${secret}`);
console.log('\n⚠️  หมายเหตุ: หลังจากเปลี่ยน Secret แล้ว User ทุกคนที่ Login ค้างไว้จะหลุด (Token เก่าใช้ไม่ได้) ต้อง Login ใหม่\n');

