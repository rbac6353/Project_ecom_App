-- Migration: Add missing columns to flash_sale table
-- Date: 2026-01-08
-- Description: เพิ่ม columns ที่ขาดหายไปในตาราง flash_sale
-- Note: ใช้ camelCase column names ตาม CamelCaseNamingStrategy

-- เพิ่ม column name (ถ้ายังไม่มี)
-- MySQL ไม่รองรับ IF NOT EXISTS ใน ALTER TABLE ADD COLUMN
-- ต้องเช็คด้วย stored procedure หรือรันแยก

-- วิธีที่ 1: ใช้ IF NOT EXISTS (MySQL 8.0.19+)
-- ALTER TABLE `flash_sale` 
--   ADD COLUMN IF NOT EXISTS `name` VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'ชื่อ Campaign เช่น "12.12 Midnight Sale"' AFTER `id`,
--   ADD COLUMN IF NOT EXISTS `description` TEXT NULL COMMENT 'คำอธิบาย Campaign' AFTER `isActive`;

-- วิธีที่ 2: ใช้ stored procedure เพื่อเช็คก่อนเพิ่ม (รองรับ MySQL ทุกเวอร์ชัน)
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS `AddFlashSaleColumnsIfNotExists`()
BEGIN
    -- เพิ่ม column name
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'flash_sale' 
        AND COLUMN_NAME = 'name'
    ) THEN
        ALTER TABLE `flash_sale` 
        ADD COLUMN `name` VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'ชื่อ Campaign เช่น "12.12 Midnight Sale"' AFTER `id`;
    END IF;

    -- เพิ่ม column description
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'flash_sale' 
        AND COLUMN_NAME = 'description'
    ) THEN
        ALTER TABLE `flash_sale` 
        ADD COLUMN `description` TEXT NULL COMMENT 'คำอธิบาย Campaign' AFTER `isActive`;
    END IF;

    -- เพิ่ม column createdAt
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'flash_sale' 
        AND COLUMN_NAME = 'createdAt'
    ) THEN
        ALTER TABLE `flash_sale` 
        ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'วันที่สร้าง';
    END IF;
END$$

DELIMITER ;

-- รัน stored procedure
CALL `AddFlashSaleColumnsIfNotExists`();

-- ลบ stored procedure หลังจากใช้เสร็จ
DROP PROCEDURE IF EXISTS `AddFlashSaleColumnsIfNotExists`;

-- วิธีที่ 3: รัน SQL นี้โดยตรง (ถ้าแน่ใจว่า table มีอยู่แล้วแต่ไม่มี columns เหล่านี้)
-- ALTER TABLE `flash_sale` 
--   ADD COLUMN `name` VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'ชื่อ Campaign เช่น "12.12 Midnight Sale"' AFTER `id`,
--   ADD COLUMN `description` TEXT NULL COMMENT 'คำอธิบาย Campaign' AFTER `isActive`;
