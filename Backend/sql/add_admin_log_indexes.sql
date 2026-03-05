-- ============================================
-- Admin Log Table Indexes
-- ============================================
-- Purpose: เพิ่มประสิทธิภาพการ query admin_log table
-- Run: mysql -u root -p ecom1 < sql/add_admin_log_indexes.sql
-- ============================================

-- ✅ Index สำหรับ ORDER BY createdAt DESC (ใช้บ่อยที่สุด)
CREATE INDEX IF NOT EXISTS idx_admin_log_created_at 
ON admin_log(createdAt DESC);

-- ✅ Index สำหรับ filter by action
CREATE INDEX IF NOT EXISTS idx_admin_log_action 
ON admin_log(action);

-- ✅ Index สำหรับ filter by targetType
CREATE INDEX IF NOT EXISTS idx_admin_log_target_type 
ON admin_log(targetType);

-- ✅ Composite index สำหรับ filter by adminId + createdAt (ดู logs ของ admin คนเดียว)
CREATE INDEX IF NOT EXISTS idx_admin_log_admin_created 
ON admin_log(adminId, createdAt DESC);

-- ✅ Composite index สำหรับ filter by targetType + targetId (ดู logs ของ entity เฉพาะ)
CREATE INDEX IF NOT EXISTS idx_admin_log_target 
ON admin_log(targetType, targetId);

-- ============================================
-- Verification
-- ============================================
-- ตรวจสอบว่า indexes ถูกสร้างแล้ว:
-- SHOW INDEXES FROM admin_log;
-- ============================================
