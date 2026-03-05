-- ============================================
-- Database Indexes for Performance Optimization
-- ============================================
-- Run this script to add indexes on frequently queried columns
-- This will significantly improve query performance

-- ============================================
-- Product Table Indexes
-- ============================================
-- Index for filtering products by category
CREATE INDEX IF NOT EXISTS idx_product_categoryId ON product(categoryId);

-- Index for filtering products by store
CREATE INDEX IF NOT EXISTS idx_product_storeId ON product(storeId);

-- Index for filtering active products
CREATE INDEX IF NOT EXISTS idx_product_isActive ON product(isActive);

-- Index for filtering by subcategory
CREATE INDEX IF NOT EXISTS idx_product_subcategory ON product(subcategory);

-- Composite index for common queries (category + active status)
CREATE INDEX IF NOT EXISTS idx_product_category_active ON product(categoryId, isActive);

-- Index for price range queries
CREATE INDEX IF NOT EXISTS idx_product_price ON product(price);

-- ============================================
-- Order Table Indexes
-- ============================================
-- Index for filtering orders by user
CREATE INDEX IF NOT EXISTS idx_order_orderedById ON `order`(orderedById);

-- Index for filtering orders by status
CREATE INDEX IF NOT EXISTS idx_order_orderStatus ON `order`(orderStatus);

-- Index for filtering orders by refund status
CREATE INDEX IF NOT EXISTS idx_order_refundStatus ON `order`(refundStatus);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_order_createdAt ON `order`(createdAt);

-- Composite index for user orders with status
CREATE INDEX IF NOT EXISTS idx_order_user_status ON `order`(orderedById, orderStatus);

-- Index for payment expiry queries
CREATE INDEX IF NOT EXISTS idx_order_paymentExpiredAt ON `order`(paymentExpiredAt);

-- ============================================
-- Review Table Indexes
-- ============================================
-- Index for filtering reviews by product
CREATE INDEX IF NOT EXISTS idx_review_productId ON review(productId);

-- Index for filtering reviews by user
CREATE INDEX IF NOT EXISTS idx_review_userId ON review(userId);

-- Composite index for product reviews (most common query)
CREATE INDEX IF NOT EXISTS idx_review_product_user ON review(productId, userId);

-- Index for hidden reviews filter
CREATE INDEX IF NOT EXISTS idx_review_isHidden ON review(isHidden);

-- ============================================
-- Wishlist Table Indexes
-- ============================================
-- Note: Schema already has these indexes:
--   - idx_wishlist_userId (userId)
--   - idx_wishlist_productId (productId)
--   - idx_wishlist_user_product (UNIQUE, userId, productId)
-- Index for filtering wishlist by user
-- Note: Schema uses 'idx_wishlist_userId' (already exists)
CREATE INDEX IF NOT EXISTS idx_wishlist_userId ON wishlist(userId);

-- Index for filtering wishlist by product
-- Note: Schema uses 'idx_wishlist_productId' (already exists)
CREATE INDEX IF NOT EXISTS idx_wishlist_productId ON wishlist(productId);

