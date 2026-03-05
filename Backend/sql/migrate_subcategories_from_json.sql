-- =====================================================
-- Migration Script: Migrate Subcategories from JSON to Table
-- =====================================================
-- Description: 
--   1. Clear existing subcategory data
--   2. Extract subcategories from category.image JSON and insert into subcategory table
--   3. Clean up JSON in category.image (remove subcategories key)
--   4. Update product.subcategoryId by matching product title with subcategory name
-- 
-- Requirements:
--   - MySQL 5.7+ or MariaDB 10.2+ (for JSON functions)
--   - Database: ecom1
-- =====================================================

USE ecom1;

-- =====================================================
-- STEP 1: Clear Data - TRUNCATE subcategory table
-- =====================================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `subcategory`;
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Step 1: Cleared subcategory table' AS status;

-- =====================================================
-- STEP 2: Migrate Data - Extract subcategories from JSON
-- =====================================================
-- Use stored procedure to iterate through categories and parse JSON arrays

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_subcategories_from_json$$

CREATE PROCEDURE migrate_subcategories_from_json()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_category_id INT;
    DECLARE v_category_image TEXT;
    DECLARE v_json_subcategories TEXT;
    DECLARE v_subcategory_json TEXT;
    DECLARE v_subcategory_name VARCHAR(255);
    DECLARE v_subcategory_icon VARCHAR(50);
    DECLARE v_pos INT DEFAULT 0;
    DECLARE v_inserted_count INT DEFAULT 0;
    
    -- Cursor to iterate through all categories with subcategories
    DECLARE category_cursor CURSOR FOR 
        SELECT id, image 
        FROM category 
        WHERE image IS NOT NULL 
          AND image != '' 
          AND JSON_EXTRACT(image, '$.subcategories') IS NOT NULL
          AND JSON_EXTRACT(image, '$.subcategories') != 'null';
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN category_cursor;

    read_loop: LOOP
        FETCH category_cursor INTO v_category_id, v_category_image;
        IF done THEN
            LEAVE read_loop;
        END IF;

        -- Extract subcategories array from JSON
        SET v_json_subcategories = JSON_EXTRACT(v_category_image, '$.subcategories');
        
        -- Parse each subcategory in the array
        SET v_pos = 0;
        parse_loop: LOOP
            -- Try to extract subcategory at position v_pos
            SET v_subcategory_json = JSON_EXTRACT(v_json_subcategories, CONCAT('$[', v_pos, ']'));
            
            -- If null or 'null', we've reached the end of the array
            IF v_subcategory_json IS NULL OR v_subcategory_json = 'null' OR v_subcategory_json = '' THEN
                LEAVE parse_loop;
            END IF;
            
            -- Extract name and icon
            SET v_subcategory_name = JSON_UNQUOTE(JSON_EXTRACT(v_subcategory_json, '$.name'));
            SET v_subcategory_icon = JSON_UNQUOTE(JSON_EXTRACT(v_subcategory_json, '$.icon'));
            
            -- Insert into subcategory table (skip if name is empty)
            IF v_subcategory_name IS NOT NULL AND v_subcategory_name != '' THEN
                INSERT INTO subcategory (name, categoryId, createdAt, updatedAt)
                VALUES (
                    v_subcategory_name,
                    v_category_id,
                    NOW(),
                    NOW()
                )
                ON DUPLICATE KEY UPDATE
                    name = v_subcategory_name,
                    updatedAt = NOW();
                
                SET v_inserted_count = v_inserted_count + 1;
            END IF;
            
            SET v_pos = v_pos + 1;
            
            -- Safety check: prevent infinite loop (max 100 subcategories per category)
            IF v_pos > 100 THEN
                LEAVE parse_loop;
            END IF;
        END LOOP;
    END LOOP;

    CLOSE category_cursor;
    
    SELECT CONCAT('Step 2: Migrated ', v_inserted_count, ' subcategories') AS status;
END$$

DELIMITER ;

-- Execute the stored procedure
CALL migrate_subcategories_from_json();

-- Drop the stored procedure after use
DROP PROCEDURE IF EXISTS migrate_subcategories_from_json;

-- =====================================================
-- STEP 3: Clean Up - Remove subcategories from category.image JSON
-- =====================================================
-- Update category.image to remove subcategories key, keeping only icon and image

