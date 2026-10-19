// US5: เจ้าหน้าที่ดูข้อมูลการจองทั้งหมด (docs ข้อ 7) — อ่านจากตาราง booking + room
const { HttpError } = require('../errors');

const STATUSES = ['BOOKED', 'CONFIRMED', 'CANCELLED', 'EXPIRED'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// filters: { student_id, status, date, limit } มาจาก query string ทั้งหมดไม่บังคับ
function buildBookingQuery(filters = {}) {
  const errors = [];
  const where = [];
  const params = [];

  if (filters.student_id) {
    const id = String(filters.student_id).trim();
    if (id.length > 50) errors.push('student_id ยาวเกินไป');
    params.push(id);
    where.push(`b.student_id = $${params.length}`);
  }
  if (filters.status) {
    const status = String(filters.status).toUpperCase();
    if (!STATUSES.includes(status)) errors.push(`status ต้องเป็น ${STATUSES.join(', ')}`);
    params.push(status);
    where.push(`b.status = $${params.length}`);
  }
  if (filters.date) {
    if (!DATE_RE.test(filters.date) || Number.isNaN(Date.parse(filters.date))) {
      errors.push('date ต้องอยู่ในรูปแบบ YYYY-MM-DD');
    }
    params.push(filters.date);
    where.push(`b.booking_date = $${params.length}`);
  }
  let limit = 200;
  if (filters.limit !== undefined) {
    limit = Number(filters.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) errors.push('limit ต้องเป็นตัวเลข 1-1000');
  }
  if (errors.length) throw new HttpError(400, 'เงื่อนไขการค้นหาไม่ถูกต้อง', errors);

  params.push(limit);
  const sql = `
    SELECT b.booking_id, b.student_id, b.room_id, r.room_name,
           to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date,
           to_char(b.start_time, 'HH24:MI') AS start_time,
           to_char(b.end_time, 'HH24:MI') AS end_time,
           b.status, b.created_at, b.confirmed_at
      FROM booking b
      JOIN room r ON r.room_id = b.room_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY b.booking_date DESC, b.start_time DESC, b.booking_id DESC
     LIMIT $${params.length}`;
  return { sql, params };
}

async function listBookings(db, filters) {
  const { sql, params } = buildBookingQuery(filters);
  const { rows } = await db.query(sql, params);
  const bookings = rows.map((r) => ({ ...r, booking_id: Number(r.booking_id), room_id: Number(r.room_id) }));
  return { count: bookings.length, bookings };
}

module.exports = { listBookings, buildBookingQuery, STATUSES };
