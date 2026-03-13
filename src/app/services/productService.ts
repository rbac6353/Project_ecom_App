// services/productService.ts
import client from '@app/api/client';

export interface PaginatedProducts<T = any> {
  data: T[];
  total: number;
  page: number;
  last_page: number;
}

export const getProducts = async (
  categoryId?: number,
  page: number = 1,
  limit: number = 10,
  keyword?: string,
  sortBy?: string,
  minPrice?: number,
  maxPrice?: number,
  subcategoryId?: number, // ✅ เพิ่ม parameter subcategoryId
  minRating?: number,
  shopType?: 'mall' | 'regular',
  condition?: 'new' | 'used',
  paymentMethod?: string,
): Promise<PaginatedProducts> => {
  let url = `/products?page=${page}&limit=${limit}`;
  if (categoryId) {
    url += `&categoryId=${categoryId}`;
  }
  if (subcategoryId) {
    url += `&subcategoryId=${subcategoryId}`;
  }
  if (keyword) {
    url += `&keyword=${encodeURIComponent(keyword)}`;
  }
  if (sortBy) {
    url += `&sortBy=${sortBy}`;
  }
  if (minPrice !== undefined) {
    url += `&minPrice=${minPrice}`;
  }
  if (maxPrice !== undefined) {
    url += `&maxPrice=${maxPrice}`;
  }
  if (shopType) {
    url += `&shopType=${encodeURIComponent(shopType)}`;
  }
  
  console.log('🌐 API Request URL:', url);
  console.log('🔑 Keyword:', keyword);
  console.log('📊 SortBy:', sortBy);
  console.log('💰 Price Range:', minPrice ? `${minPrice}-${maxPrice || '∞'}` : 'All');
  
  // ✅ ไม่ต้อง response.data อีก เพราะ client.ts แกะมาให้แล้ว
  const result: any = await client.get(url);
  
  console.log('📥 API Response:', {
    is_array: Array.isArray(result),
    has_data_prop: !!(result && typeof result === 'object' && 'data' in result),
    data_type: Array.isArray(result) ? 'array' : typeof result,
    data_length: Array.isArray(result) ? result.length : (result?.data?.length || 0),
    total: result?.total,
    page: result?.page,
  });
  
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  if (result && result.data && Array.isArray(result.data)) {
    // ถ้าเป็น pagination response { data: [], total: ..., page: ... }
    return result as PaginatedProducts;
  }
  
  // ถ้าเป็น array โดยตรง (ไม่มี wrapping)
  if (Array.isArray(result)) {
    return {
      data: result,
      total: result.length,
      page: 1,
      last_page: 1,
    } as PaginatedProducts;
  }
  
  // กรณีปกติ (pagination response: { data: [], total: ..., page: ..., last_page: ... })
  return result as PaginatedProducts;
};

