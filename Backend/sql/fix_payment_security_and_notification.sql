-- sql/fix_payment_security_and_notification.sql
-- ✅ Hardening Database Security: Permanent Unique Constraints for Payment Slips
-- ✅ Fix Notification Table: Add updatedAt column if missing

-- ============================================
-- Step 1: Fix Notification Table
-- ============================================
-- เพิ่มคอลัมน์ updatedAt ถ้ายังไม่มี (Safe: ใช้ IF NOT EXISTS pattern)
-- ตรวจสอบว่ามีคอลัมน์อยู่แล้วหรือไม่ก่อนเพิ่ม

SET @dbname = DATABASE();
SET @tablename = 'notification';
SET @columnname = 'updatedAt';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT "Column updatedAt already exists in notification table" AS status;',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- Step 2: Remove Old Generated Columns and Indexes
-- ============================================
-- ลบ Unique Index ที่ผูกกับ Generated Columns (ถ้ามี)

-- ลบ Index สำหรับ paymentSlipUrlUnique (ถ้ามี)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order'
      AND INDEX_NAME = 'idx_order_payment_slip_url_unique'
  ) > 0,
  'ALTER TABLE `order` DROP INDEX `idx_order_payment_slip_url_unique`;',
  'SELECT "Index idx_order_payment_slip_url_unique does not exist, skipping drop" AS status;'
));
PREPARE dropIndexIfExists FROM @preparedStatement;
EXECUTE dropIndexIfExists;
DEALLOCATE PREPARE dropIndexIfExists;

-- ลบ Index สำหรับ slipReferenceUnique (ถ้ามี)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order'
      AND INDEX_NAME = 'idx_order_slip_reference_unique'
  ) > 0,
  'ALTER TABLE `order` DROP INDEX `idx_order_slip_reference_unique`;',
  'SELECT "Index idx_order_slip_reference_unique does not exist, skipping drop" AS status;'
));
PREPARE dropIndexIfExists FROM @preparedStatement;
EXECUTE dropIndexIfExists;
DEALLOCATE PREPARE dropIndexIfExists;

-- ลบ Generated Columns (ถ้ามี)
-- ตรวจสอบว่ามีคอลัมน์อยู่ก่อนลบ
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
-- Step 3: Handle Duplicate Data Before Creating Unique Indexes
-- ============================================
-- จัดการข้อมูลซ้ำ: เก็บเฉพาะออเดอร์ล่าสุด (ID สูงสุด) สำหรับแต่ละ paymentSlipUrl
-- สำหรับออเดอร์ที่ Cancel แล้ว ให้ลบ paymentSlipUrl และ slipReference ออก (NULL) เพื่อให้สามารถสร้าง Unique Index ได้

-- 3.1: สำหรับ paymentSlipUrl - เก็บออเดอร์ล่าสุด (ID สูงสุด) สำหรับแต่ละ URL
-- ลบ paymentSlipUrl จากออเดอร์เก่าที่มี URL ซ้ำ (เก็บเฉพาะออเดอร์ล่าสุด)
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

-- 3.2: สำหรับ slipReference - เก็บออเดอร์ล่าสุด (ID สูงสุด) สำหรับแต่ละ Reference
-- ลบ slipReference จากออเดอร์เก่าที่มี Reference ซ้ำ (เก็บเฉพาะออเดอร์ล่าสุด)
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
-- Step 4: Create Permanent Unique Indexes
-- ============================================
-- สร้าง Unique Index แบบถาวร (Permanent Unique) ที่คอลัมน์จริง
-- ห้ามซ้ำเด็ดขาดไม่ว่าสถานะออเดอร์จะเป็นอะไร

-- 4.1: Unique Index สำหรับ paymentSlipUrl (Permanent Unique)
-- MySQL: Unique Index จะ ignore NULL values โดยอัตโนมัติ
-- หมายเหตุ: ต้องจัดการ empty string ใน application level (ไม่ให้บันทึก empty string)
-- paymentSlipUrl เป็น varchar(255) ใน database ดังนั้นไม่ใช้ prefix length

