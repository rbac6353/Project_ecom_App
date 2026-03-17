# เอกสารฐานข้อมูล ecom1 (Database Documentation)

---

## ตารางที่ 3.1 ตาราง User

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสผู้ใช้ | PK |
| 2 | email | varchar | UNIQUE, NOT NULL | อีเมลผู้ใช้ | - |
| 3 | password | varchar | NULL | รหัสผ่าน (เข้ารหัส) | - |
| 4 | name | varchar | NULL | ชื่อผู้ใช้ | - |
| 5 | picture | varchar | NULL | URL รูปโปรไฟล์ | - |
| 6 | role | varchar | DEFAULT 'user' | บทบาทผู้ใช้ (user/admin/seller) | - |
| 7 | enabled | tinyint | DEFAULT true | สถานะเปิด/ปิดบัญชี | - |
| 8 | address | varchar | NULL | ที่อยู่จัดส่ง | - |
| 9 | phone | varchar | NULL | เบอร์โทรศัพท์ | - |
| 10 | notificationToken | varchar | NULL | Token สำหรับ Push Notification | - |
| 11 | resetPasswordToken | varchar | NULL | Token รีเซ็ตรหัสผ่าน | - |
| 12 | resetPasswordExpires | datetime | NULL | เวลาหมดอายุ Token รีเซ็ต | - |
| 13 | isEmailVerified | tinyint | DEFAULT false | สถานะยืนยันอีเมล | - |
| 14 | verificationToken | varchar | NULL | OTP / Token สำหรับยืนยันอีเมล | - |
| 15 | googleId | varchar | UNIQUE, NULL | รหัส Google (สำหรับ Login ด้วย Google) | - |
| 16 | facebookId | varchar | UNIQUE, NULL | รหัส Facebook (สำหรับ Login ด้วย Facebook) | - |
| 17 | points | int | DEFAULT 0 | แต้มสะสม (Loyalty Points) | - |
| 18 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้างบัญชี | - |
| 19 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.2 ตาราง Category

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสหมวดหมู่ | PK |
| 2 | name | varchar | NOT NULL | ชื่อหมวดหมู่ | - |
| 3 | slug | varchar | UNIQUE, NULL | URL-friendly ของหมวดหมู่ | - |
| 4 | image | text | NULL | URL รูปภาพหมวดหมู่ | - |

---

## ตารางที่ 3.3 ตาราง Subcategory

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสหมวดหมู่ย่อย | PK |
| 2 | name | varchar | NOT NULL | ชื่อหมวดหมู่ย่อย | - |
| 3 | iconType | varchar | DEFAULT 'emoji' | ประเภทไอคอน (emoji/image/ionicon) | - |
| 4 | iconEmoji | varchar | NULL | อีโมจิสำหรับไอคอน | - |
| 5 | iconImageUrl | text | NULL | URL รูปไอคอน | - |
| 6 | iconIonicon | varchar | NULL | ชื่อ Ionicon สำหรับไอคอน | - |
| 7 | categoryId | int | NOT NULL | รหัสหมวดหมู่หลักที่เกี่ยวข้อง | FK |
| 8 | storeId | int | NULL | รหัสร้านค้า (ถ้าเป็นหมวดเฉพาะร้าน) | FK |
| 9 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 10 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.4 ตาราง Store

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสร้านค้า | PK |
| 2 | name | varchar | NOT NULL | ชื่อร้านค้า | - |
| 3 | description | text | NULL | คำอธิบายร้านค้า | - |
| 4 | logo | varchar | NULL | URL โลโก้ร้านค้า | - |
| 5 | isVerified | tinyint | DEFAULT false | สถานะยืนยันร้านค้า | - |
| 6 | rating | decimal(3,2) | DEFAULT 0 | คะแนนเฉลี่ยร้านค้า | - |
| 7 | followerCount | int | DEFAULT 0 | จำนวนผู้ติดตาม | - |
| 8 | isActive | tinyint | DEFAULT true | สถานะเปิด/ปิดร้านค้า | - |
| 9 | isMall | tinyint | DEFAULT false | สถานะร้านค้าทางการ (Mall) | - |
| 10 | ownerId | int | NOT NULL | รหัสเจ้าของร้านค้า | FK |

---

