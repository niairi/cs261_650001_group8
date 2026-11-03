const { sendBookingConfirmation, sendBookingCancellation, sendBookingUpdate } = require('../services/emailService');
const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { HttpError } = require('../errors');
const { isRealDate, validateBooking, assertChangeable } = require('../services/bookingRules');

const router = express.Router();

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
      `INSERT INTO booking (student_id, room_id, booking_date, start_time, end_time, people, purpose)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING booking_id, student_id, room_id,
                 to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
                 to_char(start_time, 'HH24:MI') AS start_time,
                 to_char(end_time, 'HH24:MI') AS end_time,
                 people, purpose, status, created_at`,
      [req.user.student_id, b.roomId, b.booking_date, b.start_time, b.end_time, b.people, b.purpose]
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
              b.people, b.purpose, b.status, b.created_at
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

    // ยกเลิกได้ก่อนเวลาเริ่มอย่างน้อย 30 นาที (US4 TC4)
    assertChangeable(booking, 'ยกเลิก');

    // เปลี่ยนสถานะแทนการลบ เพื่อเก็บประวัติไว้
    // JOIN room เพื่อได้ชื่อห้องไปใส่ในอีเมล
    const updated = await client.query(
      `UPDATE booking b
          SET status = 'CANCELLED'
         FROM room r
        WHERE b.booking_id = $1
          AND r.room_id = b.room_id
        RETURNING b.booking_id, b.student_id, b.room_id, r.room_name,
                  to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date,
                  to_char(b.start_time, 'HH24:MI') AS start_time,
                  to_char(b.end_time, 'HH24:MI') AS end_time,
                  b.status`,
      [bookingId]
    );

    await client.query('COMMIT');

    const row = updated.rows[0];
    // ส่งอีเมลยืนยันการยกเลิก (US7) — ไม่รอ และถ้าส่งไม่ได้ก็ไม่ทำให้การยกเลิกล้มเหลว
    sendBookingCancellation(req.user.email, row)
      .catch((err) => console.error('ส่งอีเมลยืนยันการยกเลิกไม่สำเร็จ:', err.message));
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


