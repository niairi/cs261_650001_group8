// US12 (Task85): เจ้าหน้าที่จัดการข้อมูลห้อง — เพิ่ม / แก้ไขห้อง และปิดปรับปรุงห้องเป็นรายวัน
// ใช้ตาราง room (เดิม) + room_closure (Task84) : room_id, closure_date, reason, created_by
// ถ้ายังไม่มีตาราง room_closure (ก่อน merge Task84) ถือว่าไม่มีห้องปิดปรับปรุง ระบบจองเดิมยังทำงานได้
const { HttpError } = require('../errors');
const { isRealDate } = require('./bookingRules');

const UNDEFINED_TABLE = '42P01';
const UNIQUE_VIOLATION = '23505';
const CLOSED_MESSAGE = 'ห้องนี้ปิดปรับปรุงในวันที่เลือก';

const todayOf = (now = new Date()) => now.toLocaleDateString('sv-SE'); // YYYY-MM-DD ตามเวลาเครื่อง (TZ=Asia/Bangkok)

function noClosureTable() {
  return new HttpError(503, 'ยังไม่มีตาราง room_closure ในฐานข้อมูล (รอ migration ของ Task84)');
}

function parseRoomId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'room_id ต้องเป็นตัวเลข');
  return id;
}

const toRoom = (r) => ({
  room_id: Number(r.room_id),
  room_name: r.room_name,
  capacity: Number(r.capacity),
  location: r.location ?? null,
  is_active: r.is_active,
});

// ---------- ตรวจข้อมูลห้อง ----------
// partial = true สำหรับแก้ไข (ส่งมาเฉพาะช่องที่จะเปลี่ยน)
function validateRoomInput(body = {}, { partial = false } = {}) {
  const errors = [];
  const out = {};

  if (!partial && body.room_id !== undefined && body.room_id !== null && body.room_id !== '') {
    const id = Number(body.room_id);
    if (!Number.isInteger(id) || id <= 0) errors.push('room_id ต้องเป็นจำนวนเต็มบวก');
    else out.room_id = id;
  }
  if (!partial || body.room_name !== undefined) {
    const name = typeof body.room_name === 'string' ? body.room_name.trim() : '';
    if (!name) errors.push('กรุณากรอกชื่อห้อง');
    else if (name.length > 100) errors.push('ชื่อห้องยาวได้ไม่เกิน 100 ตัวอักษร');
    else out.room_name = name;
  }
  if (!partial || body.capacity !== undefined) {
    const capacity = Number(body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) errors.push('ความจุต้องเป็นจำนวนเต็ม 1-100 คน');
    else out.capacity = capacity;
  }
  if (body.location !== undefined) {
    if (body.location !== null && typeof body.location !== 'string') errors.push('location ต้องเป็นข้อความ');
    else if (body.location && body.location.length > 255) errors.push('location ยาวได้ไม่เกิน 255 ตัวอักษร');
    else out.location = body.location ? body.location.trim() : null;
  }
  if (body.is_active !== undefined) {
    if (typeof body.is_active !== 'boolean') errors.push('is_active ต้องเป็น true หรือ false');
    else out.is_active = body.is_active;
  }
  if (partial && errors.length === 0 && Object.keys(out).length === 0) {
    errors.push('ไม่มีข้อมูลห้องที่เปลี่ยนแปลง');
  }
  if (errors.length) throw new HttpError(400, 'ข้อมูลห้องไม่ถูกต้อง', errors);
  return out;
}

function validateClosureInput(body = {}, now = new Date()) {
  const errors = [];
  const date = body.date;
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : null;
  if (typeof date !== 'string' || !isRealDate(date)) errors.push('วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD');
  else if (date < todayOf(now)) errors.push('ปิดปรับปรุงย้อนหลังไม่ได้');
  if (reason && reason.length > 255) errors.push('เหตุผลยาวได้ไม่เกิน 255 ตัวอักษร');
  if (errors.length) throw new HttpError(400, 'ข้อมูลการปิดปรับปรุงไม่ถูกต้อง', errors);
  return { date, reason };
}