## ตารางที่ 3.5 ตาราง Product

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสสินค้า | PK |
| 2 | title | varchar | NOT NULL | ชื่อสินค้า | - |
| 3 | description | text | NULL | รายละเอียดสินค้า | - |
| 4 | price | decimal(10,2) | NOT NULL | ราคาสินค้า | - |
| 5 | sold | int | DEFAULT 0 | จำนวนที่ขายได้ | - |
| 6 | quantity | int | NOT NULL | จำนวนสินค้าในสต็อก | - |
| 7 | discountPrice | decimal(10,2) | NULL | ราคาลดพิเศษ | - |
| 8 | discountStartDate | datetime | NULL | วันที่เริ่มลดราคา | - |
| 9 | discountEndDate | datetime | NULL | วันที่สิ้นสุดลดราคา | - |
| 10 | slug | varchar | UNIQUE, NULL | URL-friendly ของสินค้า | - |
| 11 | isActive | tinyint | DEFAULT true | สถานะเปิด/ปิดการขาย | - |
| 12 | categoryId | int | NOT NULL | รหัสหมวดหมู่สินค้า | FK |
| 13 | storeId | int | NULL | รหัสร้านค้าที่ขาย | FK |
| 14 | subcategoryId | int | NULL | รหัสหมวดหมู่ย่อย | FK |
| 15 | subcategory | varchar | NULL | ชื่อหมวดหมู่ย่อย (backward compat) | - |

---

## ตารางที่ 3.6 ตาราง ProductVariant

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสตัวเลือกสินค้า | PK |
| 2 | productId | int | NOT NULL | รหัสสินค้าหลัก | FK |
| 3 | name | varchar | NOT NULL | ชื่อตัวเลือก เช่น "สีแดง - XL" | - |
| 4 | sku | varchar(64) | NULL | รหัส SKU ต่อ variant | - |
| 5 | price | decimal(10,2) | NULL | ราคาเฉพาะ variant (null = ใช้ราคาหลัก) | - |
| 6 | stock | int | NOT NULL | จำนวนสต็อกเฉพาะ variant | - |
| 7 | imageIndex | int | NULL | ลำดับรูปภาพสำหรับ variant | - |
| 8 | attributes | json | NULL | คุณสมบัติ เช่น {"COLOR": "ดำ", "SIZE": "M"} | - |

---

## ตารางที่ 3.7 ตาราง Image

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสรูปภาพ | PK |
| 2 | asset_id | varchar | NULL | รหัส Asset จาก Cloudinary | - |
| 3 | public_id | varchar | NULL | รหัส Public จาก Cloudinary | - |
| 4 | secure_url | varchar | NULL | URL รูปภาพแบบปลอดภัย (HTTPS) | - |
| 5 | url | varchar | NOT NULL | URL รูปภาพ | - |
| 6 | productId | int | NOT NULL | รหัสสินค้าที่เกี่ยวข้อง | FK |

---

## ตารางที่ 3.8 ตาราง Cart

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสตะกร้าสินค้า | PK |
| 2 | cartTotal | decimal(10,2) | DEFAULT 0 | ยอดรวมในตะกร้า | - |
| 3 | orderedById | int | NOT NULL | รหัสผู้ใช้เจ้าของตะกร้า | FK |
| 4 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้างตะกร้า | - |
| 5 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.9 ตาราง ProductOnCart

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสรายการสินค้าในตะกร้า | PK |
| 2 | cartId | int | NOT NULL | รหัสตะกร้าที่เกี่ยวข้อง | FK |
| 3 | productId | int | NOT NULL | รหัสสินค้า | FK |
| 4 | variantId | int | NULL | รหัสตัวเลือกสินค้า | FK |
| 5 | count | int | NOT NULL | จำนวนสินค้า | - |
| 6 | price | decimal(10,2) | NOT NULL | ราคาต่อชิ้น | - |

---

