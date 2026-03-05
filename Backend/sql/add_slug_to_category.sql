-- ============================================================
-- Step 2: Add slug column to category (SEO-friendly URLs)
-- Spec: slug VARCHAR(255) NULL UNIQUE + Index
-- รันซ้ำได้ (idempotent): ถ้ามี slug / index อยู่แล้ว จะข้าม
-- ============================================================

-- 1. เพิ่มคอลัมน์ slug เฉพาะเมื่อยังไม่มี
-- (ถ้ารันแล้วเจอ "Duplicate column name 'slug'" แปลว่ามี column อยู่แล้ว ข้ามขั้นนี้ได้)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'category'
    AND COLUMN_NAME = 'slug'
);

SET @sql_add_col = IF(@col_exists = 0,
  'ALTER TABLE category ADD COLUMN slug VARCHAR(255) NULL AFTER name',
  'SELECT "Column slug already exists, skip." AS msg'
);

PREPARE stmt FROM @sql_add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. เพิ่ม UNIQUE index เฉพาะเมื่อยังไม่มี
-- (ถ้ารันแล้วเจอ "Duplicate key name 'idx_category_slug'" แปลว่ามี index อยู่แล้ว ข้ามได้)
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'category'
    AND INDEX_NAME = 'idx_category_slug'
);

SET @sql_add_idx = IF(@idx_exists = 0,
  'CREATE UNIQUE INDEX idx_category_slug ON category(slug)',
  'SELECT "Index idx_category_slug already exists, skip." AS msg'
);

PREPARE stmt2 FROM @sql_add_idx;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
