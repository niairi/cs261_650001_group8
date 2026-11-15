-- Sprint 2 migration (Task66 · US8)
-- ใช้อัปเดตฐานข้อมูลที่สร้างไว้ก่อน Sprint 2 · DB ที่สร้างใหม่มีคอลัมน์จาก schema.sql อยู่แล้ว
-- รันซ้ำได้ไม่พัง (IF NOT EXISTS / อัปเดตเฉพาะห้องที่ยังไม่มีพิกัด)

-- US8: พิกัดห้องสำหรับ Check-in ตรวจระยะ 5 เมตร
ALTER TABLE room
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- พิกัดชั่วคราว ยังไม่ได้วัดจริงที่ LC4 ชั้น 1 (ต้องแก้เป็นค่าจริงก่อนใช้งาน)
UPDATE room SET latitude = 14.07220, longitude = 100.60500 WHERE room_id = 101 AND latitude IS NULL;
UPDATE room SET latitude = 14.07225, longitude = 100.60505 WHERE room_id = 102 AND latitude IS NULL;
UPDATE room SET latitude = 14.07230, longitude = 100.60510 WHERE room_id = 103 AND latitude IS NULL;