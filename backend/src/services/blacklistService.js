// backend/src/services/blacklistService.js
// Task68 US10: No-show ครบ 3 ครั้ง → ระงับสิทธิ์การจอง 30 วัน
const { HttpError } = require('../errors');

const NO_SHOW_LIMIT = 3;
const BLACKLIST_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const NO_SHOW_STATUS = 'EXPIRED'; // สถานะจาก Task67 (ไม่ check-in ภายในเวลา)

// Date → "10 ธันวาคม 2569"
function formatThaiDateTime(date) {
  return new Date(date).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function blacklistMessage(entry) {
  return `คุณถูกระงับสิทธิ์การจองถึงวันที่ ${formatThaiDateTime(entry.end_at)}`;
}

// db = pool จาก ../db, sendNotice = sendBlacklistNotice จาก emailService
function createBlacklistService({ db, sendNotice, now = () => new Date() }) {
  // ปลดแบนอัตโนมัติ: แบนที่ end_at ผ่านไปแล้วไม่นับว่า active (ไม่ต้องมี cron)
  async function getActiveBlacklist(studentId) {
    const { rows } = await db.query(
      `SELECT blacklist_id, student_id, reason, start_at, end_at
         FROM blacklist
        WHERE student_id = $1 AND end_at > $2
        ORDER BY end_at DESC
        LIMIT 1`,
      [studentId, now()]
    );
    return rows[0] || null;
  }

  // นับเฉพาะ no-show หลังแบนครั้งล่าสุด ไม่ให้ no-show ชุดเดิมทำให้โดนแบนซ้ำหลังปลดแบน
  async function countNoShowsSinceLastBan(studentId) {
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS count
         FROM booking b
        WHERE b.student_id = $1
          AND b.status = $2
          AND (b.booking_date + b.start_time) AT TIME ZONE 'Asia/Bangkok' > COALESCE(
                (SELECT MAX(start_at) FROM blacklist WHERE student_id = $1),
                '-infinity'::timestamptz)`,
      [studentId, NO_SHOW_STATUS]
    );
    return rows[0].count;
  }

  // Task67 เรียกหลังเปลี่ยน booking เป็น EXPIRED
  // booking: { booking_id, student_id }
  async function handleNoShow(booking) {
    const studentId = booking.student_id;
    if (await getActiveBlacklist(studentId)) return null;

    const count = await countNoShowsSinceLastBan(studentId);
    if (count < NO_SHOW_LIMIT) return null;

    const startAt = now();
    const endAt = new Date(startAt.getTime() + BLACKLIST_DAYS * DAY_MS);

    const { rows } = await db.query(
      `INSERT INTO blacklist (student_id, reason, start_at, end_at)
       VALUES ($1, $2, $3, $4)
       RETURNING blacklist_id, student_id, reason, start_at, end_at`,
      [studentId, `No-show ครบ ${NO_SHOW_LIMIT} ครั้ง`, startAt, endAt]
    );
    const entry = rows[0];

    // อีเมลล้มเหลวไม่ทำให้การแบนถูกยกเลิก (US10 TC1)
    try {
      const { rows: users } = await db.query(
        'SELECT email FROM users WHERE student_id = $1',
        [studentId]
      );
      await sendNotice(users[0]?.email || null, {
        booking_id: booking.booking_id,
        student_id: studentId,
        no_show_count: count,
        days: BLACKLIST_DAYS,
        until_text: formatThaiDateTime(entry.end_at),
      });
    } catch (err) {
      console.error('[blacklist] ส่งอีเมลแจ้งระงับสิทธิ์ไม่สำเร็จ:', err.message);
    }

    return entry;
  }

  // ใช้ใน POST /booking และ PATCH /booking/:id (US10 TC2)
  async function assertNotBlacklisted(studentId) {
    const entry = await getActiveBlacklist(studentId);
    if (entry) throw new HttpError(403, blacklistMessage(entry));
  }

  return { getActiveBlacklist, countNoShowsSinceLastBan, handleNoShow, assertNotBlacklisted };
}

module.exports = {
  createBlacklistService,
  blacklistMessage,
  formatThaiDateTime,
  NO_SHOW_LIMIT,
  BLACKLIST_DAYS,
};