-- ลบ Index เก่า (ถ้ามี) - ใช้ Prepared Statement แบบ Dynamic
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order'
      AND INDEX_NAME = 'idx_order_payment_slip_url_permanent'
  ) > 0,
  'ALTER TABLE `order` DROP INDEX `idx_order_payment_slip_url_permanent`;',
  'SELECT "Index idx_order_payment_slip_url_permanent does not exist, skipping drop" AS status;'
));
PREPARE dropIndex FROM @preparedStatement;
EXECUTE dropIndex;
DEALLOCATE PREPARE dropIndex;

-- สร้าง Unique Index สำหรับ paymentSlipUrl
-- MySQL จะ ignore NULL โดยอัตโนมัติ แต่จะตรวจสอบ duplicate สำหรับ non-NULL values
-- หมายเหตุ: paymentSlipUrl เป็น varchar(255) ใน database ดังนั้นไม่ใช้ prefix length
CREATE UNIQUE INDEX `idx_order_payment_slip_url_permanent` 
ON `order`(`paymentSlipUrl`);

-- 4.2: Unique Index สำหรับ slipReference (Permanent Unique)
-- ลบ Index เก่า (ถ้ามี) - ใช้ Prepared Statement แบบ Dynamic
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order'
      AND INDEX_NAME = 'idx_order_slip_reference_permanent'
  ) > 0,
  'ALTER TABLE `order` DROP INDEX `idx_order_slip_reference_permanent`;',
  'SELECT "Index idx_order_slip_reference_permanent does not exist, skipping drop" AS status;'
));
PREPARE dropIndex FROM @preparedStatement;
EXECUTE dropIndex;
DEALLOCATE PREPARE dropIndex;

-- สร้าง Unique Index สำหรับ slipReference
-- หมายเหตุ: slipReference เป็น varchar(255) ใน database ดังนั้นไม่ใช้ prefix length
CREATE UNIQUE INDEX `idx_order_slip_reference_permanent` 
ON `order`(`slipReference`);

-- ============================================
-- Step 5: Keep Performance Indexes
-- ============================================
-- เก็บ Index สำหรับการค้นหา (Performance) ไว้
-- Index เหล่านี้มีอยู่แล้วใน schema เดิม ไม่ต้องสร้างใหม่

-- ============================================
-- Step 6: Verification
-- ============================================
-- ตรวจสอบผลลัพธ์

SELECT 
  'Migration Complete' AS status,
  COUNT(*) AS total_orders,
  COUNT(DISTINCT paymentSlipUrl) AS unique_slip_urls,
  COUNT(DISTINCT slipReference) AS unique_slip_references,
  COUNT(CASE WHEN paymentSlipUrl IS NOT NULL AND paymentSlipUrl != '' THEN 1 END) AS orders_with_slip_url,
  COUNT(CASE WHEN slipReference IS NOT NULL AND slipReference != '' THEN 1 END) AS orders_with_slip_reference
FROM `order`;

-- ตรวจสอบว่า Unique Indexes ถูกสร้างแล้ว
SELECT 
  INDEX_NAME,
  COLUMN_NAME,
  NON_UNIQUE,
  SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'order'
  AND INDEX_NAME IN (
    'idx_order_payment_slip_url_permanent',
    'idx_order_slip_reference_permanent'
  )
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ✅ Migration Complete
-- หมายเหตุ: 
-- 1. Unique Indexes จะป้องกันการบันทึกสลิปซ้ำในระดับ database แบบถาวร
-- 2. MySQL จะ ignore NULL values ใน Unique Index โดยอัตโนมัติ
-- 3. Application level ต้องจัดการ empty string เพื่อป้องกัน duplicate
-- 4. ถ้ามี duplicate records อยู่แล้ว จะถูกจัดการก่อนสร้าง unique index (เก็บออเดอร์ล่าสุด)
