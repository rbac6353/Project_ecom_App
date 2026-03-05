-- sql/enforce_strict_security.sql
-- ✅ Enforce Strict One-Time Slip Usage (Permanent Unique)
-- สลิป 1 ใบ ใช้ได้กับ 1 ออเดอร์เท่านั้น (ห้ามใช้ซ้ำเด็ดขาด แม้ออเดอร์เก่าจะถูกยกเลิก)

-- ============================================
-- Step 1: Remove Old Generated Columns (if exists)
-- ============================================
-- ลบ Generated Columns เก่าที่ใช้ conditional logic (ถ้ามี)
-- เพื่อเปลี่ยนเป็น Strict Unique Constraint แบบถาวร

SET @dbname = DATABASE();

-- 1.1: ลบ Index ที่ผูกกับ Generated Columns (ถ้ามี)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'order'
      AND INDEX_NAME = 'idx_order_payment_slip_url_unique'
  ) > 0,
  'ALTER TABLE `order` DROP INDEX `idx_order_payment_slip_url_unique`;',
  'SELECT "Index idx_order_payment_slip_url_unique does not exist, skipping drop" AS status;'
));
PREPARE dropIndex FROM @preparedStatement;
EXECUTE dropIndex;
DEALLOCATE PREPARE dropIndex;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'order'
      AND INDEX_NAME = 'idx_order_slip_reference_unique'
  ) > 0,
  'ALTER TABLE `order` DROP INDEX `idx_order_slip_reference_unique`;',
  'SELECT "Index idx_order_slip_reference_unique does not exist, skipping drop" AS status;'
));
PREPARE dropIndex FROM @preparedStatement;
EXECUTE dropIndex;
DEALLOCATE PREPARE dropIndex;

-- 1.2: ลบ Generated Columns (ถ้ามี)
SET @tablename = 'order';
SET @columnname = 'paymentSlipUrlUnique';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  CONCAT('ALTER TABLE `', @tablename, '` DROP COLUMN `', @columnname, '`;'),
  'SELECT "Column paymentSlipUrlUnique does not exist, skipping drop" AS status;'
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

SET @columnname = 'slipReferenceUnique';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  CONCAT('ALTER TABLE `', @tablename, '` DROP COLUMN `', @columnname, '`;'),
  'SELECT "Column slipReferenceUnique does not exist, skipping drop" AS status;'
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- ============================================
-- Step 2: Handle Existing Duplicate Data
-- ============================================
-- จัดการข้อมูลซ้ำที่มีอยู่เดิม: เก็บเฉพาะออเดอร์ล่าสุด (ID สูงสุด) สำหรับแต่ละ slip
-- ออเดอร์เก่าจะถูกตั้งค่า paymentSlipUrl และ slipReference เป็น NULL

-- 2.1: สำหรับ paymentSlipUrl - เก็บออเดอร์ล่าสุด (ID สูงสุด) สำหรับแต่ละ URL
UPDATE `order` o1
INNER JOIN (
  SELECT 
    `paymentSlipUrl`,
    MAX(`id`) AS `maxId`
  FROM `order`
  WHERE `paymentSlipUrl` IS NOT NULL 
    AND `paymentSlipUrl` != ''
  GROUP BY `paymentSlipUrl`
  HAVING COUNT(*) > 1
) o2 ON o1.`paymentSlipUrl` = o2.`paymentSlipUrl` AND o1.`id` < o2.`maxId`
SET o1.`paymentSlipUrl` = NULL;

-- 2.2: สำหรับ slipReference - เก็บออเดอร์ล่าสุด (ID สูงสุด) สำหรับแต่ละ Reference
UPDATE `order` o1
INNER JOIN (
  SELECT 
    `slipReference`,
    MAX(`id`) AS `maxId`
  FROM `order`
  WHERE `slipReference` IS NOT NULL 
    AND `slipReference` != ''
  GROUP BY `slipReference`
  HAVING COUNT(*) > 1
) o2 ON o1.`slipReference` = o2.`slipReference` AND o1.`id` < o2.`maxId`
SET o1.`slipReference` = NULL;

