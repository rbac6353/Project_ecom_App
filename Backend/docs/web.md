# สรุปการทำขนส่ง และการอัปเดตสถานะ (สำหรับ Web)

เอกสารนี้สรุป Flow การจัดส่งสินค้า และการอัปเดตสถานะคำสั่งซื้อ/การขนส่ง จาก Backend API เพื่อนำไปใช้ใน Web (หรือแอปอื่น)

---

## 1. สถานะคำสั่งซื้อ (Order Status)

| สถานะ | ความหมาย | ฝั่งที่เกี่ยวข้อง |
|--------|-----------|-------------------|
| `PENDING` | รอชำระเงิน | ลูกค้า |
| `VERIFYING` | รอตรวจสอบสลิปโอนเงิน | แอดมิน |
| `PENDING_CONFIRMATION` | ชำระแล้ว รอร้านยืนยันรับออเดอร์ | ร้านค้า |
| `PROCESSING` | ร้านรับออเดอร์แล้ว กำลังเตรียมของ (รอจัดส่ง) | ร้านค้า |
| `READY_FOR_PICKUP` | ร้านเตรียมของเสร็จ พร้อมจัดส่ง (รอไรเดอร์มารับ) | ร้านค้า / ไรเดอร์ |
| `RIDER_ASSIGNED` | มีไรเดอร์รับงานแล้ว กำลังไปรับของ | ไรเดอร์ |
| `PICKED_UP` | ไรเดอร์รับของจากร้านแล้ว | ไรเดอร์ |
| `SHIPPED` | สินค้าอยู่ระหว่างขนส่ง | ไรเดอร์ |
| `OUT_FOR_DELIVERY` | ไรเดอร์กำลังนำจ่ายถึงลูกค้า | ไรเดอร์ |
| `DELIVERED` | ไรเดอร์ส่งถึงปลายทางแล้ว (รอลูกค้ากดยืนยันรับ) | ลูกค้า |
| `COMPLETED` | ลูกค้ายืนยันรับสินค้าแล้ว / ธุรกรรมเสร็จสมบูรณ์ | ลูกค้า |
| `CANCELLED` | ยกเลิก | หลายฝ่าย |
| `CANCELLATION_REQUESTED` | ลูกค้าขอยกเลิก รอร้านอนุมัติ | ร้านค้า |
| `REFUND_REQUESTED` / `REFUNDED` | เกี่ยวกับการคืนเงิน/คืนสินค้า | แอดมิน/ร้าน |

---

## 2. สถานะการขนส่ง (Shipment Status)

ใช้กับตาราง `Shipment` (หนึ่งออเดอร์มีหนึ่ง Shipment เมื่อเข้าขั้นตอนจัดส่ง)

| สถานะ | ความหมาย |
|--------|-----------|
| `WAITING_PICKUP` | รอไรเดอร์มารับของที่ร้าน |
| `IN_TRANSIT` | ไรเดอร์รับของแล้ว อยู่ระหว่างขนส่ง |
| `OUT_FOR_DELIVERY` | กำลังนำจ่ายถึงลูกค้า |
| `DELIVERED` | ส่งสำเร็จ |
| `FAILED` | ส่งไม่สำเร็จ (มีเหตุผลใน `failedReason`) |

**การ sync กับ Order:**  
เมื่อไรเดอร์อัปเดตสถานะ Shipment ระบบจะอัปเดต Order ตามนี้:

- Shipment `IN_TRANSIT` → Order `SHIPPED`
- Shipment `OUT_FOR_DELIVERY` → Order `OUT_FOR_DELIVERY`
- Shipment `DELIVERED` → Order `DELIVERED`

---

## 3. Flow การจัดส่ง (สรุป)

1. **ลูกค้าสั่งของ**  
   - สร้าง Order (มี `shippingAddress`, `shippingPhone`)  
   - สถานะเริ่มต้น: `PENDING` หรือ `VERIFYING` ตามวิธีชำระเงิน

2. **ชำระเงินและร้านรับออเดอร์**  
   - หลังยืนยันสลิป/ชำระเงิน → Order เป็น `PENDING_CONFIRMATION`  
   - ร้านกดยอมรับออเดอร์ → Order เป็น `PROCESSING`  
   - ระบบสร้าง **Shipment** ให้ออเดอร์ (สถานะ `WAITING_PICKUP`) เมื่อ Order เป็น `PROCESSING` / `READY_FOR_PICKUP` / `SHIPPED`

3. **ร้านกด "พร้อมจัดส่ง"**  
   - ร้านอัปเดต Order เป็น `READY_FOR_PICKUP` (หรือ `PROCESSING` แล้วค่อยเป็น `READY_FOR_PICKUP`)  
   - ถ้ายังไม่มี Shipment ระบบจะสร้างให้  
   - บันทึก Tracking log: "กำลังค้นหาคนขับ"

4. **ไรเดอร์รับงาน**  
   - ไรเดอร์ดึงรายการงานที่พร้อมรับ → กด "รับงาน" → ระบบ assign `courierId` ให้ Shipment (สถานะยัง `WAITING_PICKUP`)  
   - Order ถูกอัปเดตเป็น `RIDER_ASSIGNED`

5. **ไรเดอร์ไปรับของที่ร้าน**  
   - ไรเดอร์กด "รับของแล้ว" (pickup) → Shipment เป็น `IN_TRANSIT`, Order เป็น `SHIPPED`  
   - บันทึก `pickupTime`

6. **ไรเดอร์นำจ่าย**  
   - ไรเดอร์กด "กำลังนำจ่าย" → Shipment เป็น `OUT_FOR_DELIVERY`, Order เป็น `OUT_FOR_DELIVERY`

