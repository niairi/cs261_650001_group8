// กฎการจองที่ใช้ร่วมกันระหว่าง จองใหม่ (US3), แก้ไขการจอง (US6) และยกเลิก (US4)
// แยกออกมาจาก routes/bookings.js เพื่อให้เขียน Unit Test ได้โดยไม่ต้องต่อฐานข้อมูล
const { HttpError } = require('../errors');

const OPEN = '09:00';
const CLOSE = '16:00'; // มติประชุม 27 ต.ค.: เวลาทำการ 09:00–16:00
const MAX_HOURS = 3;
const CHANGE_BEFORE_MIN = 30; // แก้ไข/ยกเลิกได้ก่อนเวลาเริ่มอย่างน้อย 30 นาที (US4 TC4, US6 TC4)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):00$/;

const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const isRealDate = (d) =>
  DATE_RE.test(d) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

// ตรวจข้อมูลการจอง (ใช้ทั้งจองใหม่และแก้ไข) ถ้าผิดจะ throw HttpError 400 พร้อม details
// now ส่งเข้ามาได้เพื่อใช้ตอน test
function validateBooking(body, now = new Date()) {
  const errors = [];
  const roomId = Number(body.room_id);
  const people = Number(body.people);
  const { booking_date, start_time, end_time } = body;
  const purpose = typeof body.purpose === 'string' && body.purpose.trim() ? body.purpose.trim() : null;

  if (!Number.isInteger(roomId) || roomId <= 0) errors.push('room_id ต้องเป็นตัวเลข');
  if (!Number.isInteger(people) || people < 1) errors.push('จำนวนผู้เข้าใช้ต้องเป็นจำนวนเต็มตั้งแต่ 1 คนขึ้นไป');
  if (typeof booking_date !== 'string' || !isRealDate(booking_date)) errors.push('วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD');
  if (typeof start_time !== 'string' || !TIME_RE.test(start_time)) errors.push('เวลาเริ่มต้องเป็นเวลาเต็มชั่วโมง เช่น 09:00');
  if (typeof end_time !== 'string' || !TIME_RE.test(end_time)) errors.push('เวลาสิ้นสุดต้องเป็นเวลาเต็มชั่วโมง เช่น 12:00');
  if (purpose && purpose.length > 255) errors.push('วัตถุประสงค์ยาวได้ไม่เกิน 255 ตัวอักษร');
  if (errors.length) throw new HttpError(400, 'ข้อมูลการจองไม่ถูกต้อง', errors);

  const start = toMinutes(start_time);
  const end = toMinutes(end_time);
  if (start < toMinutes(OPEN) || end > toMinutes(CLOSE)) errors.push(`จองได้เฉพาะช่วง ${OPEN} - ${CLOSE} น.`);
  if (end <= start) errors.push('เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น');
  if (end - start > MAX_HOURS * 60) errors.push(`จองได้ครั้งละไม่เกิน ${MAX_HOURS} ชั่วโมง`);

  // ห้ามจองเวลาที่ผ่านมาแล้ว (ใช้เวลาของเครื่องที่รัน server)
  const today = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD
  const nowTime = now.toTimeString().slice(0, 5); // HH:MM
  if (booking_date < today || (booking_date === today && start_time <= nowTime)) {
    errors.push('ไม่สามารถจองเวลาที่ผ่านมาแล้ว');
  }

  // จองล่วงหน้าได้ไม่เกิน BOOKING_DAYS_AHEAD วัน (ค่าเริ่มต้น 7 วัน นับวันนี้เป็นวันที่ 0)
  const maxDaysAhead = Number(process.env.BOOKING_DAYS_AHEAD || 7);
  const last = new Date(now);
  last.setDate(last.getDate() + maxDaysAhead);
  if (booking_date > last.toLocaleDateString('sv-SE')) {
    errors.push(`จองล่วงหน้าได้ไม่เกิน ${maxDaysAhead} วัน`);
  }
  if (errors.length) throw new HttpError(400, 'ข้อมูลการจองไม่ถูกต้อง', errors);

  return { roomId, people, purpose, booking_date, start_time, end_time };
}

// เหลือเวลากี่นาทีก่อนเริ่มการจอง (date = YYYY-MM-DD, time = HH:MM ตามเวลาเครื่อง)
function minutesUntilStart(date, time, now = new Date()) {
  const startAt = new Date(`${date}T${time}:00`);
  return (startAt.getTime() - now.getTime()) / 60000;
}

// แก้ไข/ยกเลิกได้เมื่อเหลือก่อนเวลาเริ่มอย่างน้อย 30 นาที — action เช่น 'แก้ไข', 'ยกเลิก'
function assertChangeable(booking, action, now = new Date()) {
  if (minutesUntilStart(booking.booking_date, booking.start_time, now) < CHANGE_BEFORE_MIN) {
    throw new HttpError(400, `${action}ได้ก่อนเวลาเริ่มอย่างน้อย ${CHANGE_BEFORE_MIN} นาที`);
  }
}

module.exports = {
  OPEN,
  CLOSE,
  MAX_HOURS,
  CHANGE_BEFORE_MIN,
  isRealDate,
  validateBooking,
  minutesUntilStart,
  assertChangeable,
};