-- ============================================
-- Step 3: Create Strict Unique Indexes
-- ============================================
-- สร้าง Unique Index แบบถาวร (Permanent Unique) บนคอลัมน์จริง
-- ห้ามซ้ำเด็ดขาด ไม่ว่า orderStatus จะเป็นอะไร (Strict Mode)

-- 3.1: ลบ Index เก่า (ถ้ามี) - เพื่อสร้างใหม่
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'order'
      AND INDEX_NAME = 'idx_order_payment_slip_url_permanent'
  ) > 0,
  'ALTER TABLE `order` DROP INDEX `idx_order_payment_slip_url_permanent`;',
  'SELECT "Index idx_order_payment_slip_url_permanent does not exist, skipping drop" AS status;'
));
PREPARE dropIndex FROM @preparedStatement;
EXECUTE dropIndex;
DEALLOCATE PREPARE dropIndex;

-- 3.2: สร้าง Strict Unique Index สำหรับ paymentSlipUrl
-- ✅ Strict Mode: ห้ามซ้ำเด็ดขาด ไม่ว่า orderStatus จะเป็นอะไร
-- MySQL จะ ignore NULL values โดยอัตโนมัติ แต่จะตรวจสอบ duplicate สำหรับ non-NULL values
CREATE UNIQUE INDEX `idx_order_payment_slip_url_permanent` 
ON `order`(`paymentSlipUrl`);

-- 3.3: ลบ Index เก่า (ถ้ามี) - เพื่อสร้างใหม่
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'order'
      AND INDEX_NAME = 'idx_order_slip_reference_permanent'
  ) > 0,
  'ALTER TABLE `order` DROP INDEX `idx_order_slip_reference_permanent`;',
  'SELECT "Index idx_order_slip_reference_permanent does not exist, skipping drop" AS status;'
));
PREPARE dropIndex FROM @preparedStatement;
EXECUTE dropIndex;
DEALLOCATE PREPARE dropIndex;

-- 3.4: สร้าง Strict Unique Index สำหรับ slipReference
-- ✅ Strict Mode: ห้ามซ้ำเด็ดขาด ไม่ว่า orderStatus จะเป็นอะไร
CREATE UNIQUE INDEX `idx_order_slip_reference_permanent` 
ON `order`(`slipReference`);

-- ============================================
-- Step 4: Verification
-- ============================================
-- ตรวจสอบผลลัพธ์

SELECT 
  '✅ Strict Security Migration Complete' AS status,
  COUNT(*) AS total_orders,
  COUNT(DISTINCT paymentSlipUrl) AS unique_slip_urls,
  COUNT(DISTINCT slipReference) AS unique_slip_references,
  COUNT(CASE WHEN paymentSlipUrl IS NOT NULL AND paymentSlipUrl != '' THEN 1 END) AS orders_with_slip_url,
  COUNT(CASE WHEN slipReference IS NOT NULL AND slipReference != '' THEN 1 END) AS orders_with_slip_reference
FROM `order`;

-- ตรวจสอบว่า Strict Unique Indexes ถูกสร้างแล้ว
SELECT 
  INDEX_NAME,
  COLUMN_NAME,
  NON_UNIQUE,
  SEQ_IN_INDEX,
  CASE 
    WHEN NON_UNIQUE = 0 THEN '✅ UNIQUE (Strict Mode)'
    ELSE '❌ NOT UNIQUE'
  END AS index_type
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = 'order'
  AND INDEX_NAME IN (
    'idx_order_payment_slip_url_permanent',
    'idx_order_slip_reference_permanent'
  )
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ============================================
-- ✅ Migration Complete
-- ============================================
-- หมายเหตุ: 
-- 1. Unique Indexes จะป้องกันการบันทึกสลิปซ้ำในระดับ database แบบถาวร (Strict Mode)
-- 2. MySQL จะ ignore NULL values ใน Unique Index โดยอัตโนมัติ
-- 3. Application level ต้องจัดการ empty string เพื่อป้องกัน duplicate
-- 4. สลิปที่ถูกใช้แล้วจะถือว่า "Used" ตลอดไป (ห้ามใช้ซ้ำแม้ออเดอร์เก่าจะถูกยกเลิก)
-- 5. ถ้ามี duplicate records อยู่แล้ว จะถูกจัดการก่อนสร้าง unique index (เก็บออเดอร์ล่าสุด)
