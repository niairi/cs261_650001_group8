-- ข้อเสนอเพิ่มตาราง (รอทีม Database ตรวจก่อนใช้จริง)
-- ใช้กับ: Task28 บันทึกข้อมูลผู้ใช้ลงตาราง users, Task32 บันทึก email_logs
-- รันต่อจาก schema.sql:  psql room_booking -f backend/db/migrations/002_users_and_email_logs.sql

CREATE TABLE IF NOT EXISTS users (
    student_id      VARCHAR(50) PRIMARY KEY,          -- username จาก TU API (ตรงกับ booking.student_id)
    name_th         VARCHAR(255),
    name_en         VARCHAR(255),
    email           VARCHAR(255),
    type            VARCHAR(20),                      -- student / employee (จาก TU API)
    department      VARCHAR(255),
    faculty         VARCHAR(255),
    role            VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Link booking with users
ALTER TABLE booking
ADD CONSTRAINT fk_booking_student
FOREIGN KEY (student_id) REFERENCES users(student_id);

CREATE TABLE IF NOT EXISTS email_logs (
    email_log_id    BIGSERIAL PRIMARY KEY,
    booking_id      BIGINT REFERENCES booking(booking_id),
    to_email        VARCHAR(255),
    email_type      VARCHAR(30) NOT NULL,             -- BOOKING_CONFIRMED (ต่อไป: BOOKING_CANCELLED)
    status          VARCHAR(20) NOT NULL CHECK (status IN ('SENT', 'FAILED', 'SKIPPED')),
    error_message   TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_logs_booking ON email_logs (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_student ON booking (student_id);
