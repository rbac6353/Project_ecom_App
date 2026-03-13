import client from '@app/api/client';
import { Coupon } from '@shared/interfaces/coupon';

// ดึงคูปองทั้งหมดที่ยังไม่ได้เก็บ (available coupons)
export const getAvailableCoupons = async (): Promise<Coupon[]> => {
  try {
    // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
    const response = await client.get('/coupons/available');
    // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
    const coupons = Array.isArray(response) ? response : (response?.data || []);
    
    // แปลงข้อมูลจาก Backend ให้ตรงกับ Frontend interface
    return coupons.map((c: any) => normalizeCoupon(c));
  } catch (error: any) {
    // ถ้าเป็น 429 (Rate Limit) ไม่ต้อง log เพราะจะ log ซ้ำๆ
    if (error.response?.status === 429) {
      // Return empty array เพื่อให้ใช้ MASTER_COUPONS
      return [];
    }
    // Log error อื่นๆ แค่ครั้งเดียว
    if (error.response?.status !== 404) {
      console.error('Error fetching available coupons:', error.response?.status || error.message);
    }
    // ถ้า error ให้ return array ว่าง
    return [];
  }
};

// ดึงคูปองของฉัน (my coupons)
export const getMyCoupons = async (): Promise<Coupon[]> => {
  try {
    // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
    const response = await client.get('/coupons/my');
    // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
    const coupons = Array.isArray(response) ? response : (response?.data || []);
    
    // แปลงข้อมูลจาก Backend ให้ตรงกับ Frontend interface
    return coupons.map((c: any) => normalizeCoupon(c));
  } catch (error: any) {
    // ถ้าเป็น 429 (Rate Limit) ไม่ต้อง log
    if (error.response?.status === 429) {
      return [];
    }
    // ถ้าไม่มี endpoint /coupons/my ให้ใช้ /coupons และ filter ที่ Frontend
    if (error.response?.status === 404 || error.response?.status === 401) {
      // ไม่ต้อง log เพราะเป็น expected error
      return [];
    }
    // Log error อื่นๆ แค่ครั้งเดียว
    if (error.response?.status !== 404) {
      console.error('Error fetching my coupons:', error.response?.status || error.message);
    }
    return [];
  }
};

// ฟังก์ชันช่วยแปลงข้อมูลจาก Backend
const normalizeCoupon = (c: any): Coupon => {
  // กำหนด type จากข้อมูลที่มี
  let type: 'SHIPPING' | 'DISCOUNT' | 'COIN' = 'DISCOUNT';
  if (c.type) {
    type = c.type.toUpperCase() as 'SHIPPING' | 'DISCOUNT' | 'COIN';
  } else if (c.discountAmount && c.discountAmount > 0) {
    type = 'DISCOUNT';
  } else if (c.discountPercent && c.discountPercent > 0) {
    type = 'DISCOUNT';
  } else {
    type = 'SHIPPING';
  }

  // สร้าง title จากข้อมูลที่มี
  let title = c.title || '';
  if (!title) {
    if (c.discountPercent && c.discountPercent > 0) {
      title = `ส่วนลด ${c.discountPercent}%`;
      if (c.maxDiscount) {
        title += ` ลดสูงสุด ฿${c.maxDiscount}`;
      }
    } else if (c.discountAmount && c.discountAmount > 0) {
      title = `ส่วนลด ฿${c.discountAmount}`;
    } else if (type === 'SHIPPING') {
      title = 'ฟรีค่าจัดส่ง';
    } else {
      title = 'คูปองส่วนลด';
    }
  }

  // Parse categoryIds จาก JSON string
  let categoryIds: number[] | undefined = undefined;
  if (c.categoryIds) {
    try {
      if (typeof c.categoryIds === 'string') {
        categoryIds = JSON.parse(c.categoryIds);
      } else if (Array.isArray(c.categoryIds)) {
        categoryIds = c.categoryIds;
      }
    } catch (e) {
      console.error('Error parsing categoryIds:', e);
    }
  }

  return {
    id: c.id,
    code: c.code,
    type: type,
    discountAmount: c.discountAmount ? parseFloat(c.discountAmount.toString()) : undefined,
    discountPercent: c.discountPercent ? parseFloat(c.discountPercent.toString()) : undefined,
    minPurchase: c.minPurchase ? parseFloat(c.minPurchase.toString()) : 0,
    maxDiscount: c.maxDiscount ? parseFloat(c.maxDiscount.toString()) : undefined,
    title: title,
    description: c.description || '',
    startDate: c.startDate ? (typeof c.startDate === 'string' ? c.startDate : new Date(c.startDate).toISOString()) : undefined,
    expiresAt: c.expiresAt ? (typeof c.expiresAt === 'string' ? c.expiresAt : new Date(c.expiresAt).toISOString()) : new Date().toISOString(),
    totalQuantity: c.totalQuantity ? parseInt(c.totalQuantity.toString()) : undefined,
    perUserLimit: c.perUserLimit ? parseInt(c.perUserLimit.toString()) : 1,
    usedCount: c.usedCount ? parseInt(c.usedCount.toString()) : 0,
    targetUsers: c.targetUsers || 'ALL',
    categoryIds: categoryIds,
    storeId: c.storeId ? parseInt(c.storeId.toString()) : undefined,
    storeName: c.store?.name || undefined,
    isUsed: c.isUsed || false,
    isCollected: c.isCollected !== undefined ? c.isCollected : false, // เพิ่ม isCollected
    platform: c.platform || 'ALL', // Deprecated
  };
};

// เก็บคูปอง (collect coupon) - ใช้ couponId
export const collectCoupon = async (couponId: number): Promise<Coupon> => {
  try {
    // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
    const response = await client.post(`/coupons/collect/${couponId}`);
    // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
    // response จะเป็น UserCoupon object ที่มี coupon relation
    const userCoupon = response?.data || response;
    if (userCoupon?.coupon) {
      return normalizeCoupon(userCoupon.coupon);
    }
    throw new Error('ไม่พบข้อมูลคูปอง');
  } catch (error: any) {
    const message = error.response?.data?.message || 'ไม่สามารถเก็บคูปองได้';
    throw new Error(message);
  }
};

// ใช้โค้ดคูปอง (apply coupon code)
export const applyCouponCode = async (code: string, cartTotal: number) => {
  try {
    // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
    const response = await client.post('/coupons/apply', {
      code: code.trim().toUpperCase(),
      cartTotal: cartTotal,
    });
    return response;
  } catch (error: any) {
    const message = error.response?.data?.message || 'โค้ดไม่ถูกต้อง';
    throw new Error(message);
  }
};

