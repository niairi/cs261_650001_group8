// US7: เจ้าหน้าที่ดูข้อมูลการจองทั้งหมด + รายงานสรุป (Task65) — อ่านจากตาราง booking + room
// (เอกสาร Sprint 1 เรียกเรื่องนี้ว่า US5 ตามเลขเดิม)
const { HttpError } = require('../errors');

const STATUSES = ['BOOKED', 'CONFIRMED', 'CANCELLED', 'EXPIRED'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MAX_REPORT_DAYS = 93;

const isRealDate = (d) => DATE_RE.test(d) && !Number.isNaN(Date.parse(d)) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

// ตรวจ room_id (ไม่บังคับ) คืน null ถ้าไม่ส่ง
function parseRoomId(value, errors) {
  if (value === undefined || value === '') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    errors.push('room_id ต้องเป็นตัวเลข');
    return null;
  }
  return id;
}

// filters: { student_id, status, date, room_id, date_from, date_to, order, limit } มาจาก query string ทั้งหมดไม่บังคับ
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
  // US7 TC3: กรองตามห้อง
  const roomId = parseRoomId(filters.room_id, errors);
  if (roomId !== null) {
    params.push(roomId);
    where.push(`b.room_id = $${params.length}`);
  }
  // ดูเป็นช่วงวันที่
  for (const [key, op] of [['date_from', '>='], ['date_to', '<=']]) {
    if (filters[key] === undefined || filters[key] === '') continue;
    if (!isRealDate(String(filters[key]))) {
      errors.push(`${key} ต้องอยู่ในรูปแบบ YYYY-MM-DD`);
      continue;
    }
    params.push(String(filters[key]));
    where.push(`b.booking_date ${op} $${params.length}`);
  }
  if (filters.date_from && filters.date_to && isRealDate(String(filters.date_from)) && isRealDate(String(filters.date_to))
      && filters.date_from > filters.date_to) {
    errors.push('date_from ต้องไม่หลัง date_to');
  }
  let order = 'DESC';
  if (filters.order !== undefined && filters.order !== '') {
    const o = String(filters.order).toLowerCase();
    if (o !== 'asc' && o !== 'desc') errors.push('order ต้องเป็น asc หรือ desc');
    else order = o.toUpperCase();
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
           b.people, b.purpose, b.status, b.created_at, b.confirmed_at
      FROM booking b
      JOIN room r ON r.room_id = b.room_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY b.booking_date ${order}, b.start_time ${order}, b.booking_id ${order}
     LIMIT $${params.length}`;
  return { sql, params };
}

async function listBookings(db, filters) {
  const { sql, params } = buildBookingQuery(filters);
  const { rows } = await db.query(sql, params);
  const bookings = rows.map((r) => ({ ...r, booking_id: Number(r.booking_id), room_id: Number(r.room_id) }));
  return { count: bookings.length, bookings };
}

// ---------- รายงานสรุป (US7 TC6 · Task65) ----------
// นับจำนวนการจองตามวันและห้อง: ทั้งหมด / จองอยู่ / Check-in แล้ว / ยกเลิก / No-show
// filters: { date_from, date_to, room_id } ไม่ส่งวันที่ = 7 วันล่าสุด (6 วันก่อน ถึงวันนี้)
function buildSummaryQuery(filters = {}, now = new Date()) {
  const errors = [];
  const day = (offset) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString('sv-SE');
  };
  const dateFrom = filters.date_from ? String(filters.date_from) : day(-6);
  const dateTo = filters.date_to ? String(filters.date_to) : day(0);
  if (!isRealDate(dateFrom)) errors.push('date_from ต้องอยู่ในรูปแบบ YYYY-MM-DD');
  if (!isRealDate(dateTo)) errors.push('date_to ต้องอยู่ในรูปแบบ YYYY-MM-DD');
  if (!errors.length) {
    if (dateFrom > dateTo) errors.push('date_from ต้องไม่หลัง date_to');
    else if ((Date.parse(dateTo) - Date.parse(dateFrom)) / 86400000 + 1 > MAX_REPORT_DAYS) {
      errors.push(`ช่วงวันที่ต้องไม่เกิน ${MAX_REPORT_DAYS} วัน`);
    }
  }
  const roomId = parseRoomId(filters.room_id, errors);
  if (errors.length) throw new HttpError(400, 'เงื่อนไขการค้นหาไม่ถูกต้อง', errors);

  const params = [dateFrom, dateTo];
  let roomWhere = '';
  if (roomId !== null) {
    params.push(roomId);
    roomWhere = ` AND b.room_id = $${params.length}`;
  }
  const sql = `
    SELECT to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date, b.room_id, r.room_name,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE b.status = 'BOOKED')::int AS booked,
           COUNT(*) FILTER (WHERE b.status = 'CONFIRMED')::int AS confirmed,
           COUNT(*) FILTER (WHERE b.status = 'CANCELLED')::int AS cancelled,
           COUNT(*) FILTER (WHERE b.status = 'EXPIRED' AND b.confirmed_at IS NULL)::int AS no_show
      FROM booking b
      JOIN room r ON r.room_id = b.room_id
     WHERE b.booking_date BETWEEN $1 AND $2${roomWhere}
     GROUP BY b.booking_date, b.room_id, r.room_name
     ORDER BY b.booking_date, b.room_id`;
  return { sql, params, dateFrom, dateTo };
}

const COUNT_KEYS = ['total', 'booked', 'confirmed', 'cancelled', 'no_show'];

async function bookingSummary(db, filters, now = new Date()) {
  const { sql, params, dateFrom, dateTo } = buildSummaryQuery(filters, now);
  const { rows } = await db.query(sql, params);
  const out = rows.map((r) => {
    const row = { booking_date: r.booking_date, room_id: Number(r.room_id), room_name: r.room_name };
    for (const k of COUNT_KEYS) row[k] = Number(r[k] || 0);
    return row;
  });
  const totals = Object.fromEntries(COUNT_KEYS.map((k) => [k, out.reduce((sum, r) => sum + r[k], 0)]));
  return { date_from: dateFrom, date_to: dateTo, rows: out, totals };
}

module.exports = { listBookings, buildBookingQuery, buildSummaryQuery, bookingSummary, STATUSES };
