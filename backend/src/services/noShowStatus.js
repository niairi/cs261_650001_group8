// US9 TC4 / US10: สถานะของผู้ใช้สำหรับหน้า "การจองของฉัน" (GET /users/me/status)
const { countNoShows, semesterRange } = require('./noShowService');

const UNDEFINED_TABLE = '42P01'; // PostgreSQL: ยังไม่มีตาราง (ก่อน migration ของ Task69)

// การระงับสิทธิ์ที่ยังมีผลวันนี้ (ตาราง blacklist ของ Task68/Task69) — ยังไม่มีตาราง = ไม่ถูกระงับ
// US13: ไม่นับรายการที่ admin ปลดแล้ว (lifted_at) · ยังไม่มีคอลัมน์ lifted_at = ตรวจแบบเดิม
const UNDEFINED_COLUMN = '42703';
const activeBanSql = (liftedFilter) =>
  `SELECT to_char(end_date, 'YYYY-MM-DD') AS end_date
     FROM blacklist
    WHERE student_id = $1 AND end_date >= CURRENT_DATE${liftedFilter}
    ORDER BY end_date DESC
    LIMIT 1`;

async function activeBan(db, studentId) {
  try {
    const { rows } = await db.query(activeBanSql(' AND lifted_at IS NULL'), [studentId]);
    return rows[0]?.end_date || null;
  } catch (err) {
    if (err.code === UNDEFINED_TABLE) return null;
    if (err.code === UNDEFINED_COLUMN) {
      const { rows } = await db.query(activeBanSql(''), [studentId]);
      return rows[0]?.end_date || null;
    }
    throw err;
  }
}

async function getUserStatus(db, studentId) {
  const semester = semesterRange();
  const [count, bannedUntil] = await Promise.all([countNoShows(db, studentId, semester), activeBan(db, studentId)]);
  return {
    student_id: studentId,
    semester,
    no_show_count: count,
    no_show_limit: Number(process.env.NO_SHOW_LIMIT || 3),
    banned: Boolean(bannedUntil),
    banned_until: bannedUntil,
  };
}

module.exports = { getUserStatus, activeBan };
