-- Add room location for US8 Check-in
-- Add BLACKLIST table for US10
-- Run after:
--   schema.sql
--   002_users_and_email_logs.sql


-- =========================================================
-- 1. เพิ่ม latitude และ longitude ให้กับ ROOM
-- =========================================================

ALTER TABLE room
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);


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

ALTER TABLE blacklist
ADD COLUMN IF NOT EXISTS lifted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lifted_by VARCHAR(50);

-- สร้าง Index เพื่อค้นหา BLACKLIST ของผู้ใช้ได้รวดเร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_blacklist_student
ON blacklist (student_id);

CREATE INDEX IF NOT EXISTS idx_blacklist_student_end_date
ON blacklist (student_id, end_date);


-- =========================================================
-- 3. ข้อมูลทดสอบ US9–US10 (Task69)
-- =========================================================
-- 650002: No-show แล้ว 2 ครั้ง (ไม่มาอีกครั้งเดียวจะโดนแบน)
INSERT INTO booking (student_id, room_id, booking_date, start_time, end_time, people, purpose, status)
VALUES
    ('650002', 102, CURRENT_DATE - 3, '09:00', '10:00', 2, 'ทดสอบ No-show', 'EXPIRED'),
    ('650002', 103, CURRENT_DATE - 2, '13:00', '14:00', 2, 'ทดสอบ No-show', 'EXPIRED');

-- 650004: ถูกระงับสิทธิ์อยู่ 30 วัน
INSERT INTO blacklist (student_id, trigger_booking_id, start_date, end_date, reason)
VALUES ('650004', 4, CURRENT_DATE, CURRENT_DATE + 30, 'ข้อมูลทดสอบ: No-show ครบ 3 ครั้ง');