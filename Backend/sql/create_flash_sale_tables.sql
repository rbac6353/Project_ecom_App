-- Migration: Create Flash Sale Tables
-- Date: 2026-01-08
-- Description: สร้างตาราง flash_sale และ flash_sale_item สำหรับระบบ Flash Sale
-- Note: ใช้ camelCase column names ตาม CamelCaseNamingStrategy

-- 1. สร้างตาราง flash_sale (ถ้ายังไม่มี)
CREATE TABLE IF NOT EXISTS `flash_sale` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL COMMENT 'ชื่อ Campaign เช่น "12.12 Midnight Sale"',
  `startTime` DATETIME NOT NULL COMMENT 'เวลาเริ่มต้น',
  `endTime` DATETIME NOT NULL COMMENT 'เวลาสิ้นสุด',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'เปิด/ปิด Campaign',
  `description` TEXT NULL COMMENT 'คำอธิบาย Campaign',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_flash_sale_active` (`isActive`),
  INDEX `idx_flash_sale_time` (`startTime`, `endTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. เพิ่ม columns ที่ขาดหายไป (ถ้า table มีอยู่แล้วแต่ไม่มี columns เหล่านี้)
ALTER TABLE `flash_sale` 
  ADD COLUMN IF NOT EXISTS `name` VARCHAR(255) NOT NULL COMMENT 'ชื่อ Campaign เช่น "12.12 Midnight Sale"' AFTER `id`,
  ADD COLUMN IF NOT EXISTS `description` TEXT NULL COMMENT 'คำอธิบาย Campaign' AFTER `isActive`;

-- 3. สร้างตาราง flash_sale_item (ถ้ายังไม่มี)
CREATE TABLE IF NOT EXISTS `flash_sale_item` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `flashSaleId` INT NOT NULL COMMENT 'FK to flash_sale.id',
  `productId` INT NOT NULL COMMENT 'FK to product.id',
  `specialPrice` DECIMAL(10,2) NOT NULL COMMENT 'ราคา Flash Sale',
  `stock` INT NOT NULL COMMENT 'โควตาสำหรับ Flash Sale',
  `sold` INT NOT NULL DEFAULT 0 COMMENT 'ขายไปแล้วกี่ชิ้น',
  `maxPerUser` INT NOT NULL DEFAULT 1 COMMENT 'จำกัดต่อคน',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'เปิด/ปิดสินค้านี้ในรอบนี้',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_flash_sale_item_flash_sale` (`flashSaleId`),
  INDEX `idx_flash_sale_item_product` (`productId`),
  INDEX `idx_flash_sale_item_active` (`isActive`),
  CONSTRAINT `fk_flash_sale_item_flash_sale` 
    FOREIGN KEY (`flashSaleId`) 
    REFERENCES `flash_sale` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_flash_sale_item_product` 
    FOREIGN KEY (`productId`) 
    REFERENCES `product` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
