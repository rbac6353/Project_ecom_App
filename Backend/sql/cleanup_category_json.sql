-- =====================================================
-- Cleanup Script: Remove subcategories from category.image JSON
-- =====================================================
-- Description: 
--   ลบ key "subcategories" ออกจาก JSON ใน field category.image อย่างถาวร
--   ให้เหลือแค่ icon และ image URL เพื่อลดขนาดข้อมูล
-- =====================================================

USE ecom1;

-- =====================================================
-- STEP 1: Backup (Optional - แนะนำให้ backup ก่อน)
-- =====================================================
-- สร้างตาราง backup (ถ้าต้องการ)
-- CREATE TABLE category_backup AS SELECT * FROM category;

-- =====================================================
-- STEP 2: Cleanup - Remove subcategories from JSON
-- =====================================================
-- Update category.image เพื่อลบ key "subcategories" ออก
-- เหลือแค่ icon และ image URL

UPDATE category
SET image = JSON_OBJECT(
    'icon', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(image, '$.icon')), ''),
    'image', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(image, '$.image')), '')
)
WHERE image IS NOT NULL 
  AND image != ''
  AND JSON_EXTRACT(image, '$.subcategories') IS NOT NULL
  AND JSON_EXTRACT(image, '$.subcategories') != 'null';

-- =====================================================
-- Verification Queries
-- =====================================================

SELECT '=== CLEANUP RESULTS ===' AS info;

-- ตรวจสอบว่ายังมี subcategories ใน JSON หรือไม่
SELECT 
    id,
    name,
    CASE 
        WHEN JSON_EXTRACT(image, '$.subcategories') IS NOT NULL 
             AND JSON_EXTRACT(image, '$.subcategories') != 'null'
        THEN '❌ ยังมี subcategories'
        ELSE '✅ ไม่มี subcategories'
    END as status,
    JSON_EXTRACT(image, '$.subcategories') as has_subcategories,
    JSON_EXTRACT(image, '$.icon') as icon,
    JSON_EXTRACT(image, '$.image') as image_url
FROM category
WHERE image IS NOT NULL 
  AND image != ''
ORDER BY id;

-- นับจำนวน categories ที่ถูก cleanup
SELECT 
    COUNT(*) as total_categories,
    COUNT(CASE 
        WHEN JSON_EXTRACT(image, '$.subcategories') IS NOT NULL 
             AND JSON_EXTRACT(image, '$.subcategories') != 'null'
        THEN 1 
    END) as still_has_subcategories,
    COUNT(CASE 
        WHEN JSON_EXTRACT(image, '$.subcategories') IS NULL 
             OR JSON_EXTRACT(image, '$.subcategories') = 'null'
        THEN 1 
    END) as cleaned_categories
FROM category
WHERE image IS NOT NULL 
  AND image != '';

-- ตัวอย่าง JSON หลัง cleanup (3 รายการแรก)
SELECT 
    id,
    name,
    image as cleaned_json
FROM category
WHERE image IS NOT NULL 
  AND image != ''
ORDER BY id
LIMIT 3;

SELECT '=== CLEANUP COMPLETED ===' AS status;

-- =====================================================
-- END OF CLEANUP SCRIPT
-- =====================================================