// ---------- ใช้ร่วมกับการจอง (US3, US6) ----------
// คืนแถวการปิดปรับปรุงของห้องในวันนั้น หรือ null
async function findClosure(db, roomId, date) {
  try {
    const { rows } = await db.query(
      `SELECT closure_id, room_id, to_char(closure_date, 'YYYY-MM-DD') AS closure_date, reason
         FROM room_closure
        WHERE room_id = $1 AND closure_date = $2
        LIMIT 1`,
      [roomId, date]
    );
    return rows[0] || null;
  } catch (err) {
    if (err.code === UNDEFINED_TABLE) return null;
    throw err;
  }
}

// POST /booking และ PATCH /booking/:id เรียกหลังล็อกห้องแล้ว (US12 TC2)
async function assertRoomOpen(db, roomId, date) {
  const closure = await findClosure(db, roomId, date);
  if (closure) {
    throw new HttpError(409, CLOSED_MESSAGE, closure.reason ? [`เหตุผล: ${closure.reason}`] : undefined);
  }
}

// GET /rooms?date= — ห้องที่เปิดใช้งาน พร้อมบอกว่าวันนั้นปิดปรับปรุงหรือไม่ (US12 TC1)
async function listRoomsForDate(db, date) {
  const { rows } = await db.query(
    `SELECT room_id, room_name, capacity, location
       FROM room
      WHERE is_active
      ORDER BY room_id`
  );
  const closures = new Map();
  try {
    const result = await db.query(
      `SELECT room_id, reason
         FROM room_closure
        WHERE closure_date = $1`,
      [date]
    );
    for (const c of result.rows) closures.set(Number(c.room_id), c.reason ?? null);
  } catch (err) {
    if (err.code !== UNDEFINED_TABLE) throw err;
  }
  return rows.map((r) => {
    const id = Number(r.room_id);
    return {
      room_id: id,
      room_name: r.room_name,
      capacity: Number(r.capacity),
      location: r.location ?? null,
      closed: closures.has(id),
      closure_reason: closures.has(id) ? closures.get(id) : null,
    };
  });
}

// ---------- สำหรับเจ้าหน้าที่ (requireAdmin) ----------
// ห้องทั้งหมด (รวมที่ปิดใช้งาน) พร้อมวันปิดปรับปรุงตั้งแต่วันนี้เป็นต้นไป
async function listRoomsForAdmin(db, now = new Date()) {
  const { rows } = await db.query(
    `SELECT room_id, room_name, capacity, location, is_active
       FROM room
      ORDER BY room_id`
  );
  const closures = new Map();
  try {
    const result = await db.query(
      `SELECT room_id, to_char(closure_date, 'YYYY-MM-DD') AS closure_date, reason
         FROM room_closure
        WHERE closure_date >= $1
        ORDER BY closure_date`,
      [todayOf(now)]
    );
    for (const c of result.rows) {
      const id = Number(c.room_id);
      if (!closures.has(id)) closures.set(id, []);
      closures.get(id).push({ date: c.closure_date, reason: c.reason ?? null });
    }
  } catch (err) {
    if (err.code !== UNDEFINED_TABLE) throw err;
  }
  return rows.map((r) => ({ ...toRoom(r), closures: closures.get(Number(r.room_id)) || [] }));
}

async function createRoom(db, body) {
  const room = validateRoomInput(body);
  const cols = ['room_name', 'capacity', 'location'];
  const values = [room.room_name, room.capacity, room.location ?? null];
  if (room.room_id) { cols.unshift('room_id'); values.unshift(room.room_id); }
  if (room.is_active !== undefined) { cols.push('is_active'); values.push(room.is_active); }
  try {
    const { rows } = await db.query(
      `INSERT INTO room (${cols.join(', ')})
       VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING room_id, room_name, capacity, location, is_active`,
      values
    );
    return toRoom(rows[0]);
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) throw new HttpError(409, 'มีห้องรหัสนี้อยู่แล้ว');
    throw err;
  }
}

