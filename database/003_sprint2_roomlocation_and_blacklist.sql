-- Add room location for US8 Check-in
-- Add BLACKLIST table for US10
-- Run after:
--   schema.sql
--   002_users_and_email_logs.sql


-- =========================================================
-- 1. เพิ่ม latitude และ longitude ให้กับ ROOM
-- =========================================================

ALTER TABLE room
ADD COLUMN latitude DECIMAL(10,7),
ADD COLUMN longitude DECIMAL(10,7);


-- ห้องที่สามารถจองได้ทั้งหมดอยู่ภายใน Coworking Space เดียวกัน
-- จึงใช้พิกัดเดียวกันสำหรับทุกห้อง
-- พิกัดนี้ใช้เป็นจุดอ้างอิงของ Coworking Space สำหรับตรวจสอบ Check-in
--
-- Latitude  : 14.0728612
-- Longitude : 100.6082701

UPDATE room
SET latitude = 14.0728612,
    longitude = 100.6082701;


-- Coordinates are required for Check-in verification (US8)
ALTER TABLE room
ALTER COLUMN latitude SET NOT NULL,
ALTER COLUMN longitude SET NOT NULL;


-- =========================================================
-- 2. สร้างตาราง BLACKLIST
-- =========================================================

CREATE TABLE IF NOT EXISTS blacklist (
    blacklist_id       BIGSERIAL PRIMARY KEY,
    student_id         VARCHAR(50) NOT NULL,
    trigger_booking_id BIGINT NOT NULL,
    start_date         DATE NOT NULL,
    end_date           DATE NOT NULL,
    reason             VARCHAR(255) NOT NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

-- เชื่อม BLACKLIST กับผู้ใช้งาน
    CONSTRAINT fk_blacklist_student
        FOREIGN KEY (student_id)
        REFERENCES users(student_id),

 -- เชื่อม BLACKLIST กับ Booking ที่เป็นต้นเหตุ
    CONSTRAINT fk_blacklist_trigger_booking
        FOREIGN KEY (trigger_booking_id)
        REFERENCES booking(booking_id),

-- Booking หนึ่งรายการสามารถเป็นต้นเหตุของ BLACKLIST ได้เพียงหนึ่งรายการ
    CONSTRAINT uq_blacklist_trigger_booking
        UNIQUE (trigger_booking_id),

-- วันที่สิ้นสุดต้องไม่อยู่ก่อนวันที่เริ่มต้น
    CONSTRAINT chk_blacklist_date
        CHECK (end_date >= start_date)
);


-- สร้าง Index เพื่อค้นหา BLACKLIST ของผู้ใช้ได้รวดเร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_blacklist_student
ON blacklist (student_id);
