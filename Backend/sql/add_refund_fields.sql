-- ✅ เพิ่มฟิลด์สำหรับระบบคืนเงิน (Refund System)
-- เพิ่ม refundSlipUrl และ refundDate ในตาราง order

-- ⚠️ หมายเหตุ: รันทีละคำสั่ง หรือรันทั้งหมดพร้อมกันก็ได้
-- ถ้า column มีอยู่แล้ว จะ error "Duplicate column name" - ข้ามได้

-- 1. เพิ่มคอลัมน์ refundSlipUrl
ALTER TABLE `order`
ADD COLUMN `refundSlipUrl` VARCHAR(255) NULL COMMENT 'เก็บรูปสลิปที่แอดมินโอนคืนลูกค้า' AFTER `refundReason`;

-- 2. เพิ่มคอลัมน์ refundDate
ALTER TABLE `order`
ADD COLUMN `refundDate` DATETIME NULL COMMENT 'วันที่คืนเงิน' AFTER `refundSlipUrl`;

-- 3. ✅ อัปเดต RefundStatus enum (เพิ่ม PENDING)
-- ⚠️ หมายเหตุ: ถ้า enum มี PENDING อยู่แล้ว จะ error - ข้ามได้
-- ตรวจสอบก่อนรัน: DESCRIBE `order`; หรือ SHOW COLUMNS FROM `order` LIKE 'refundStatus';
ALTER TABLE `order` 
MODIFY COLUMN `refundStatus` ENUM('NONE', 'PENDING', 'REQUESTED', 'APPROVED', 'REJECTED') DEFAULT 'NONE';

-- 4. ✅ สร้าง Index สำหรับค้นหารายการรอคืนเงิน (Optional - เพื่อเพิ่มประสิทธิภาพ)
-- ⚠️ หมายเหตุ: ถ้า index มีอยู่แล้ว จะ error "Duplicate key name" - ข้ามได้
CREATE INDEX `idx_order_refund_status` ON `order` (`refundStatus`);

-- ✅ ตรวจสอบผลลัพธ์ (รันแยก - ถ้า error ข้ามได้)
-- DESCRIBE `order`;
-- หรือ
-- SHOW COLUMNS FROM `order` WHERE Field IN ('refundStatus', 'refundReason', 'refundSlipUrl', 'refundDate');