UPDATE category
SET image = JSON_OBJECT(
    'icon', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(image, '$.icon')), ''),
    'image', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(image, '$.image')), '')
)
WHERE image IS NOT NULL 
  AND image != ''
  AND JSON_EXTRACT(image, '$.subcategories') IS NOT NULL
  AND JSON_EXTRACT(image, '$.subcategories') != 'null';

SELECT CONCAT('Step 3: Cleaned up ', ROW_COUNT(), ' category JSON records') AS status;

-- =====================================================
-- STEP 4: Update Product - Map subcategoryId by matching title
-- =====================================================
-- Try to match product title with subcategory name
-- This is a fuzzy matching approach - we'll look for subcategory name in product title

-- First, update products where title starts with subcategory name (most accurate)
UPDATE product p
INNER JOIN subcategory s ON p.categoryId = s.categoryId
SET p.subcategoryId = s.id
WHERE p.subcategoryId IS NULL
  AND LOWER(TRIM(p.title)) LIKE CONCAT(LOWER(TRIM(s.name)), '%')
  AND LENGTH(TRIM(s.name)) >= 3;

SELECT CONCAT('Step 4a: Updated ', ROW_COUNT(), ' products (exact match at start)') AS status;

-- Then, update products where title contains subcategory name (fuzzy match)
-- Only update if not already set and subcategory name is meaningful (>= 3 chars)
UPDATE product p
INNER JOIN subcategory s ON p.categoryId = s.categoryId
SET p.subcategoryId = s.id
WHERE p.subcategoryId IS NULL
  AND LOWER(TRIM(p.title)) LIKE CONCAT('%', LOWER(TRIM(s.name)), '%')
  AND LENGTH(TRIM(s.name)) >= 3
  -- Avoid matching very short words that might appear in many products
  AND LENGTH(TRIM(s.name)) >= 3;

SELECT CONCAT('Step 4b: Updated ', ROW_COUNT(), ' products (fuzzy match)') AS status;

-- =====================================================
-- Verification Queries (for checking results)
-- =====================================================

SELECT '=== VERIFICATION RESULTS ===' AS info;

-- Check how many subcategories were migrated
SELECT COUNT(*) as total_subcategories FROM subcategory;

-- Check subcategories per category
SELECT 
    c.id as category_id,
    c.name as category_name,
    COUNT(s.id) as subcategory_count,
    GROUP_CONCAT(s.name ORDER BY s.id SEPARATOR ', ') as subcategory_names
FROM category c
LEFT JOIN subcategory s ON c.id = s.categoryId
GROUP BY c.id, c.name
ORDER BY c.id;

-- Check products with subcategoryId assigned
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN subcategoryId IS NOT NULL THEN 1 END) as products_with_subcategory,
    COUNT(CASE WHEN subcategoryId IS NULL THEN 1 END) as products_without_subcategory,
    ROUND(COUNT(CASE WHEN subcategoryId IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as percentage_assigned
FROM product;

-- Check sample products with their subcategories (first 20)
SELECT 
    p.id,
    p.title,
    c.name as category_name,
    s.name as subcategory_name,
    CASE 
        WHEN p.subcategoryId IS NULL THEN '❌ Not assigned'
        ELSE '✅ Assigned'
    END as status
FROM product p
LEFT JOIN category c ON p.categoryId = c.id
LEFT JOIN subcategory s ON p.subcategoryId = s.id
ORDER BY p.id
LIMIT 20;

-- Check products that should have subcategory but don't (sample)
SELECT 
    p.id,
    p.title,
    c.name as category_name,
    s.name as potential_subcategory
FROM product p
INNER JOIN category c ON p.categoryId = c.id
INNER JOIN subcategory s ON p.categoryId = s.categoryId
WHERE p.subcategoryId IS NULL
  AND LOWER(p.title) LIKE CONCAT('%', LOWER(s.name), '%')
LIMIT 10;

SELECT '=== MIGRATION COMPLETED ===' AS status;

-- =====================================================
-- END OF MIGRATION SCRIPT
-- =====================================================
-- 
-- Next Steps:
-- 1. Review the verification results above
-- 2. Manually update any products that weren't automatically matched
-- 3. Update Backend code to use subcategory table instead of JSON
-- 4. Update Frontend code to fetch subcategories from API instead of parsing JSON
-- =====================================================