## ตารางที่ 3.10 ตาราง Order

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสคำสั่งซื้อ | PK |
| 2 | cartTotal | decimal(10,2) | NOT NULL | ยอดรวมคำสั่งซื้อ | - |
| 3 | orderStatus | enum | DEFAULT 'PENDING' | สถานะคำสั่งซื้อ (PENDING, VERIFYING, PROCESSING, SHIPPED ฯลฯ) | - |
| 4 | shippingAddress | varchar | NULL | ที่อยู่จัดส่ง | - |
| 5 | shippingPhone | varchar | NULL | เบอร์โทรจัดส่ง | - |
| 6 | discountAmount | decimal(10,2) | DEFAULT 0 | จำนวนเงินส่วนลด | - |
| 7 | discountCode | varchar | NULL | รหัสส่วนลดที่ใช้ | - |
| 8 | orderedById | int | NOT NULL | รหัสผู้ใช้ที่สั่งซื้อ | FK |
| 9 | couponId | int | NULL | รหัสคูปองที่ใช้ | FK |
| 10 | refundStatus | enum | DEFAULT 'NONE' | สถานะการคืนเงิน (NONE, PENDING, REQUESTED ฯลฯ) | - |
| 11 | refundReason | text | NULL | เหตุผลที่ขอคืนเงิน | - |
| 12 | refundSlipUrl | varchar | NULL | URL รูปสลิปคืนเงิน | - |
| 13 | refundDate | datetime | NULL | วันที่คืนเงิน | - |
| 14 | paymentMethod | varchar | DEFAULT 'STRIPE' | วิธีการชำระเงิน (STRIPE/COD) | - |
| 15 | paymentExpiredAt | datetime | NULL | เวลาหมดอายุการชำระเงิน | - |
| 16 | paymentSlipUrl | varchar(255) | UNIQUE, NULL | URL รูปสลิปการโอนเงิน | - |
| 17 | slipReference | varchar(255) | UNIQUE, NULL | Reference จาก EasySlip API (ป้องกัน slip ซ้ำ) | - |
| 18 | trackingNumber | varchar | NULL | เลขพัสดุ | - |
| 19 | logisticsProvider | varchar | NULL | ชื่อบริษัทขนส่ง | - |
| 20 | receivedAt | datetime | NULL | เวลาที่ลูกค้ายืนยันรับสินค้า | - |
| 21 | confirmationDeadline | datetime | NULL | เส้นตายยืนยันรับออเดอร์ (24 ชม.) | - |
| 22 | isAutoCancelled | tinyint | DEFAULT false | ถูกยกเลิกโดยระบบอัตโนมัติ | - |
| 23 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้างคำสั่งซื้อ | - |
| 24 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.11 ตาราง ProductOnOrder

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสรายการสินค้าในคำสั่งซื้อ | PK |
| 2 | productId | int | NOT NULL | รหัสสินค้า | FK |
| 3 | variantId | int | NULL | รหัสตัวเลือกสินค้า | FK |
| 4 | orderId | int | NOT NULL | รหัสคำสั่งซื้อที่เกี่ยวข้อง | FK |
| 5 | count | int | NOT NULL | จำนวนสินค้า | - |
| 6 | price | decimal(10,2) | NOT NULL | ราคาต่อชิ้น | - |

---

