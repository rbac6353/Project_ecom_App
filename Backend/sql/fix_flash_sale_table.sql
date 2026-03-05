-- Migration: Fix Flash Sale Table - Add Missing Columns
-- Date: 2026-01-08
-- Description: เพิ่ม columns ที่ขาดหายไปในตาราง flash_sale และ flash_sale_item
-- Note: ใช้ camelCase column names ตาม CamelCaseNamingStrategy

-- ============================================
-- 1. แก้ไขตาราง flash_sale
-- ============================================

-- เพิ่ม column name (ถ้ายังไม่มี)
ALTER TABLE `flash_sale` 
  ADD COLUMN IF NOT EXISTS `name` VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'ชื่อ Campaign เช่น "12.12 Midnight Sale"' AFTER `id`;

-- เพิ่ม column description (ถ้ายังไม่มี)
ALTER TABLE `flash_sale` 
  ADD COLUMN IF NOT EXISTS `description` TEXT NULL COMMENT 'คำอธิบาย Campaign' AFTER `isActive`;

-- เพิ่ม column createdAt (ถ้ายังไม่มี)
ALTER TABLE `flash_sale` 
  ADD COLUMN IF NOT EXISTS `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'วันที่สร้าง';

-- ============================================
-- 2. แก้ไขตาราง flash_sale_item (ถ้ามีอยู่แล้ว)
-- ============================================

-- เพิ่ม column createdAt (ถ้ายังไม่มี)
ALTER TABLE `flash_sale_item` 
  ADD COLUMN IF NOT EXISTS `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'วันที่สร้าง';

-- ============================================
-- หมายเหตุ: 
-- - MySQL บางเวอร์ชันไม่รองรับ IF NOT EXISTS ใน ALTER TABLE
-- - ถ้า error ให้ใช้ stored procedure ใน add_flash_sale_columns.sql แทน
-- ============================================
