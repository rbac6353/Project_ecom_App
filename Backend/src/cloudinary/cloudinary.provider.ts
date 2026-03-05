import { v2 as cloudinary } from 'cloudinary';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    // 👇 Hardcode ค่าเพื่อทดสอบ (ชั่วคราว)
    // ใส่ค่าตรงๆ ลงไปเลยเพื่อทดสอบว่าปัญหาอยู่ที่ .env หรือไม่
    return cloudinary.config({
      cloud_name: 'dk5mcjycq',
      api_key: '556256999969578',
      api_secret: 'ZHu_A-XAwGUzWRlR--IL8JlRzc8', // ค่าที่ถูกต้อง (ตัว I ใหญ่)
    });
    
    // ⚠️ หมายเหตุ: หลังจากทดสอบแล้ว ถ้าทำงานได้ ให้กลับไปใช้ process.env แทน
    // และตรวจสอบว่า .env มีค่าถูกต้องและไม่มี hidden characters
  },
};

