// backend/src/services/blacklistService.js
// Task68 US10: No-show ครบ 3 ครั้ง → ระงับสิทธิ์การจอง 30 วัน
// ใช้ตาราง blacklist จาก PR #26 (Task56): student_id, trigger_booking_id, start_date, end_date (DATE), reason
// end_date = วันสุดท้ายที่ยังถูกระงับ วันถัดไปจองได้
// ต่อกับ Task67: server.js ส่ง handleNoShow เป็น onNoShow ของ startNoShowScheduler
const { HttpError } = require('../errors');
const { semesterRange } = require('./noShowService');

const noShowLimit = () => Number(process.env.NO_SHOW_LIMIT || 3); // ค่าเดียวกับ Task67
const BLACKLIST_DAYS = 30;
const UNDEFINED_TABLE = '42P01'; // ยังไม่ได้รัน migration ตาราง blacklist

// Date → "2026-11-10" ตามเวลาไทย
function bangkokDate(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(date);
}

// "2026-11-10" + 29 → "2026-12-09"
function addDays(ymd, days) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// "2026-12-09" → "9 ธันวาคม 2569"
function formatThaiDate(ymd) {
  return new Date(`${ymd}T00:00:00+07:00`).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function blacklistMessage(entry) {
  return `คุณถูกระงับสิทธิ์การจองถึงวันที่ ${formatThaiDate(entry.end_date)}`;
}

// db = pool จาก ../db, sendNotice = sendBlacklistNotice จาก emailService
function createBlacklistService({ db, sendNotice, now = () => new Date(), semester = semesterRange() }) {
  // ปลดแบนอัตโนมัติ: นับว่าถูกแบนเฉพาะเมื่อ end_date >= วันนี้ (ไม่ต้องมี cron)
  // ยังไม่มีตาราง = ไม่มีใครถูกแบน (แบบเดียวกับ noShowStatus.js) ระบบจองจะได้ไม่ล่ม
  async function getActiveBlacklist(studentId) {
    try {
      const { rows } = await db.query(
        `SELECT student_id, start_date::text AS start_date, end_date::text AS end_date, trigger_booking_id
           FROM blacklist
          WHERE student_id = $1 AND end_date >= $2::date
          ORDER BY end_date DESC
          LIMIT 1`,
        [studentId, bangkokDate(now())]
      );
      return rows[0] || null;
    } catch (err) {
      if (err.code === UNDEFINED_TABLE) return null;
      throw err;
    }
  }

  // นับ No-show แบบเดียวกับ Task67 (EXPIRED ที่ไม่มี confirmed_at ในภาคการศึกษา)
  // แต่นับเฉพาะที่เกิดหลัง booking ที่ทำให้โดนแบนครั้งล่าสุด
  // (กันไม่ให้ No-show ชุดเดิมทำให้โดนแบนซ้ำหลังปลดแบน)
  async function countNoShowsSinceLastBan(studentId) {
    const params = [studentId];
    let range = '';
    if (semester.start) {
      params.push(semester.start);
      range += ` AND b.booking_date >= $${params.length}`;
    }
    if (semester.end) {
      params.push(semester.end);
      range += ` AND b.booking_date <= $${params.length}`;
    }
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS count
         FROM booking b
        WHERE b.student_id = $1
          AND b.status = 'EXPIRED'
          AND b.confirmed_at IS NULL${range}
          AND (b.booking_date + b.start_time) > COALESCE(
                (SELECT t.booking_date + t.start_time
                   FROM blacklist bl
                   JOIN booking t ON t.booking_id = bl.trigger_booking_id
                  WHERE bl.student_id = $1
                  ORDER BY bl.end_date DESC
                  LIMIT 1),
                '-infinity'::timestamp)`,
      params
    );
    return rows[0].count;
  }

  // Task67 เรียกผ่าน onNoShow หลังเปลี่ยน booking เป็น EXPIRED
  // booking: event ของ noShowService = { booking_id, student_id, ... }
  async function handleNoShow(booking) {
    const studentId = booking.student_id;
    if (await getActiveBlacklist(studentId)) return null;

    const count = await countNoShowsSinceLastBan(studentId);
    if (count < noShowLimit()) return null;

    // ระงับถึงวันนี้ + 30 วัน (US10 TC1: No-show 22 ต.ค. → ระงับถึง 21 พ.ย.) วันถัดไปจองได้
    const startDate = bangkokDate(now());
    const endDate = addDays(startDate, BLACKLIST_DAYS);

    const { rows } = await db.query(
      `INSERT INTO blacklist (student_id, start_date, end_date, trigger_booking_id, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING student_id, start_date::text AS start_date, end_date::text AS end_date, trigger_booking_id`,
      [studentId, startDate, endDate, booking.booking_id, `No-show ครบ ${count} ครั้ง`]
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
        until_text: formatThaiDate(entry.end_date),
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
  formatThaiDate,
  bangkokDate,
  addDays,
  BLACKLIST_DAYS,
};