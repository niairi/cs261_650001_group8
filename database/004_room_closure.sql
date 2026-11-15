CREATE TABLE IF NOT EXISTS room_closure (
    closure_id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES room(room_id),
    closure_date DATE NOT NULL,
    reason VARCHAR(255),
    created_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (room_id, closure_date)
);

-- ข้อมูลทดสอบสำหรับ Task 84: ปิดห้อง Room 102 เป็นเวลา 1 วัน
INSERT INTO room_closure (room_id, closure_date, reason, created_by)
VALUES (
    102,
    CURRENT_DATE + 1,
    'ซ่อมเครื่องปรับอากาศ',
    'seed'
)
ON CONFLICT (room_id, closure_date) DO NOTHING;