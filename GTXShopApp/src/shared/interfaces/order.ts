import { Product } from './home';

export interface ProductOnOrder {
  id: number;
  count: number;
  price: number; // ราคา ณ ตอนที่ซื้อ
  product: Product;
}

export interface Order {
  id: number;
  userId: number;
  total: number;
  status: string; // 'PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'
  shippingAddress: string;
  shippingPhone: string;
  createdAt: string;
  updatedAt?: string;
  paymentMethod?: string; // 'STRIPE', 'COD', 'BANK_TRANSFER'
  paymentExpiredAt?: string | null; // ✅ เวลาหมดอายุการชำระเงิน (ISO string)
  paymentSlipUrl?: string | null; // ✅ URL สลิปการโอนเงิน
  trackingNumber?: string | null; // ✅ เลขพัสดุ
  logisticsProvider?: string | null; // ✅ บริษัทขนส่ง
  items: ProductOnOrder[];
  // ✅ เพิ่ม fields สำหรับ refund
  refundStatus?: 'NONE' | 'PENDING' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  refundReason?: string;
  // ✅ เพิ่ม fields สำหรับระบบ Auto-Cancellation
  confirmationDeadline?: string | null; // ISO Date string - เวลาเส้นตายสำหรับร้านค้ายืนยันรับออเดอร์ (24 ชั่วโมง)
  isAutoCancelled?: boolean; // Flag บอกว่าถูกยกเลิกโดยระบบอัตโนมัติ
}

