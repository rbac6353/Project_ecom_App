-- sql/fix_duplicate_slip_race_condition.sql
-- ✅ แก้ไข Race Condition ในระบบตรวจสอบสลิปซ้ำ (Duplicate Slip Detection)

-- Step 1: เพิ่ม column สำหรับเก็บ slipReference (reference number จาก EasySlip API)
-- ถ้ายังไม่มี column นี้
ALTER TABLE `order`
ADD COLUMN IF NOT EXISTS `slipReference` VARCHAR(255) NULL COMMENT 'Reference number จาก EasySlip API สำหรับตรวจสอบ duplicate slip';

-- Step 2: ลบข้อมูล Duplicate ที่มีอยู่ก่อน (เก็บ record แรกสุดไว้)
-- สำหรับ paymentSlipUrl
DELETE o1 FROM `order` o1
INNER JOIN `order` o2 
WHERE o1.id > o2.id 
  AND o1.paymentSlipUrl = o2.paymentSlipUrl 
  AND o1.paymentSlipUrl IS NOT NULL 
  AND o1.paymentSlipUrl != ''
  AND o1.orderStatus NOT IN ('CANCELLED', 'REFUNDED')
  AND o2.orderStatus NOT IN ('CANCELLED', 'REFUNDED');

-- สำหรับ slipReference
DELETE o1 FROM `order` o1
INNER JOIN `order` o2 
WHERE o1.id > o2.id 
  AND o1.slipReference = o2.slipReference 
  AND o1.slipReference IS NOT NULL 
  AND o1.slipReference != ''
  AND o1.orderStatus NOT IN ('CANCELLED', 'REFUNDED')
  AND o2.orderStatus NOT IN ('CANCELLED', 'REFUNDED');

-- Step 3: เพิ่ม UNIQUE Constraint สำหรับ paymentSlipUrl (เฉพาะออเดอร์ที่ยังไม่ถูกยกเลิก)
-- ใช้ Generated Column สำหรับ Partial Unique Index (MySQL 5.7+)
ALTER TABLE `order`
ADD COLUMN IF NOT EXISTS `paymentSlipUrlUnique` VARCHAR(500) GENERATED ALWAYS AS (
  CASE 
    WHEN `paymentSlipUrl` IS NOT NULL 
      AND `paymentSlipUrl` != '' 
      AND `orderStatus` NOT IN ('CANCELLED', 'REFUNDED')
    THEN `paymentSlipUrl`
    ELSE NULL
  END
) STORED;

-- สร้าง Unique Index บน Generated Column
CREATE UNIQUE INDEX IF NOT EXISTS `idx_order_payment_slip_url_unique` 
ON `order`(`paymentSlipUrlUnique`);

-- Step 4: เพิ่ม UNIQUE Constraint สำหรับ slipReference (เฉพาะออเดอร์ที่ยังไม่ถูกยกเลิก)
ALTER TABLE `order`
ADD COLUMN IF NOT EXISTS `slipReferenceUnique` VARCHAR(255) GENERATED ALWAYS AS (
  CASE 
    WHEN `slipReference` IS NOT NULL 
      AND `slipReference` != '' 
      AND `orderStatus` NOT IN ('CANCELLED', 'REFUNDED')
    THEN `slipReference`
    ELSE NULL
  END
) STORED;

-- สร้าง Unique Index บน Generated Column
CREATE UNIQUE INDEX IF NOT EXISTS `idx_order_slip_reference_unique` 
ON `order`(`slipReferenceUnique`);

-- Step 5: เพิ่ม Index สำหรับการค้นหา (Performance)
CREATE INDEX IF NOT EXISTS `idx_order_payment_slip_url_status` 
ON `order`(`paymentSlipUrl`, `orderStatus`);

CREATE INDEX IF NOT EXISTS `idx_order_slip_reference_status` 
ON `order`(`slipReference`, `orderStatus`);

-- Step 6: ตรวจสอบผลลัพธ์
SELECT 
  'Migration Complete' AS status,
  COUNT(*) AS total_orders,
  COUNT(DISTINCT paymentSlipUrl) AS unique_slip_urls,
  COUNT(DISTINCT slipReference) AS unique_slip_references
FROM `order`
WHERE `orderStatus` NOT IN ('CANCELLED', 'REFUNDED')
  AND (`paymentSlipUrl` IS NOT NULL OR `slipReference` IS NOT NULL);

-- ✅ Migration Complete
-- หมายเหตุ: 
-- 1. Generated Columns จะอัปเดตอัตโนมัติเมื่อ paymentSlipUrl, slipReference หรือ orderStatus เปลี่ยน
-- 2. Unique Index จะป้องกันการบันทึกสลิปซ้ำในระดับ database
-- 3. ถ้ามี duplicate records อยู่แล้ว จะถูกลบออกก่อนสร้าง unique index