// PATCH /booking/:id — แก้ไขห้อง/เวลาการจอง (US6) ต้อง login
// body: ส่งเฉพาะค่าที่จะเปลี่ยนก็ได้ { room_id, people, booking_date, start_time, end_time, purpose }
// ค่าที่ไม่ส่งมาจะใช้ค่าเดิมของการจอง แล้วตรวจกฎเดียวกับการจองใหม่ทั้งหมด
// ทุกอย่างอยู่ใน transaction เดียว ถ้าไม่ผ่านข้อใดข้อหนึ่ง การจองเดิมยังอยู่เหมือนเดิม (US6 TC2)
router.patch('/:id', requireAuth, async (req, res, next) => {
  let client;
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      throw new HttpError(400, 'รหัสการจองไม่ถูกต้อง');
    }
    const body = req.body || {};

    client = await pool.connect();
    await client.query('BEGIN');

    // FOR UPDATE OF b ล็อกการจองนี้ไว้ กันแก้ไข/ยกเลิกซ้อนกันพร้อมกัน
    const found = await client.query(
      `SELECT b.booking_id, b.student_id, b.room_id, r.room_name, b.people, b.purpose, b.status,
              to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date,
              to_char(b.start_time, 'HH24:MI') AS start_time,
              to_char(b.end_time, 'HH24:MI') AS end_time
         FROM booking b
         JOIN room r ON r.room_id = b.room_id
        WHERE b.booking_id = $1
        FOR UPDATE OF b`,
      [bookingId]
    );
    if (found.rows.length === 0) throw new HttpError(404, 'ไม่พบการจองนี้');

    const old = found.rows[0];
    if (old.student_id !== req.user.student_id) {
      throw new HttpError(403, 'แก้ไขได้เฉพาะการจองของตัวเองเท่านั้น');
    }
    if (old.status === 'CANCELLED') throw new HttpError(409, 'การจองนี้ถูกยกเลิกไปแล้ว');
    if (old.status === 'EXPIRED') throw new HttpError(409, 'การจองนี้หมดอายุแล้ว');

    // แก้ไขได้ก่อนเวลาเริ่ม (ของการจองเดิม) อย่างน้อย 30 นาที (US6 TC4)
    assertChangeable(old, 'แก้ไข');

    // รวมค่าใหม่กับค่าเดิม แล้วตรวจกฎเดียวกับการจองใหม่ (ว่าง, ไม่เกิน 3 ชม., 09:00–16:00, ไม่เกิน 7 วัน)
    const b = validateBooking({
      room_id: body.room_id ?? old.room_id,
      people: body.people ?? old.people,
      purpose: 'purpose' in body ? body.purpose : old.purpose,
      booking_date: body.booking_date ?? old.booking_date,
      start_time: body.start_time ?? old.start_time,
      end_time: body.end_time ?? old.end_time,
    });

    const unchanged =
      b.roomId === Number(old.room_id) &&
      b.booking_date === old.booking_date &&
      b.start_time === old.start_time &&
      b.end_time === old.end_time &&
      b.people === old.people &&
      b.purpose === old.purpose;
    if (unchanged) throw new HttpError(400, 'ไม่มีข้อมูลการจองที่เปลี่ยนแปลง');

    // ล็อกห้องใหม่ไว้ เหมือนตอนจองใหม่ กันคนอื่นจองช่วงเดียวกันพร้อมกัน
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

    // ช่วงใหม่ต้องว่าง (ไม่นับการจองของตัวเอง ช่วงเดิมจึงว่างให้คนอื่นหลังแก้ไข — US6 TC1)
    const clash = await client.query(
      `SELECT 1
         FROM booking
        WHERE room_id = $1
          AND booking_date = $2
          AND status IN ('BOOKED', 'CONFIRMED')
          AND start_time < $4::time
          AND end_time > $3::time
          AND booking_id <> $5
        LIMIT 1`,
      [b.roomId, b.booking_date, b.start_time, b.end_time, bookingId]
    );
    if (clash.rows.length > 0) throw new HttpError(409, 'ช่วงเวลานี้ถูกจองแล้ว'); // US6 TC2

    const updated = await client.query(
      `UPDATE booking
          SET room_id = $2, booking_date = $3, start_time = $4, end_time = $5, people = $6, purpose = $7
        WHERE booking_id = $1
        RETURNING booking_id, student_id, room_id,
                  to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
                  to_char(start_time, 'HH24:MI') AS start_time,
                  to_char(end_time, 'HH24:MI') AS end_time,
                  people, purpose, status, created_at`,
      [bookingId, b.roomId, b.booking_date, b.start_time, b.end_time, b.people, b.purpose]
    );

    await client.query('COMMIT');

    const row = { ...updated.rows[0], room_name: room.room_name };
    const previous = {
      room_id: old.room_id,
      room_name: old.room_name,
      booking_date: old.booking_date,
      start_time: old.start_time,
      end_time: old.end_time,
    };

    // อีเมลแจ้งการเปลี่ยนแปลง + บันทึก email_logs — ไม่รอ และถ้าส่งไม่ได้ก็ไม่ทำให้การแก้ไขล้มเหลว
    sendBookingUpdate(req.user.email, row, previous)
      .catch((err) => console.error('ส่งอีเมลแจ้งการแก้ไขการจองไม่สำเร็จ:', err.message));

    res.json({
      message: 'แก้ไขการจองสำเร็จ',
      booking: { ...row, booking_id: Number(row.booking_id), room_id: Number(row.room_id) },
      previous: { ...previous, room_id: Number(previous.room_id) },
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    if (client) client.release();
  }
});


module.exports = router;