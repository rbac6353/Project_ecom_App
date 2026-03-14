// interfaces/coupon.ts

export interface Coupon {
  id: number;
  code: string;
  
  // ประเภทคูปอง
  type: 'SHIPPING' | 'DISCOUNT' | 'COIN'; // ส่งฟรี, ส่วนลด, เงินคืน
  
  // ข้อมูลส่วนลด
  discountAmount?: number; // ส่วนลดเป็นบาท
  discountPercent?: number; // ส่วนลดเป็น %
  minPurchase: number; // ขั้นต่ำ
  maxDiscount?: number; // ลดสูงสุด (สำหรับส่วนลดเปอร์เซ็นต์)
  
  // ข้อมูลคูปอง
  title?: string; // เช่น "ส่วนลด 10%"
  description?: string; // เช่น "Shopee Mall", "AirPay"
  
  // ระยะเวลาใช้งาน
  startDate?: string; // วันเริ่มต้น
  expiresAt: string; // วันหมดอายุ
  
  // จำนวนจำกัด
  totalQuantity?: number; // จำนวนคูปองทั้งหมด (null = ไม่จำกัด)
  perUserLimit?: number; // จำนวนต่อผู้ใช้
  usedCount?: number; // จำนวนที่ใช้ไปแล้ว
  
  // ผู้ใช้เป้าหมาย
  targetUsers?: 'ALL' | 'NEW_USER' | 'EXISTING_USER';
  
  // หมวดหมู่สินค้า
  categoryIds?: number[]; // Array ของ category IDs
  
  // คูปองของร้านค้า
  storeId?: number; // null = Platform Voucher (ใช้ได้ทุกร้าน)
  storeName?: string; // ชื่อร้าน (สำหรับแสดงผล)
  
  // สถานะ
  isUsed: boolean; // สำหรับคูปองที่ user เก็บไว้แล้ว
  isCollected?: boolean; // เก็บแล้วหรือยัง (สำหรับ available coupons)
  platform?: 'ALL' | 'MALL' | 'LIVE' | 'SHOP'; // ป้ายกำกับเล็กๆ (deprecated - ใช้ type แทน)
}

