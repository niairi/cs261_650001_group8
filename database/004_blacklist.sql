-- database/004_blacklist.sql  (Task68 US10: No-show ครบ 3 ครั้ง ระงับสิทธิ์ 30 วัน)
CREATE TABLE IF NOT EXISTS blacklist (
    blacklist_id BIGSERIAL PRIMARY KEY,
    student_id   VARCHAR(50) NOT NULL REFERENCES users(student_id),
    reason       VARCHAR(255) NOT NULL,
    start_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at       TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_blacklist_student_end ON blacklist (student_id, end_at);