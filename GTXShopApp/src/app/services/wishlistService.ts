import client from '@app/api/client';

export const getWishlist = async () => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.get('/wishlist');
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  if (Array.isArray(response)) {
    return response;
  }
  return response?.data || [];
};

export const addToWishlist = async (productId: number) => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.post(`/wishlist/${productId}`);
  return response;
};

export const removeFromWishlist = async (productId: number) => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.delete(`/wishlist/${productId}`);
  return response;
};

