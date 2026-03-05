-- ============================================
-- Full-Text Search Index for Products
-- ============================================
-- This index enables fast full-text search on product title and description
-- Run this script to enable full-text search functionality

-- Note: Full-text indexes only work with MyISAM or InnoDB (MySQL 5.6+)
-- For InnoDB, full-text indexes are supported starting from MySQL 5.6

-- Add FULLTEXT index on product title and description
ALTER TABLE `product` 
ADD FULLTEXT INDEX `ft_product_search` (`title`, `description`);

-- Optional: Add FULLTEXT index on category name for better search
-- ALTER TABLE `category` 
-- ADD FULLTEXT INDEX `ft_category_search` (`name`);

-- ============================================
-- Usage Example
-- ============================================
-- After adding the index, you can use:
-- SELECT * FROM product 
-- WHERE MATCH(title, description) AGAINST('keyword' IN BOOLEAN MODE);

-- ============================================
-- Notes
-- ============================================
-- 1. Full-text search is faster than LIKE queries for large datasets
-- 2. Supports boolean mode for advanced search (+, -, *, etc.)
-- 3. Minimum word length: 3 characters (configurable in MySQL)
-- 4. Stop words are ignored (common words like 'the', 'is', etc.)
-- 5. If index creation fails, the application will fallback to LIKE search