-- Composite unique index (prevents duplicate wishlist entries)
-- Note: Schema uses 'idx_wishlist_user_product' (already exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_user_product ON wishlist(userId, productId);

-- ============================================
-- Cart Table Indexes
-- ============================================
-- Index for filtering cart by user
CREATE INDEX IF NOT EXISTS idx_cart_orderedById ON cart(orderedById);

-- ============================================
-- ProductOnOrder Table Indexes
-- ============================================
-- Index for filtering order items by order
-- Note: Table name is 'productonorder' (not 'product_on_order')
CREATE INDEX IF NOT EXISTS idx_productonorder_orderId ON productonorder(orderId);

-- Index for filtering order items by product
CREATE INDEX IF NOT EXISTS idx_productonorder_productId ON productonorder(productId);

-- ============================================
-- ProductOnCart Table Indexes
-- ============================================
-- Index for filtering cart items by cart
-- Note: Table name is 'productoncart' (not 'product_on_cart')
CREATE INDEX IF NOT EXISTS idx_productoncart_cartId ON productoncart(cartId);

-- Index for filtering cart items by product
CREATE INDEX IF NOT EXISTS idx_productoncart_productId ON productoncart(productId);

-- ============================================
-- User Table Indexes
-- ============================================
-- Email is already unique, but ensure index exists
-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_user_role ON user(role);

-- Index for enabled users
CREATE INDEX IF NOT EXISTS idx_user_enabled ON user(enabled);

-- ============================================
-- Store Table Indexes
-- ============================================
-- Index for filtering stores by owner
CREATE INDEX IF NOT EXISTS idx_store_ownerId ON store(ownerId);

-- Index for active stores
CREATE INDEX IF NOT EXISTS idx_store_isActive ON store(isActive);

-- ============================================
-- Coupon Table Indexes
-- ============================================
-- Note: Schema already has these indexes:
--   - idx_coupon_code (code)
--   - idx_coupon_expires (expiresAt)
--   - idx_coupon_type (type)
--   - idx_coupon_store (storeId)
-- Index for filtering coupons by code (for lookups)
-- Note: Schema uses 'idx_coupon_code' (already exists)
CREATE INDEX IF NOT EXISTS idx_coupon_code ON coupon(code);

-- Index for expiry date queries
-- Note: Column name is 'expiresAt' (not 'expiryDate')
-- Note: Schema uses 'idx_coupon_expires' (already exists)
CREATE INDEX IF NOT EXISTS idx_coupon_expiresAt ON coupon(expiresAt);

-- Index for coupon type filtering
-- Note: Schema uses 'idx_coupon_type' (already exists)
CREATE INDEX IF NOT EXISTS idx_coupon_type ON coupon(type);

-- Index for store-specific coupons
-- Note: Schema uses 'idx_coupon_store' (already exists)
CREATE INDEX IF NOT EXISTS idx_coupon_storeId ON coupon(storeId);

-- ============================================
-- Shipment Table Indexes
-- ============================================
-- Note: These indexes may already exist in schema with different names
-- Index for filtering shipments by order
-- Note: Schema uses 'fk_shipment_order' but we'll use descriptive name
CREATE INDEX IF NOT EXISTS idx_shipment_orderId ON shipment(orderId);

-- Index for filtering shipments by courier
-- Note: Schema uses 'idx_shipment_courier' (already exists)
CREATE INDEX IF NOT EXISTS idx_shipment_courierId ON shipment(courierId);

-- Index for shipment status queries
-- Note: Schema uses 'idx_shipment_status' (already exists)
CREATE INDEX IF NOT EXISTS idx_shipment_status ON shipment(status);

-- ============================================
-- Notification Table Indexes
-- ============================================
-- Note: Schema currently has NO indexes (only PRIMARY KEY)
-- These indexes will significantly improve notification queries
-- Index for filtering notifications by user
CREATE INDEX IF NOT EXISTS idx_notification_userId ON notification(userId);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notification_isRead ON notification(isRead);

-- Composite index for user unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notification_user_read ON notification(userId, isRead);

-- Index for notification type filtering
CREATE INDEX IF NOT EXISTS idx_notification_type ON notification(type);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_notification_createdAt ON notification(createdAt);

-- ============================================
-- Chat Message Table Indexes
-- ============================================
-- Note: Schema already has these indexes with different names:
--   - idx_conversation (conversationId)
--   - idx_sender (senderId)
--   - idx_created_at (createdAt)
--   - idx_is_read (isRead)
-- We'll use descriptive names for consistency
-- Index for filtering messages by conversation
-- Note: Column name is 'conversationId' (not 'roomId')
-- Note: Schema uses 'idx_conversation' (already exists)
CREATE INDEX IF NOT EXISTS idx_chat_message_conversationId ON chat_message(conversationId);

-- Index for filtering messages by sender
-- Note: Schema uses 'idx_sender' (already exists)
CREATE INDEX IF NOT EXISTS idx_chat_message_senderId ON chat_message(senderId);

-- Index for date range queries
-- Note: Schema uses 'idx_created_at' (already exists)
CREATE INDEX IF NOT EXISTS idx_chat_message_createdAt ON chat_message(createdAt);

-- Index for unread messages
-- Note: Schema uses 'idx_is_read' (already exists)
CREATE INDEX IF NOT EXISTS idx_chat_message_isRead ON chat_message(isRead);

-- ============================================
-- Additional Indexes (Not in Schema)
-- ============================================
-- These indexes are recommended but not yet in the schema:

-- Image Table Indexes
-- Index for filtering images by product
CREATE INDEX IF NOT EXISTS idx_image_productId ON image(productId);

-- Product Variant Table Indexes
-- Index for filtering variants by product
CREATE INDEX IF NOT EXISTS idx_product_variant_productId ON product_variant(productId);

-- Recently Viewed Table Indexes
-- Index for filtering by user
CREATE INDEX IF NOT EXISTS idx_recently_viewed_userId ON recently_viewed(userId);

-- Index for filtering by product
CREATE INDEX IF NOT EXISTS idx_recently_viewed_productId ON recently_viewed(productId);

-- Composite index for user-product lookup
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_product ON recently_viewed(userId, productId);

-- Notification Setting Table Indexes
-- Index for filtering by user
CREATE INDEX IF NOT EXISTS idx_notification_setting_userId ON notification_setting(userId);

-- Store Follower Table Indexes
-- Index for filtering followers by store
CREATE INDEX IF NOT EXISTS idx_store_follower_storeId ON store_follower(storeId);

-- Index for filtering followers by user
CREATE INDEX IF NOT EXISTS idx_store_follower_userId ON store_follower(userId);

-- Composite index for user-store lookup
CREATE INDEX IF NOT EXISTS idx_store_follower_user_store ON store_follower(userId, storeId);

-- ============================================
-- Notes
-- ============================================
-- 1. These indexes will improve query performance significantly
-- 2. Indexes have a small overhead on INSERT/UPDATE operations
-- 3. Monitor query performance and adjust indexes as needed
-- 4. Use EXPLAIN to verify indexes are being used
-- 5. Consider dropping unused indexes if they impact write performance
-- 6. If a table doesn't exist, skip that section and continue
-- 7. Table names match TypeORM entity names:
--    - productonorder (not product_on_order)
--    - productoncart (not product_on_cart)
--    - order (not orders)
--    - user (not users)
--    - product (not products)
-- 8. Many indexes already exist in schema - using IF NOT EXISTS prevents errors
-- 9. Some indexes in schema use different names (e.g., idx_conversation vs idx_chat_message_conversationId)
