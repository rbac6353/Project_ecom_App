import client from '@app/api/client';
import { Cart } from '@shared/interfaces/cart';

// ดึงข้อมูลตะกร้าสินค้า
export const getCart = async (): Promise<Cart> => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.get('/cart');
  console.log('getCart - Raw API response:', JSON.stringify(response, null, 2)); // Debug
  return response;
};

// เพิ่มสินค้าลงตะกร้า
export const addToCart = async (
  productId: number,
  count: number = 1,
  variantId?: number,
): Promise<Cart> => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.post('/cart/add', {
    productId,
    count,
    variantId,
  });
  return response;
};

// ลบสินค้าออกจากตะกร้า (ใช้ itemId แทน productId เพื่อรองรับ variants)
export const removeFromCart = async (itemId: number): Promise<Cart> => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.delete(`/cart/remove/${itemId}`);
  return response;
};

// อัปเดตจำนวนสินค้า (ใช้ itemId แทน productId เพื่อรองรับ variants)
export const updateCartItem = async (itemId: number, count: number): Promise<Cart> => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.put('/cart/update', { itemId, count });
  return response;
};

