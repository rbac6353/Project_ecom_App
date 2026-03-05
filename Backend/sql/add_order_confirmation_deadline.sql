-- ============================================
-- Migration: Add confirmationDeadline and isAutoCancelled to order table
-- Description: เพิ่มคอลัมน์สำหรับระบบ Auto-Cancellation เมื่อร้านค้าไม่ยืนยันรับออเดอร์ภายใน 24 ชั่วโมง
-- Date: 2024
-- ============================================

-- Step 1: เพิ่มคอลัมน์ confirmationDeadline (เวลาเส้นตายสำหรับร้านค้ายืนยันรับออเดอร์)
ALTER TABLE `order`
ADD COLUMN IF NOT EXISTS `confirmationDeadline` DATETIME NULL DEFAULT NULL
COMMENT 'เวลาเส้นตายสำหรับร้านค้ายืนยันรับออเดอร์ (24 ชั่วโมงหลังจากร้านยอมรับออเดอร์)';

-- Step 2: เพิ่มคอลัมน์ isAutoCancelled (Flag บอกว่าถูกยกเลิกโดยระบบอัตโนมัติ)
ALTER TABLE `order`
ADD COLUMN IF NOT EXISTS `isAutoCancelled` TINYINT(1) NOT NULL DEFAULT 0
COMMENT 'Flag บอกว่าถูกยกเลิกโดยระบบอัตโนมัติ (1 = ถูกยกเลิกโดยระบบ, 0 = ไม่ใช่)';

-- Step 3: เพิ่ม Index สำหรับการค้นหาออเดอร์ที่หมดเวลา (Performance)
CREATE INDEX IF NOT EXISTS `idx_order_confirmation_deadline` 
ON `order`(`confirmationDeadline`);

CREATE INDEX IF NOT EXISTS `idx_order_status_confirmation_deadline` 
ON `order`(`orderStatus`, `confirmationDeadline`);

-- Step 4: ตรวจสอบผลลัพธ์
SELECT 
  'Migration Complete' AS status,
  COUNT(*) AS total_orders,
  COUNT(CASE WHEN `confirmationDeadline` IS NOT NULL THEN 1 END) AS orders_with_deadline,
  COUNT(CASE WHEN `isAutoCancelled` = 1 THEN 1 END) AS auto_cancelled_orders
FROM `order`;

-- ✅ Migration Complete
-- หมายเหตุ:
-- 1. confirmationDeadline จะถูกตั้งค่าเมื่อ orderStatus เปลี่ยนเป็น PENDING_CONFIRMATION
-- 2. isAutoCancelled จะถูกตั้งค่าเป็น 1 เมื่อระบบยกเลิกออเดอร์อัตโนมัติ
-- 3. Index จะช่วยเพิ่มประสิทธิภาพในการค้นหาออเดอร์ที่หมดเวลา
