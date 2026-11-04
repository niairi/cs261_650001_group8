// US9: ระบบนับ No-show อัตโนมัติ (Task67)
//
// ทุก 1 นาที: การจอง BOOKED ที่เลยเวลาเริ่มมาแล้ว 15 นาทีและยังไม่ Check-in → เปลี่ยนเป็น EXPIRED (No-show)
// - ช่วงเวลาที่เหลือว่างให้คนอื่นจองได้ทันที เพราะตาราง/การตรวจชนนับเฉพาะ BOOKED และ CONFIRMED (US9 TC1)
// - การจองที่ CONFIRMED (Check-in แล้ว) หรือ CANCELLED ไม่ถูกแตะ (US9 TC2, TC3)
// - นับจำนวน No-show ของผู้ใช้ในภาคการศึกษา แล้วเรียก onNoShow ให้ระบบ Blacklist (Task68 · US10) ใช้ต่อ
//
// ค่าใน .env: NO_SHOW_GRACE_MIN (15) · NO_SHOW_CHECK_INTERVAL_MS (60000, 0 = ปิด) · NO_SHOW_LIMIT (3)
//            SEMESTER_START, SEMESTER_END (YYYY-MM-DD) ช่วงภาคการศึกษาที่ใช้นับ

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const graceMinutes = () => Number(process.env.NO_SHOW_GRACE_MIN || 15);
const noShowLimit = () => Number(process.env.NO_SHOW_LIMIT || 3);

// เวลาเครื่อง (TZ=Asia/Bangkok) เป็นข้อความ "YYYY-MM-DD HH:MM:SS" ให้เทียบกับ booking_date + start_time ได้ตรงๆ
function localTimestamp(now = new Date()) {
  return now.toLocaleString('sv-SE', { hour12: false }).replace('T', ' ');
}

// ช่วงภาคการศึกษาจาก .env — ถ้าไม่ได้ตั้ง (หรือรูปแบบผิด) = นับทั้งหมด
function semesterRange(env = process.env) {
  const start = DATE_RE.test(env.SEMESTER_START || '') ? env.SEMESTER_START : null;
  const end = DATE_RE.test(env.SEMESTER_END || '') ? env.SEMESTER_END : null;
  return { start, end };
}

// เปลี่ยนการจองที่ไม่มา Check-in เป็น EXPIRED คืนรายการที่เปลี่ยน
// ใช้ UPDATE ... WHERE status = 'BOOKED' คำสั่งเดียว ถ้าผู้ใช้กด Check-in ทันพอดี (ล็อกแถวอยู่) แถวนั้นจะเป็น CONFIRMED และไม่ถูกเปลี่ยน
async function expireNoShows(db, now = new Date()) {
  const { rows } = await db.query(
    `UPDATE booking
        SET status = 'EXPIRED'
      WHERE status = 'BOOKED'
        AND (booking_date + start_time) + make_interval(mins => $2) <= $1::timestamp
      RETURNING booking_id, student_id, room_id,
                to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
                to_char(start_time, 'HH24:MI') AS start_time,
                to_char(end_time, 'HH24:MI') AS end_time`,
    [localTimestamp(now), graceMinutes()]
  );
  return rows.map((r) => ({ ...r, booking_id: Number(r.booking_id), room_id: Number(r.room_id) }));
}

// จำนวน No-show ของผู้ใช้ในภาคการศึกษา = EXPIRED ที่ไม่มี confirmed_at
async function countNoShows(db, studentId, semester = semesterRange()) {
  const params = [studentId];
  let range = '';
  if (semester.start) {
    params.push(semester.start);
    range += ` AND booking_date >= $${params.length}`;
  }
  if (semester.end) {
    params.push(semester.end);
    range += ` AND booking_date <= $${params.length}`;
  }
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count
       FROM booking
      WHERE student_id = $1 AND status = 'EXPIRED' AND confirmed_at IS NULL${range}`,
    params
  );
  return Number(rows[0]?.count || 0);
}

// รัน 1 รอบ: เปลี่ยนเป็น EXPIRED → นับ → แจ้ง onNoShow (ถ้า onNoShow error จะไม่ทำให้รอบนี้ล้ม)
async function runNoShowCheck(db, { now = new Date(), onNoShow = null, log = console } = {}) {
  const expired = await expireNoShows(db, now);
  const results = [];
  for (const booking of expired) {
    const count = await countNoShows(db, booking.student_id);
    const event = { ...booking, no_show_count: count, no_show_limit: noShowLimit() };
    results.push(event);
    log.log(`[No-show] booking #${booking.booking_id} ของ ${booking.student_id} เป็น EXPIRED (ภาคการศึกษานี้ ${count}/${noShowLimit()} ครั้ง)`);
    if (onNoShow) {
      try {
        await onNoShow(event);
      } catch (err) {
        log.error(`[No-show] onNoShow ของ booking #${booking.booking_id} ไม่สำเร็จ:`, err.message);
      }
    }
  }
  return results;
}

// เริ่มตัวตั้งเวลา คืนฟังก์ชันหยุด — รอบใหม่จะไม่เริ่มถ้ารอบก่อนยังไม่จบ
function startNoShowScheduler(db, { intervalMs = Number(process.env.NO_SHOW_CHECK_INTERVAL_MS ?? 60000), onNoShow = null, log = console } = {}) {
  if (!intervalMs || intervalMs <= 0) {
    log.log('[No-show] ปิดตัวตรวจ No-show (NO_SHOW_CHECK_INTERVAL_MS = 0)');
    return () => {};
  }
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runNoShowCheck(db, { onNoShow, log });
    } catch (err) {
      log.error('[No-show] ตรวจไม่สำเร็จ:', err.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  if (timer.unref) timer.unref();
  tick(); // ตรวจทันทีตอนเปิด server (เผื่อ server ปิดไปช่วงหนึ่ง)
  return () => clearInterval(timer);
}

module.exports = {
  localTimestamp,
  semesterRange,
  expireNoShows,
  countNoShows,
  runNoShowCheck,
  startNoShowScheduler,
};
