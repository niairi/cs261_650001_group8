const { sendBookingConfirmation } = require('../services/emailService');
const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { HttpError } = require('../errors');

const router = express.Router();

const OPEN = '09:00';   
const CLOSE = '17:00';  
const MAX_HOURS = 3;    

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):00$/; 

const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const isRealDate = (d) =>
  DATE_RE.test(d) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;


function validateBooking(body) {
  const errors = [];
  const roomId = Number(body.room_id);
  const people = Number(body.people);
  const { booking_date, start_time, end_time } = body;

  if (!Number.isInteger(roomId) || roomId <= 0) errors.push('room_id ต้องเป็นตัวเลข');
  if (!Number.isInteger(people) || people < 1) errors.push('จำนวนผู้เข้าใช้ต้องเป็นจำนวนเต็มตั้งแต่ 1 คนขึ้นไป');
  if (typeof booking_date !== 'string' || !isRealDate(booking_date)) errors.push('วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD');
  if (typeof start_time !== 'string' || !TIME_RE.test(start_time)) errors.push('เวลาเริ่มต้องเป็นเวลาเต็มชั่วโมง เช่น 09:00');
  if (typeof end_time !== 'string' || !TIME_RE.test(end_time)) errors.push('เวลาสิ้นสุดต้องเป็นเวลาเต็มชั่วโมง เช่น 12:00');
  if (errors.length) throw new HttpError(400, 'ข้อมูลการจองไม่ถูกต้อง', errors);

  const start = toMinutes(start_time);
  const end = toMinutes(end_time);
  if (start < toMinutes(OPEN) || end > toMinutes(CLOSE)) errors.push(`จองได้เฉพาะช่วง ${OPEN} - ${CLOSE} น.`);
  if (end <= start) errors.push('เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น');
  if (end - start > MAX_HOURS * 60) errors.push(`จองได้ครั้งละไม่เกิน ${MAX_HOURS} ชั่วโมง`);

  // ห้ามจองเวลาที่ผ่านมาแล้ว (ใช้เวลาของเครื่องที่รัน server)
  const now = new Date();
  const today = now.toLocaleDateString('sv-SE'); // ได้รูปแบบ YYYY-MM-DD
  const nowTime = now.toTimeString().slice(0, 5); // HH:MM
  if (booking_date < today || (booking_date === today && start_time <= nowTime)) {
    errors.push('ไม่สามารถจองเวลาที่ผ่านมาแล้ว');
  }
  if (errors.length) throw new HttpError(400, 'ข้อมูลการจองไม่ถูกต้อง', errors);

  return { roomId, people, booking_date, start_time, end_time };
}


router.post('/', requireAuth, async (req, res, next) => {
  let client;
  try {
    const b = validateBooking(req.body || {});

    client = await pool.connect();
    await client.query('BEGIN');

    
    const roomResult = await client.query(
      `SELECT room_id, room_name, capacity
         FROM room
        WHERE room_id = $1 AND is_active
        FOR UPDATE`,
      [b.roomId]
    );
    if (roomResult.rows.length === 0) throw new HttpError(404, 'ไม่พบห้องนี้ หรือห้องปิดใช้งาน');

    const room = roomResult.rows[0];
    if (b.people > room.capacity) {
      throw new HttpError(400, `ห้องนี้รองรับได้สูงสุด ${room.capacity} คน`);
    }

    
    const clash = await client.query(
      `SELECT 1
         FROM booking
        WHERE room_id = $1
          AND booking_date = $2
          AND status IN ('BOOKED', 'CONFIRMED')
          AND start_time < $4::time
          AND end_time > $3::time
        LIMIT 1`,
      [b.roomId, b.booking_date, b.start_time, b.end_time]
    );
    if (clash.rows.length > 0) throw new HttpError(409, 'ช่วงเวลานี้มีผู้จองห้องนี้แล้ว');

    const inserted = await client.query(
      `INSERT INTO booking (student_id, room_id, booking_date, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING booking_id, student_id, room_id,
                 to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
                 to_char(start_time, 'HH24:MI') AS start_time,
                 to_char(end_time, 'HH24:MI') AS end_time,
                 status, created_at`,
      [req.user.student_id, b.roomId, b.booking_date, b.start_time, b.end_time]
    );

    await client.query('COMMIT');

    const row = inserted.rows[0];
        sendBookingConfirmation(req.user.email, { ...row, room_name: room.room_name })
      .catch((err) => console.error('ส่งอีเมลยืนยันไม่สำเร็จ:', err.message));
    res.status(201).json({
      ...row,
      booking_id: Number(row.booking_id),
      room_id: Number(row.room_id),
      room_name: room.room_name,
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    if (client) client.release();
  }
});


router.get('/', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (typeof date !== 'string' || !isRealDate(date)) {
      throw new HttpError(400, 'ต้องระบุ date ในรูปแบบ YYYY-MM-DD');
    }
    const { rows } = await pool.query(
      `SELECT room_id,
              to_char(start_time, 'HH24:MI') AS start_time,
              to_char(end_time, 'HH24:MI') AS end_time,
              status
         FROM booking
        WHERE booking_date = $1
          AND status IN ('BOOKED', 'CONFIRMED')
        ORDER BY room_id, start_time`,
      [date]
    );
    res.json(rows.map((r) => ({ ...r, room_id: Number(r.room_id) })));
  } catch (err) {
    next(err);
  }
});