7. **ส่งสำเร็จ**  
   - ไรเดอร์กด "ส่งสำเร็จ" พร้อมหลักฐาน (รูป/ลายเซ็น/พิกัด/COD) → Shipment เป็น `DELIVERED`, Order เป็น `DELIVERED`  
   - บันทึก `deliveredTime`, `proofImage`, `signatureImage` ฯลฯ

8. **ลูกค้ายืนยันรับ**  
   - ลูกค้ากด "ฉันได้รับสินค้าแล้ว" → Order เป็น `COMPLETED`

---

## 4. API ที่เกี่ยวข้อง (สรุป)

Base URL ตามที่ Web ของคุณตั้งค่า (เช่น `https://your-api.com`)

### 4.1 ลูกค้า / ร้าน (Orders)

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/orders` | สร้างคำสั่งซื้อ (ส่ง `shippingAddress`, `shippingPhone` ใน body) |
| POST | `/orders/preview-shipping` | คำนวณค่าจัดส่ง (ก่อนสร้างออเดอร์) |
| GET | `/orders/:id` | ดูรายละเอียดออเดอร์ |
| GET | `/orders/:id/tracking` | **Timeline การขนส่ง** (เรียงจากเก่า→ใหม่) ใช้แสดงสถานะให้ลูกค้า |
| PATCH | `/orders/:id/status` | **อัปเดตสถานะออเดอร์** (ร้านค้า/แอดมิน) body: `{ "status": "PROCESSING" | "READY_FOR_PICKUP" | "SHIPPED" | ... , "trackingNumber?", "provider?" }` |

### 4.2 การขนส่ง – ลูกค้า

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/shipments/orders/:orderId/detail` | ดูรายละเอียด Shipment ของออเดอร์ (ที่อยู่จัดส่ง, หลักฐานส่ง, ฯลฯ) — ถ้ายังไม่มี shipment จะได้ `null` |

### 4.3 การขนส่ง – ไรเดอร์ (Courier)

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/shipments/available-jobs` | งานที่พร้อมรับ (Shipment สถานะ WAITING_PICKUP, ยังไม่มี courierId) |
| GET | `/shipments/my-active-jobs` | งานที่ไรเดอร์รับแล้ว (ยังไม่ส่งเสร็จ) |
| GET | `/shipments/orders/:id/preview` | ดูข้อมูลพัสดุ/ออเดอร์ก่อนรับงาน (เช่น สแกน QR) |
| GET | `/shipments/tasks?type=ACTIVE|HISTORY` | งานของไรเดอร์ (Active / History) |
| PATCH | `/shipments/:id/accept` | ไรเดอร์กด "รับงาน" |
| PATCH | `/shipments/:id/pickup` | ไรเดอร์กด "รับของที่ร้านแล้ว" (Shipment → IN_TRANSIT, Order → SHIPPED) |
| PATCH | `/shipments/:id/out-for-delivery` | ไรเดอร์กด "กำลังนำจ่าย" |
| PATCH | `/shipments/:id/complete` | ไรเดอร์กด "ส่งสำเร็จ" body: `{ proofImage?, collectedCod?, signatureImage?, location? }` |
| PATCH | `/shipments/:id/status` | อัปเดตสถานะ Shipment โดยตรง (body มี `status` และ optional หลักฐาน) |

---

## 5. การอัปเดตสถานะ (สรุปสำหรับ Web)

### ร้านค้า (Seller)

- **ยอมรับออเดอร์:** PATCH `/orders/:id/status` → `status: "PENDING_CONFIRMATION"` หรือตาม flow ที่ Backend กำหนด  
- **กำลังเตรียมของ:** PATCH `/orders/:id/status` → `status: "PROCESSING"`  
- **พร้อมจัดส่ง (รอไรเดอร์):** PATCH `/orders/:id/status` → `status: "READY_FOR_PICKUP"`  
  - ระบบจะสร้าง Shipment (ถ้ายังไม่มี) และเพิ่ม log "กำลังค้นหาคนขับ"  
- **กรณีส่งเอง/มีเลขพัสดุ:** PATCH `/orders/:id/status` → `status: "SHIPPED"` พร้อม `trackingNumber`, `provider` ได้

### ไรเดอร์ (Courier)

- รับงาน: `PATCH /shipments/:id/accept`  
- รับของที่ร้าน: `PATCH /shipments/:id/pickup`  
- กำลังนำจ่าย: `PATCH /shipments/:id/out-for-delivery`  
- ส่งสำเร็จ: `PATCH /shipments/:id/complete` (ส่ง proof/signature/location ตามที่ API รองรับ)

### ลูกค้า (Customer)

- ดูสถานะ: `GET /orders/:id/tracking` → แสดง Timeline  
- ยืนยันรับสินค้า: ใช้ endpoint ที่ Backend กำหนดสำหรับ "ยืนยันรับ" (มักจะ PATCH order หรือ POST confirm) → Order เป็น `COMPLETED`

---

## 6. ข้อมูลที่ใช้แสดงใน Web

- **หน้าออเดอร์ของลูกค้า:** ใช้ `GET /orders/:id` + `GET /orders/:id/tracking` เพื่อแสดงสถานะและ Timeline  
- **หน้าออเดอร์ของร้าน:** ใช้ `GET /orders/:id` + PATCH status ตามขั้นตอนด้านบน  
- **หน้าไรเดอร์:** ใช้ `GET /shipments/available-jobs`, `GET /shipments/my-active-jobs` และ PATCH ตาม flow รับงาน → รับของ → นำจ่าย → ส่งสำเร็จ  

การทำขนส่งและอัปเดตสถานะใน Web ให้เรียก API ตามตารางและ Flow ข้างต้น จะสอดคล้องกับระบบ Backend นี้
