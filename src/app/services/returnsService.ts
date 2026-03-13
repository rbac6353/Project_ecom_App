import client from '@app/api/client';
import {
  OrderReturn,
  OrderReturnStatus,
  CreateReturnPayload,
  UpdateReturnStatusPayload,
  mapOrderReturn,
  mapOrderReturns,
} from '@shared/interfaces/returns';

// re-export type เพื่อให้ screen เดิมที่ import จาก service ใช้ได้ต่อ
export type { CreateReturnPayload, UpdateReturnStatusPayload } from '@shared/interfaces/returns';

// =======================
// APIs สำหรับ "ลูกค้า"
// =======================

/**
 * ลูกค้าขอคืนสินค้าในออเดอร์ของตัวเอง
 * POST /orders/:orderId/returns
 */
export async function requestReturn(
  orderId: number,
  payload: CreateReturnPayload,
): Promise<OrderReturn> {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const res = await client.post(`/orders/${orderId}/returns`, payload);
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  const returnData = res?.data || res;
  return mapOrderReturn(returnData);
}

/**
 * ลูกค้าดูประวัติการคืนของตัวเอง
 * GET /me/returns
 */
export async function getMyReturns(): Promise<OrderReturn[]> {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const res = await client.get('/me/returns');
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  const returnsList = Array.isArray(res) ? res : (res?.data || []);
  return mapOrderReturns(returnsList);
}

/**
 * ลูกค้าดูคำขอคืนของออเดอร์หนึ่งใบ
 * GET /orders/:orderId/returns
 */
export async function getOrderReturns(orderId: number): Promise<OrderReturn[]> {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const res = await client.get(`/orders/${orderId}/returns`);
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  const returnsList = Array.isArray(res) ? res : (res?.data || []);
  return mapOrderReturns(returnsList);
}

// =======================
// APIs สำหรับ "Admin"
// (จะใช้ในหน้าจอ Admin ภายหลัง)
// =======================

/**
 * Admin ดูคำขอคืนทั้งหมด หรือ filter ตาม status
 * GET /returns/admin?status=...
 */
export async function getAdminReturns(
  status?: OrderReturnStatus,
): Promise<OrderReturn[]> {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const res = await client.get('/returns/admin', {
    params: status ? { status } : {},
  });
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  const returnsList = Array.isArray(res) ? res : (res?.data || []);
  return mapOrderReturns(returnsList);
}

/**
 * Admin เปลี่ยนสถานะคำขอคืน
 * PATCH /returns/:id/status
 */
export async function updateAdminReturnStatus(
  returnId: number,
  payload: UpdateReturnStatusPayload,
): Promise<OrderReturn> {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const res = await client.patch(`/returns/${returnId}/status`, payload);
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  const returnData = res?.data || res;
  return mapOrderReturn(returnData);
}

// =======================
// APIs สำหรับ "Seller"
// =======================

/**
 * Seller ดูคำขอคืนสินค้าของร้านตัวเอง
 * GET /seller/returns?status=REQUESTED
 */
export async function getSellerReturns(
  status?: OrderReturnStatus,
): Promise<OrderReturn[]> {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const res = await client.get('/seller/returns', {
    params: status ? { status } : {},
  });
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  const returnsList = Array.isArray(res) ? res : (res?.data || []);
  return mapOrderReturns(returnsList);
}

/**
 * Seller เปลี่ยนสถานะคำขอคืนของร้านตัวเอง
 * PATCH /seller/returns/:id/status
 */
export async function updateSellerReturnStatus(
  returnId: number,
  payload: UpdateReturnStatusPayload,
): Promise<OrderReturn> {
  // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
  const res = await client.patch(
    `/seller/returns/${returnId}/status`,
    payload,
  );
  // กันเหนียว: ถ้าหลุดมาเป็น Object ที่มี .data ให้แกะอีกรอบ
  const returnData = res?.data || res;
  return mapOrderReturn(returnData);
}