// GET /booking/me — การจองทั้งหมดของผู้ใช้ที่ login อยู่ (ใช้ทำหน้าประวัติ / ปุ่มยกเลิก)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.booking_id, b.room_id, r.room_name,
              to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date,
              to_char(b.start_time, 'HH24:MI') AS start_time,
              to_char(b.end_time, 'HH24:MI') AS end_time,
              b.status, b.created_at
         FROM booking b
         JOIN room r ON r.room_id = b.room_id
        WHERE b.student_id = $1
        ORDER BY b.booking_date DESC, b.start_time DESC`,
      [req.user.student_id]
    );
    res.json(rows.map((r) => ({ ...r, booking_id: Number(r.booking_id), room_id: Number(r.room_id) })));
  } catch (err) {
    next(err);
  }
});

// PATCH /booking/:id/cancel — ยกเลิกการจอง (US4) ต้อง login
router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
  let client;
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      throw new HttpError(400, 'รหัสการจองไม่ถูกต้อง');
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // FOR UPDATE กันการยกเลิกซ้อนกันพร้อมกัน
    const found = await client.query(
      `SELECT booking_id, student_id, status,
              to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
              to_char(start_time, 'HH24:MI') AS start_time
         FROM booking
        WHERE booking_id = $1
        FOR UPDATE`,
      [bookingId]
    );
    if (found.rows.length === 0) throw new HttpError(404, 'ไม่พบการจองนี้');

    const booking = found.rows[0];
    if (booking.student_id !== req.user.student_id) {
      throw new HttpError(403, 'ยกเลิกได้เฉพาะการจองของตัวเองเท่านั้น');
    }
    if (booking.status === 'CANCELLED') throw new HttpError(409, 'การจองนี้ถูกยกเลิกไปแล้ว');
    if (booking.status === 'EXPIRED') throw new HttpError(409, 'การจองนี้หมดอายุแล้ว');

    // ห้ามยกเลิกการจองที่ถึงเวลาเริ่มแล้ว
    const now = new Date();
    const today = now.toLocaleDateString('sv-SE');
    const nowTime = now.toTimeString().slice(0, 5);
    if (booking.booking_date < today || (booking.booking_date === today && booking.start_time <= nowTime)) {
      throw new HttpError(400, 'ไม่สามารถยกเลิกการจองที่ถึงเวลาเริ่มแล้ว');
    }

    // เปลี่ยนสถานะแทนการลบ เพื่อเก็บประวัติไว้
    const updated = await client.query(
      `UPDATE booking
          SET status = 'CANCELLED'
        WHERE booking_id = $1
        RETURNING booking_id, room_id,
                  to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
                  to_char(start_time, 'HH24:MI') AS start_time,
                  to_char(end_time, 'HH24:MI') AS end_time,
                  status`,
      [bookingId]
    );

    await client.query('COMMIT');

    const row = updated.rows[0];
    res.json({
      message: 'ยกเลิกการจองสำเร็จ',
      booking: { ...row, booking_id: Number(row.booking_id), room_id: Number(row.room_id) },
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    if (client) client.release();
  }
});


module.exports = router;