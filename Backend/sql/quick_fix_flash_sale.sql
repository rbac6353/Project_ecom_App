-- Quick Fix: Add Missing Columns to flash_sale table
-- Date: 2026-01-08
-- Description: เพิ่ม columns ที่ขาดหายไป (name, description, createdAt)
-- ⚠️ หมายเหตุ: รัน SQL นี้โดยตรงใน MySQL (ถ้า column มีอยู่แล้วจะ error แต่ไม่เป็นไร)

-- เพิ่ม column name
ALTER TABLE `flash_sale` 
  ADD COLUMN `name` VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'ชื่อ Campaign เช่น "12.12 Midnight Sale"' AFTER `id`;

-- เพิ่ม column description  
ALTER TABLE `flash_sale` 
  ADD COLUMN `description` TEXT NULL COMMENT 'คำอธิบาย Campaign' AFTER `isActive`;

-- เพิ่ม column createdAt
ALTER TABLE `flash_sale` 
  ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'วันที่สร้าง';

-- เพิ่ม column createdAt สำหรับ flash_sale_item (ถ้ามีตารางนี้อยู่แล้ว)
ALTER TABLE `flash_sale_item` 
  ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'วันที่สร้าง';
