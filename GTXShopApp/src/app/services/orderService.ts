import client from '@app/api/client';

export interface CreateOrderDto {
  shippingAddress: string;
  shippingPhone: string;
  couponCode?: string;
  paymentMethod?: string; // ✅ เพิ่ม paymentMethod
}

// สร้างออเดอร์ใหม่
export const createOrder = async (data: CreateOrderDto) => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.post('/orders', data);
  return response;
};

// ดึงประวัติออเดอร์ (เตรียมไว้ใช้ในอนาคต)
export const getMyOrders = async () => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.get('/orders');
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  return Array.isArray(response) ? response : (response?.data || []);
};

export const getOrderDetail = async (orderId: number) => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.get(`/orders/${orderId}`);
  return response;
};

// ดึงออเดอร์ทั้งหมด (สำหรับคนขาย) - ใช้ endpoint สำหรับ Seller
export const getAllOrders = async () => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.get('/orders/seller/all');
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  return Array.isArray(response) ? response : (response?.data || []);
};

// อัปเดตสถานะออเดอร์
export const updateOrderStatus = async (
  orderId: number,
  status: string,
  trackingNumber?: string,
  provider?: string,
) => {
  // status: 'PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'Not Process'
  const body: any = { status };
  if (trackingNumber && provider) {
    body.trackingNumber = trackingNumber;
    body.provider = provider;
  }
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.patch(`/orders/${orderId}/status`, body);
  return response;
};

// ✅ ลูกค้ายกเลิกคำสั่งซื้อ (Smart Cancel)
export const cancelOrder = async (orderId: number, reason?: string) => {
  const response = await client.post(`/orders/${orderId}/cancel`, {
    reason: reason || '',
  });
  return response;
};

// ✅ ลูกค้าขอคืนเงิน
export const requestRefund = async (orderId: number, reason: string) => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.post(`/orders/${orderId}/refund`, { reason });
  return response;
};

// ✅ ร้านค้าตัดสินใจ (Approve/Reject)
export const decideRefund = async (
  orderId: number,
  decision: 'APPROVED' | 'REJECTED',
) => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.patch(`/orders/${orderId}/refund/decide`, {
    decision,
  });
  return response;
};

// ✅ Admin ยืนยันการชำระเงิน (สำหรับโอนเงินธนาคาร)
export const confirmPayment = async (orderId: number) => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.patch(`/orders/${orderId}/confirm-payment`);
  return response;
};

// ✅ ลูกค้ายืนยันรับสินค้า (ปิดออเดอร์) - ใช้ endpoint confirm-received
export const completeOrder = async (orderId: number) => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.patch(`/orders/${orderId}/confirm-received`);
  return response;
};

// ✅ ซื้ออีกครั้งจากออเดอร์เดิม (backend จะส่ง list สินค้ากลับมา)
export const buyAgain = async (orderId: number) => {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const response = await client.post(`/orders/${orderId}/buy-again`);
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  const buyAgainData = response?.data || response;
  return buyAgainData as {
    orderId: number;
    items: { productId: number; variantId: number | null; count: number }[];
  };
};

