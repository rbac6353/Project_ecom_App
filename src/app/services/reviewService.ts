import client from '@app/api/client';

export interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  images?: string[];
  user: {
    id: number;
    name: string;
    email?: string;
    // avatar?: string;
  };
}

export const getProductReviews = async (productId: number): Promise<Review[]> => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.get(`/reviews/product/${productId}`);
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  return Array.isArray(response) ? response : (response?.data || []);
};

export const createReview = async (
  productId: number,
  rating: number,
  comment: string,
  images?: string[],
) => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.post('/reviews', { productId, rating, comment, images });
  return response;
};

export const getAverageRating = async (productId: number): Promise<number> => {
  try {
    // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
    const response = await client.get(`/reviews/product/${productId}/average`);
    // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
    const rating = typeof response === 'number' ? response : (response?.data ?? response?.average ?? 0);
    return rating;
  } catch (error) {
    // ถ้าไม่มี API endpoint นี้ ให้คำนวณจาก reviews
    const reviews = await getProductReviews(productId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  }
};

// ✅ แก้ไขรีวิว
export const updateReview = async (
  reviewId: number,
  rating: number,
  comment: string,
  images?: string[],
) => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.patch(`/reviews/${reviewId}`, {
    rating,
    comment,
    images,
  });
  return response;
};

// ✅ ลบรีวิว
export const deleteReview = async (reviewId: number) => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.delete(`/reviews/${reviewId}`);
  return response;
};

// ✅ ดึงรีวิวของ User เอง
export const getMyReviews = async (): Promise<Review[]> => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.get('/reviews/my-reviews');
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  return Array.isArray(response) ? response : (response?.data || []);
};