## ตารางที่ 3.12 ตาราง Coupon

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสคูปอง | PK |
| 2 | code | varchar | UNIQUE, NOT NULL | รหัสคูปอง (เช่น GTX50OFF) | - |
| 3 | type | varchar(20) | DEFAULT 'DISCOUNT' | ประเภทคูปอง (DISCOUNT/SHIPPING/COIN) | - |
| 4 | discountAmount | decimal(10,2) | DEFAULT 0 | จำนวนเงินส่วนลด | - |
| 5 | discountPercent | decimal(5,2) | NULL | เปอร์เซ็นต์ส่วนลด | - |
| 6 | minPurchase | decimal(10,2) | NULL | ยอดซื้อขั้นต่ำ | - |
| 7 | maxDiscount | decimal(10,2) | NULL | ส่วนลดสูงสุด | - |
| 8 | title | varchar(255) | NULL | ชื่อคูปอง | - |
| 9 | description | text | NULL | คำอธิบายคูปอง | - |
| 10 | startDate | datetime | NULL | วันที่เริ่มใช้งาน | - |
| 11 | expiresAt | datetime | NULL | วันที่หมดอายุ | - |
| 12 | totalQuantity | int | NULL | จำนวนคูปองทั้งหมด (null = ไม่จำกัด) | - |
| 13 | perUserLimit | int | DEFAULT 1 | จำนวนต่อผู้ใช้ | - |
| 14 | usedCount | int | DEFAULT 0 | จำนวนที่ใช้ไปแล้ว | - |
| 15 | targetUsers | varchar(20) | DEFAULT 'ALL' | ผู้ใช้เป้าหมาย (ALL/NEW_USER/EXISTING_USER) | - |
| 16 | categoryIds | text | NULL | รหัสหมวดหมู่ (JSON array) | - |
| 17 | storeId | int | NULL | รหัสร้านค้า (null = คูปองทุกร้าน) | FK |
| 18 | isUsed | tinyint | DEFAULT false | สถานะใช้งานแล้ว (deprecated) | - |
| 19 | usedAt | datetime | NULL | วันที่ใช้งาน | - |
| 20 | userId | int | NOT NULL | รหัสผู้สร้างคูปอง (Admin/Seller) | FK |
| 21 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 22 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.13 ตาราง UserCoupon

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสการเก็บคูปอง | PK |
| 2 | userId | int | NOT NULL | รหัสผู้ใช้ที่เก็บคูปอง | FK |
| 3 | couponId | int | NOT NULL | รหัสคูปอง | FK |
| 4 | isUsed | tinyint | DEFAULT false | สถานะใช้แล้วหรือยัง | - |
| 5 | usedAt | datetime | NULL | วันที่ใช้งาน | - |
| 6 | usedInOrderId | int | NULL | รหัสคำสั่งซื้อที่ใช้คูปอง | - |
| 7 | collectedAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่เก็บคูปอง | - |
| 8 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 9 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.14 ตาราง Review

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสรีวิว | PK |
| 2 | rating | int | NOT NULL | คะแนนรีวิว (1-5) | - |
| 3 | comment | text | NULL | ข้อความรีวิว | - |
| 4 | images | text | NULL | URL รูปภาพรีวิว (JSON) | - |
| 5 | userId | int | NOT NULL | รหัสผู้ใช้ที่รีวิว | FK |
| 6 | productId | int | NOT NULL | รหัสสินค้าที่ถูกรีวิว | FK |
| 7 | storeId | int | NULL | รหัสร้านค้า | FK |
| 8 | orderItemId | int | NOT NULL | รหัสรายการคำสั่งซื้อ | - |
| 9 | sellerReply | text | NULL | ข้อความตอบกลับจากร้านค้า | - |
| 10 | isEdited | tinyint | DEFAULT false | สถานะแก้ไขแล้ว (true = ห้ามแก้ซ้ำ) | - |
| 11 | isHidden | tinyint | DEFAULT false | ถูกซ่อนโดย Admin | - |
| 12 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 13 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.15 ตาราง ReviewReport

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสรายงานรีวิว | PK |
| 2 | reviewId | int | NOT NULL | รหัสรีวิวที่ถูกรายงาน | FK |
| 3 | reporterId | int | NOT NULL | รหัสผู้แจ้ง (Seller) | FK |
| 4 | reason | text | NOT NULL | เหตุผลที่แจ้งลบ | - |
| 5 | status | enum | DEFAULT 'PENDING' | สถานะ (PENDING/RESOLVED/REJECTED) | - |
| 6 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |

---

## ตารางที่ 3.16 ตาราง Wishlist

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสรายการโปรด | PK |
| 2 | userId | int | NOT NULL | รหัสผู้ใช้ | FK |
| 3 | productId | int | NOT NULL | รหัสสินค้า | FK |
| 4 | createdAt | datetime | DEFAULT CURRENT_TIMESTAMP | วันที่เพิ่มเข้ารายการโปรด | - |

---

## ตารางที่ 3.17 ตาราง RecentlyViewed

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสรายการดูล่าสุด | PK |
| 2 | userId | int | NOT NULL | รหัสผู้ใช้ | FK |
| 3 | productId | int | NOT NULL | รหัสสินค้าที่ดู | FK |
| 4 | viewedAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | เวลาที่ดูล่าสุด (อัปเดตเมื่อดูซ้ำ) | - |

> **หมายเหตุ:** มี UNIQUE INDEX บน (userId, productId) เพื่อป้องกันรายการซ้ำ

---