async function updateRoom(db, roomIdValue, body) {
  const roomId = parseRoomId(roomIdValue);
  const changes = validateRoomInput(body, { partial: true });
  const keys = Object.keys(changes);
  const { rows } = await db.query(
    `UPDATE room
        SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')}
      WHERE room_id = $1
      RETURNING room_id, room_name, capacity, location, is_active`,
    [roomId, ...keys.map((k) => changes[k])]
  );
  if (rows.length === 0) throw new HttpError(404, 'ไม่พบห้องนี้');
  return toRoom(rows[0]);
}

// ปิดปรับปรุงห้องวันเดียว — ถ้าวันนั้นมีการจองค้างอยู่ ให้เจ้าหน้าที่จัดการก่อน (ไม่ยกเลิกของนักศึกษาให้อัตโนมัติ)
async function addClosure(db, roomIdValue, body, adminId, now = new Date()) {
  const roomId = parseRoomId(roomIdValue);
  const { date, reason } = validateClosureInput(body, now);

  const room = await db.query('SELECT room_id, room_name FROM room WHERE room_id = $1', [roomId]);
  if (room.rows.length === 0) throw new HttpError(404, 'ไม่พบห้องนี้');

  const booked = await db.query(
    `SELECT booking_id, student_id,
            to_char(start_time, 'HH24:MI') AS start_time,
            to_char(end_time, 'HH24:MI') AS end_time
       FROM booking
      WHERE room_id = $1 AND booking_date = $2 AND status IN ('BOOKED', 'CONFIRMED')
      ORDER BY start_time`,
    [roomId, date]
  );
  if (booked.rows.length > 0) {
    throw new HttpError(
      409,
      `วันนี้มีการจองห้องนี้อยู่ ${booked.rows.length} รายการ ต้องยกเลิกก่อนปิดปรับปรุง`,
      booked.rows.map((b) => `#${b.booking_id} ${b.student_id} ${b.start_time}-${b.end_time}`)
    );
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO room_closure (room_id, closure_date, reason, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING closure_id, room_id, to_char(closure_date, 'YYYY-MM-DD') AS closure_date, reason, created_by`,
      [roomId, date, reason, adminId]
    );
    const c = rows[0];
    return {
      closure_id: Number(c.closure_id),
      room_id: Number(c.room_id),
      room_name: room.rows[0].room_name,
      date: c.closure_date,
      reason: c.reason ?? null,
      created_by: c.created_by,
    };
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) throw new HttpError(409, 'ห้องนี้ปิดปรับปรุงวันนี้อยู่แล้ว');
    if (err.code === UNDEFINED_TABLE) throw noClosureTable();
    throw err;
  }
}

// ยกเลิกการปิดปรับปรุง (เปิดห้องวันนั้นกลับมา)
async function removeClosure(db, roomIdValue, date) {
  const roomId = parseRoomId(roomIdValue);
  if (typeof date !== 'string' || !isRealDate(date)) throw new HttpError(400, 'วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD');
  try {
    const { rows } = await db.query(
      `DELETE FROM room_closure
        WHERE room_id = $1 AND closure_date = $2
        RETURNING room_id, to_char(closure_date, 'YYYY-MM-DD') AS closure_date`,
      [roomId, date]
    );
    if (rows.length === 0) throw new HttpError(404, 'ห้องนี้ไม่ได้ปิดปรับปรุงในวันที่เลือก');
    return { room_id: roomId, date: rows[0].closure_date };
  } catch (err) {
    if (err.code === UNDEFINED_TABLE) throw noClosureTable();
    throw err;
  }
}

module.exports = {
  CLOSED_MESSAGE,
  validateRoomInput,
  validateClosureInput,
  findClosure,
  assertRoomOpen,
  listRoomsForDate,
  listRoomsForAdmin,
  createRoom,
  updateRoom,
  addClosure,
  removeClosure,
};