## ตารางที่ 3.18 ตาราง Banner

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสแบนเนอร์ | PK |
| 2 | imageUrl | varchar | NOT NULL | URL รูปแบนเนอร์ (Cloudinary) | - |
| 3 | title | varchar | NULL | คำอธิบาย / alt text | - |
| 4 | link | varchar | NULL | Deep Link (เช่น gtxshop://product/1) | - |
| 5 | isActive | tinyint | DEFAULT true | เปิด/ปิดการแสดงผล | - |
| 6 | displayOrder | int | DEFAULT 0 | ลำดับการแสดงผล | - |
| 7 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |

---

## ตารางที่ 3.19 ตาราง Shipment

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสการจัดส่ง | PK |
| 2 | orderId | int | NOT NULL | รหัสคำสั่งซื้อที่เกี่ยวข้อง | FK |
| 3 | courierId | int | NULL | รหัสไรเดอร์/คนขับ | FK |
| 4 | status | enum | DEFAULT 'WAITING_PICKUP' | สถานะการจัดส่ง (WAITING_PICKUP/IN_TRANSIT ฯลฯ) | - |
| 5 | codAmount | decimal(10,2) | DEFAULT 0 | จำนวนเงินเก็บปลายทาง (COD) | - |
| 6 | isCodPaid | tinyint | DEFAULT false | สถานะชำระเงิน COD | - |
| 7 | proofImage | varchar | NULL | URL รูปหลักฐานการจัดส่ง | - |
| 8 | signatureImage | varchar | NULL | URL รูปลายเซ็นผู้รับ | - |
| 9 | latitude | decimal(10,6) | NULL | ละติจูดตำแหน่งจัดส่ง | - |
| 10 | longitude | decimal(10,6) | NULL | ลองจิจูดตำแหน่งจัดส่ง | - |
| 11 | failedReason | varchar | NULL | เหตุผลจัดส่งไม่สำเร็จ | - |
| 12 | pickupTime | datetime | NULL | เวลาที่ไรเดอร์รับของ | - |
| 13 | deliveredTime | datetime | NULL | เวลาที่ส่งถึงลูกค้า | - |
| 14 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 15 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.20 ตาราง TrackingHistory

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสประวัติการติดตาม | PK |
| 2 | orderId | int | NOT NULL | รหัสคำสั่งซื้อที่เกี่ยวข้อง | FK |
| 3 | status | varchar | NOT NULL | สถานะ (เช่น PICKED_UP, DELIVERED) | - |
| 4 | title | varchar | NOT NULL | หัวข้อ เช่น "เข้ารับพัสดุแล้ว" | - |
| 5 | description | varchar | NULL | รายละเอียดเพิ่มเติม | - |
| 6 | location | varchar | NULL | สถานที่หรือตำแหน่ง | - |
| 7 | createdAt | datetime | DEFAULT CURRENT_TIMESTAMP | เวลาที่เกิดเหตุการณ์ | - |

---

## ตารางที่ 3.21 ตาราง Notification

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสการแจ้งเตือน | PK |
| 2 | userId | int | NOT NULL | รหัสผู้ใช้ที่ได้รับแจ้งเตือน | FK |
| 3 | title | varchar | NOT NULL | หัวข้อแจ้งเตือน | - |
| 4 | body | varchar | NOT NULL | เนื้อหาแจ้งเตือน | - |
| 5 | type | varchar | NULL | ประเภท (ORDER/PROMOTION/SYSTEM) | - |
| 6 | data | text | NULL | ข้อมูลเพิ่มเติม (JSON) | - |
| 7 | isRead | tinyint | DEFAULT false | สถานะอ่านแล้วหรือยัง | - |
| 8 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 9 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.22 ตาราง NotificationSetting

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสการตั้งค่าแจ้งเตือน | PK |
| 2 | userId | int | NOT NULL | รหัสผู้ใช้ | FK |
| 3 | orderUpdate | tinyint | DEFAULT true | เปิด/ปิดแจ้งเตือนสถานะออเดอร์ | - |
| 4 | promotion | tinyint | DEFAULT true | เปิด/ปิดแจ้งเตือนโปรโมชั่น | - |
| 5 | chat | tinyint | DEFAULT true | เปิด/ปิดแจ้งเตือนแชท | - |

---

## ตารางที่ 3.23 ตาราง ChatMessage

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสข้อความแชท | PK |
| 2 | roomId | varchar | NOT NULL | รหัสห้องแชท (ใช้ userId ลูกค้า) | - |
| 3 | senderId | int | NOT NULL | รหัสผู้ส่งข้อความ | FK |
| 4 | message | text | NOT NULL | เนื้อหาข้อความ | - |
| 5 | type | varchar | DEFAULT 'text' | ประเภทข้อความ (text/image) | - |
| 6 | imageUrl | varchar | NULL | URL รูปภาพ (ถ้าเป็นข้อความรูปภาพ) | - |
| 7 | isRead | tinyint | DEFAULT false | สถานะอ่านแล้วหรือยัง | - |
| 8 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 9 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.24 ตาราง Wallet

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสกระเป๋าเงิน | PK |
| 2 | userId | int | NOT NULL | รหัสผู้ใช้เจ้าของกระเป๋าเงิน | FK |
| 3 | balance | decimal(10,2) | DEFAULT 0 | ยอดเงินคงเหลือ | - |
| 4 | status | enum | DEFAULT 'ACTIVE' | สถานะ (ACTIVE/FROZEN) | - |
| 5 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 6 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.25 ตาราง WalletTransaction

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสรายการธุรกรรม | PK |
| 2 | walletId | int | NOT NULL | รหัสกระเป๋าเงินที่เกี่ยวข้อง | FK |
| 3 | amount | decimal(10,2) | NOT NULL | จำนวนเงิน | - |
| 4 | type | enum | NOT NULL | ประเภท (DEPOSIT/WITHDRAW/PAYMENT/REFUND) | - |
| 5 | referenceId | varchar(255) | NULL | รหัสอ้างอิง | - |
| 6 | description | varchar(255) | NULL | คำอธิบายรายการ | - |
| 7 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 8 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.26 ตาราง StoreWallet

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสกระเป๋าเงินร้านค้า | PK |
| 2 | balance | decimal(10,2) | DEFAULT 0 | ยอดเงินคงเหลือ | - |
| 3 | storeId | int | UNIQUE, NOT NULL | รหัสร้านค้า | FK |
| 4 | createdAt | datetime | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 5 | updatedAt | datetime | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.27 ตาราง StoreWalletTransaction

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสรายการธุรกรรมร้านค้า | PK |
| 2 | walletId | int | NOT NULL | รหัสกระเป๋าเงินร้านค้า | FK |
| 3 | amount | decimal(10,2) | NOT NULL | จำนวนเงิน (บวก = รายรับ, ลบ = ถอนออก) | - |
| 4 | type | enum | NOT NULL | ประเภท (SALE_REVENUE/WITHDRAWAL/ADJUSTMENT) | - |
| 5 | referenceId | varchar | NULL | รหัสอ้างอิง เช่น "ORDER_123" | - |
| 6 | description | varchar | NULL | คำอธิบายรายการ | - |
| 7 | createdAt | datetime | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |

---

## ตารางที่ 3.28 ตาราง StoreWithdrawalRequest

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสคำขอถอนเงิน | PK |
| 2 | storeId | int | NOT NULL | รหัสร้านค้า | FK |
| 3 | walletId | int | NOT NULL | รหัสกระเป๋าเงินร้านค้า | FK |
| 4 | amount | decimal(10,2) | NOT NULL | จำนวนเงินที่ขอถอน | - |
| 5 | status | enum | DEFAULT 'PENDING' | สถานะ (PENDING/APPROVED/REJECTED) | - |
| 6 | bankName | varchar | NULL | ชื่อธนาคาร | - |
| 7 | accountNumber | varchar | NULL | เลขบัญชี | - |
| 8 | accountName | varchar | NULL | ชื่อบัญชี | - |
| 9 | proofImage | varchar | NULL | URL รูปสลิปโอนเงิน | - |
| 10 | adminNote | text | NULL | หมายเหตุจาก Admin | - |
| 11 | processedBy | int | NULL | รหัส Admin ที่ดำเนินการ | - |
| 12 | processedAt | datetime | NULL | เวลาที่ดำเนินการ | - |
| 13 | createdAt | datetime | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 14 | updatedAt | datetime | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.29 ตาราง StoreFollower

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสการติดตาม | PK |
| 2 | userId | int | NOT NULL | รหัสผู้ใช้ที่ติดตาม | FK |
| 3 | storeId | int | NOT NULL | รหัสร้านค้าที่ถูกติดตาม | FK |
| 4 | createdAt | datetime | DEFAULT CURRENT_TIMESTAMP | วันที่เริ่มติดตาม | - |

> **หมายเหตุ:** มี UNIQUE CONSTRAINT บน (userId, storeId) เพื่อป้องกันการกดซ้ำ

---

## ตารางที่ 3.30 ตาราง FlashSale

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัส Flash Sale | PK |
| 2 | name | varchar | NOT NULL | ชื่อ Campaign เช่น "12.12 Sale" | - |
| 3 | startTime | datetime | NOT NULL | เวลาเริ่มต้น Flash Sale | - |
| 4 | endTime | datetime | NOT NULL | เวลาสิ้นสุด Flash Sale | - |
| 5 | isActive | tinyint | DEFAULT true | เปิด/ปิด Campaign | - |
| 6 | description | text | NULL | คำอธิบาย Campaign | - |
| 7 | createdAt | datetime | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |

---

## ตารางที่ 3.31 ตาราง FlashSaleItem

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสรายการ Flash Sale | PK |
| 2 | flashSaleId | int | NOT NULL | รหัส Flash Sale ที่เกี่ยวข้อง | FK |
| 3 | productId | int | NOT NULL | รหัสสินค้า | FK |
| 4 | discountPrice | decimal(10,2) | NOT NULL | ราคา Flash Sale | - |
| 5 | limitStock | int | NOT NULL | โควตาสินค้า Flash Sale | - |
| 6 | sold | int | DEFAULT 0 | จำนวนที่ขายแล้ว | - |
| 7 | createdAt | datetime | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |

---

## ตารางที่ 3.32 ตาราง Faq

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสคำถามที่พบบ่อย | PK |
| 2 | question | varchar | NOT NULL | คำถาม | - |
| 3 | answer | text | NOT NULL | คำตอบ | - |
| 4 | category | varchar | NOT NULL | หมวดหมู่ (General/Payment/Shipping) | - |
| 5 | isActive | tinyint | DEFAULT true | สถานะเปิด/ปิดการแสดงผล | - |
| 6 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 7 | updatedAt | datetime(6) | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.33 ตาราง AdminLog

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสบันทึกกิจกรรม | PK |
| 2 | adminId | int | NOT NULL | รหัส Admin ที่ทำรายการ | FK |
| 3 | action | varchar | NOT NULL | ชื่อการกระทำ เช่น BAN_USER, VERIFY_STORE | - |
| 4 | targetType | varchar | NOT NULL | ประเภทเป้าหมาย เช่น USER, STORE, ORDER | - |
| 5 | targetId | int | NOT NULL | รหัสเป้าหมาย | - |
| 6 | details | text | NULL | รายละเอียดเพิ่มเติม | - |
| 7 | createdAt | datetime(6) | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |

> **หมายเหตุ:** ตารางนี้เป็น insert-only (ไม่มี updatedAt) เพื่อเก็บ Audit Log

---

## ตารางที่ 3.34 ตาราง OrderReturn (order_returns)

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสคำขอคืนสินค้า | PK |
| 2 | orderId | int | NOT NULL | รหัสคำสั่งซื้อ | FK |
| 3 | userId | int | NOT NULL | รหัสผู้ใช้ที่ขอคืน | FK |
| 4 | status | varchar(20) | DEFAULT 'REQUESTED' | สถานะ (REQUESTED/APPROVED/REJECTED/REFUNDED/CANCELLED) | - |
| 5 | reason_code | varchar(100) | NULL | รหัสเหตุผล | - |
| 6 | reason_text | text | NULL | เหตุผลการขอคืน (ข้อความ) | - |
| 7 | images | text | NULL | URL รูปภาพหลักฐาน | - |
| 8 | refund_amount | decimal(10,2) | NULL | จำนวนเงินคืน | - |
| 9 | admin_note | text | NULL | หมายเหตุจาก Admin | - |
| 10 | resolved_at | datetime | NULL | เวลาที่ดำเนินการเสร็จ | - |
| 11 | created_at | datetime | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง | - |
| 12 | updated_at | datetime | ON UPDATE CURRENT_TIMESTAMP | วันที่อัปเดตล่าสุด | - |

---

## ตารางที่ 3.35 ตาราง OrderReturnItem (order_return_items)

| No. | Field | Data type | Properties | คำอธิบาย | KEY |
|-----|-------|-----------|------------|----------|-----|
| 1 | id | int | AUTO_INCREMENT | รหัสรายการสินค้าที่ขอคืน | PK |
| 2 | orderReturnId | int | NOT NULL | รหัสคำขอคืนสินค้า | FK |
| 3 | orderItemId | int | NOT NULL | รหัสรายการสินค้าในคำสั่งซื้อ | FK |
| 4 | quantity | int | NOT NULL | จำนวนที่ขอคืน | - |
| 5 | unitPrice | decimal(10,2) | NOT NULL | ราคาต่อชิ้น | - |
