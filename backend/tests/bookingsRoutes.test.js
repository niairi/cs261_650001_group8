// Task72: Unit Test ของ routes/bookings.js (จอง US3, ยกเลิก US4, แก้ไข US6) ซึ่ง Sprint 1 ยังไม่มี
// ยิง HTTP จริงเข้า app ที่เปิดบนพอร์ตสุ่ม แต่ใช้ฐานข้อมูลปลอมในหน่วยความจำ (ไม่ต้องมี PostgreSQL)
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
delete process.env.SMTP_HOST; // ไม่ส่งอีเมลจริง

// ---------- ฐานข้อมูลปลอม: เข้าใจเฉพาะ SQL ที่ routes/bookings.js ใช้ ----------
const db = {
  rooms: new Map([[101, { room_id: 101, room_name: 'Room A', capacity: 8, is_active: true }]]),
  bookings: [],
  emailLogs: [],
  nextId: 1,
};
let snapshot = null;
const copy = (rows) => rows.map((r) => ({ ...r }));
const overlaps = (b, start, end) => b.start_time < end && b.end_time > start;
const ACTIVE = ['BOOKED', 'CONFIRMED'];

async function query(sql, p = []) {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (s === 'BEGIN') { snapshot = copy(db.bookings); return { rows: [] }; }
  if (s === 'COMMIT') { snapshot = null; return { rows: [] }; }
  if (s === 'ROLLBACK') { if (snapshot) db.bookings = snapshot; snapshot = null; return { rows: [] }; }
  if (/INSERT INTO email_logs/.test(s)) { db.emailLogs.push({ booking_id: p[0], email_type: p[2], status: p[3] }); return { rows: [] }; }
  if (/FROM room_closure/.test(s)) return { rows: [] }; // US12: ไม่มีห้องปิดปรับปรุง (ทดสอบใน roomsAdmin.test.js)
  if (/FROM room WHERE room_id = \$1 AND is_active/.test(s)) {
    const r = db.rooms.get(Number(p[0]));
    return { rows: r && r.is_active ? [r] : [] };
  }
  if (/^SELECT 1 FROM booking/.test(s)) { // ตรวจจองชน (POST / PATCH)
    const [roomId, date, start, end, exceptId] = p;
    const hit = db.bookings.some((b) => b.room_id === Number(roomId) && b.booking_date === date
      && ACTIVE.includes(b.status) && overlaps(b, start, end) && b.booking_id !== Number(exceptId));
    return { rows: hit ? [{ '?column?': 1 }] : [] };
  }
  if (/^INSERT INTO booking/.test(s)) {
    const [student_id, room_id, booking_date, start_time, end_time, people, purpose] = p;
    const row = { booking_id: db.nextId++, student_id, room_id: Number(room_id), booking_date, start_time, end_time, people, purpose, status: 'BOOKED', created_at: new Date().toISOString() };
    db.bookings.push(row);
    return { rows: [{ ...row }] };
  }
  if (/WHERE booking_date = \$1 AND status IN/.test(s)) { // GET /booking?date=
    return { rows: db.bookings.filter((b) => b.booking_date === p[0] && ACTIVE.includes(b.status)).map((b) => ({ room_id: b.room_id, start_time: b.start_time, end_time: b.end_time, status: b.status })) };
  }
  if (/WHERE b\.student_id = \$1/.test(s)) { // GET /booking/me
    return { rows: db.bookings.filter((b) => b.student_id === p[0]).map((b) => ({ ...b, room_name: db.rooms.get(b.room_id).room_name })) };
  }
  if (/WHERE (b\.)?booking_id = \$1 FOR UPDATE/.test(s)) { // ล็อกการจองก่อนยกเลิก / แก้ไข
    const b = db.bookings.find((x) => x.booking_id === Number(p[0]));
    return { rows: b ? [{ ...b, room_name: db.rooms.get(b.room_id).room_name }] : [] };
  }
  if (/SET status = 'CANCELLED'/.test(s)) {
    const b = db.bookings.find((x) => x.booking_id === Number(p[0]));
    b.status = 'CANCELLED';
    return { rows: [{ ...b, room_name: db.rooms.get(b.room_id).room_name }] };
  }
  if (/^UPDATE booking SET room_id = \$2/.test(s)) {
    const b = db.bookings.find((x) => x.booking_id === Number(p[0]));
    Object.assign(b, { room_id: Number(p[1]), booking_date: p[2], start_time: p[3], end_time: p[4], people: p[5], purpose: p[6] });
    return { rows: [{ ...b }] };
  }
  throw new Error(`ฐานข้อมูลปลอมไม่รู้จัก SQL นี้: ${s.slice(0, 80)}`);
}
const fakePool = { query, connect: async () => ({ query, release() {} }) };

// ใช้ฐานข้อมูลปลอมแทน src/db.js ก่อนโหลด app
const dbPath = path.join(__dirname, '../src/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakePool };
const app = require('../src/app');

// ---------- ตัวช่วย ----------
const tokenOf = (student_id) => jwt.sign({ student_id, email: `${student_id}@dome.tu.ac.th`, name: 'ทดสอบ', role: 'student' }, 'test-secret');
const A = tokenOf('6809650069');
const B = tokenOf('6809650070');
const ymd = (d) => d.toLocaleDateString('sv-SE');
const hm = (d) => d.toTimeString().slice(0, 5);
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const TOMORROW = plusDays(1);

let server;
let base;
const realLog = console.log;
test.before(async () => {
  console.log = () => {}; // ไม่แสดงเนื้อหาอีเมลจำลอง
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { console.log = realLog; server.close(); });
test.beforeEach(() => { db.bookings = []; db.emailLogs = []; db.nextId = 1; });

async function call(method, url, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const book = (token, start, end, extra = {}) => call('POST', '/booking', {
  token, body: { room_id: 101, people: 3, booking_date: TOMORROW, start_time: start, end_time: end, purpose: 'Group Study', ...extra },
});
// ใส่การจองลงฐานข้อมูลปลอมตรงๆ (ใช้ทดสอบกรณีใกล้เวลาเริ่ม)
function seed(row) {
  const b = { booking_id: db.nextId++, student_id: '6809650069', room_id: 101, people: 2, purpose: null, status: 'BOOKED', ...row };
  db.bookings.push(b);
  return b;
}

// ---------- จองห้อง (US3) ----------
test('US3 TC1: จองสำเร็จ = 201 สถานะ BOOKED และส่งอีเมลยืนยัน', async () => {
  const r = await book(A, '10:00', '12:00');
  assert.equal(r.status, 201);
  assert.equal(r.body.status, 'BOOKED');
  assert.equal(r.body.room_name, 'Room A');
  assert.equal(r.body.student_id, '6809650069'); // ใช้รหัสจาก token ไม่ใช่จาก body
  assert.equal(db.bookings.length, 1);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(db.emailLogs[0].email_type, 'BOOKING_CONFIRMED');
});

// Bug (Task77): เดิมตอบ "ช่วงเวลานี้มีผู้จองห้องนี้แล้ว" ไม่ตรง TC · PO เลือกใช้ข้อความเดียวกับ US6
test('US3 TC2: จองซ้อนเวลาคนอื่น = 409 "ช่วงเวลานี้ถูกจองแล้ว" และไม่บันทึก', async () => {
  await book(A, '10:00', '12:00');
  const r = await book(B, '11:00', '13:00');
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'ช่วงเวลานี้ถูกจองแล้ว');
  assert.equal(db.bookings.length, 1);
});

test('US3: จองต่อกันพอดี (12:00–13:00 หลัง 10:00–12:00) ได้', async () => {
  await book(A, '10:00', '12:00');
  assert.equal((await book(B, '12:00', '13:00')).status, 201);
});

test('US3 TC3: เกิน 3 ชม. = 400 "จองได้ครั้งละไม่เกิน 3 ชั่วโมง"', async () => {
  const r = await book(A, '09:00', '13:00');
  assert.equal(r.status, 400);
  assert.ok(r.body.details.includes('จองได้ครั้งละไม่เกิน 3 ชั่วโมง'));
  assert.equal(db.bookings.length, 0);
});

test('US3 TC4: จองล่วงหน้าเกิน 7 วัน = 400', async () => {
  const r = await book(A, '10:00', '11:00', { booking_date: plusDays(8) });
  assert.equal(r.status, 400);
  assert.ok(r.body.details.some((d) => d.includes('จองล่วงหน้าได้ไม่เกิน')));
});

test('US3 TC5: นอกเวลา 16:00–18:00 = 400 "จองได้เฉพาะช่วง 09:00 - 16:00 น."', async () => {
  const r = await book(A, '16:00', '18:00');
  assert.equal(r.status, 400);
  assert.ok(r.body.details.includes('จองได้เฉพาะช่วง 09:00 - 16:00 น.'));
});

test('US3 TC6: จองวันที่ผ่านมาแล้ว = 400', async () => {
  const r = await book(A, '10:00', '11:00', { booking_date: plusDays(-1) });
  assert.equal(r.status, 400);
  assert.ok(r.body.details.includes('ไม่สามารถจองเวลาที่ผ่านมาแล้ว'));
});

test('US3: จำนวนคนเกินความจุห้อง = 400 / ห้องไม่มี = 404', async () => {
  assert.equal((await book(A, '10:00', '11:00', { people: 9 })).status, 400);
  assert.equal((await book(A, '10:00', '11:00', { room_id: 999 })).status, 404);
});

test('US3: ไม่ login = 401 / token ปลอม = 401', async () => {
  assert.equal((await book(null, '10:00', '11:00')).status, 401);
  assert.equal((await book('not.a.token', '10:00', '11:00')).status, 401);
});

// ---------- ตาราง และการจองของฉัน (US2, US4) ----------
test('US2: GET /booking?date= แสดงเฉพาะ BOOKED/CONFIRMED (ที่ยกเลิกแล้วไม่แสดง)', async () => {
  await book(A, '10:00', '11:00');
  seed({ booking_date: TOMORROW, start_time: '13:00', end_time: '14:00', status: 'CANCELLED' });
  const r = await call('GET', `/booking?date=${TOMORROW}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.map((x) => x.start_time), ['10:00']);
  assert.equal((await call('GET', '/booking')).status, 400);
});

test('US4 TC1: GET /booking/me แสดงเฉพาะการจองของตัวเอง', async () => {
  await book(A, '10:00', '11:00');
  await book(B, '13:00', '14:00');
  const r = await call('GET', '/booking/me', { token: A });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.map((x) => x.student_id), ['6809650069']);
});

// ---------- ยกเลิก (US4) ----------
test('US4 TC2: ยกเลิกสำเร็จ = CANCELLED และช่วงเวลากลับมาว่าง', async () => {
  const { body } = await book(A, '10:00', '12:00');
  const r = await call('PATCH', `/booking/${body.booking_id}/cancel`, { token: A });
  assert.equal(r.status, 200);
  assert.equal(r.body.booking.status, 'CANCELLED');
  assert.equal((await book(B, '10:00', '12:00')).status, 201); // คนอื่นจองช่วงเดิมได้แล้ว
});

test('US4 TC4: เหลือไม่ถึง 30 นาทีก่อนเริ่ม = 400 และสถานะไม่เปลี่ยน', async () => {
  const start = new Date(Date.now() + 10 * 60000);
  const b = seed({ booking_date: ymd(start), start_time: hm(start), end_time: '23:59' });
  const r = await call('PATCH', `/booking/${b.booking_id}/cancel`, { token: A });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'ยกเลิกได้ก่อนเวลาเริ่มอย่างน้อย 30 นาที');
  assert.equal(db.bookings[0].status, 'BOOKED');
});

test('US4 TC5: ยกเลิกการจองของคนอื่น = 403', async () => {
  const { body } = await book(A, '10:00', '11:00');
  const r = await call('PATCH', `/booking/${body.booking_id}/cancel`, { token: B });
  assert.equal(r.status, 403);
  assert.equal(db.bookings[0].status, 'BOOKED');
});

test('US4: ยกเลิกซ้ำ = 409 / ไม่พบ = 404 / id ไม่ใช่ตัวเลข = 400', async () => {
  const { body } = await book(A, '10:00', '11:00');
  await call('PATCH', `/booking/${body.booking_id}/cancel`, { token: A });
  assert.equal((await call('PATCH', `/booking/${body.booking_id}/cancel`, { token: A })).status, 409);
  assert.equal((await call('PATCH', '/booking/999/cancel', { token: A })).status, 404);
  assert.equal((await call('PATCH', '/booking/abc/cancel', { token: A })).status, 400);
});

// ---------- แก้ไข (US6) ----------
test('US6 TC1: แก้เป็น 13:00–15:00 สำเร็จ และ 10:00–12:00 กลับมาว่าง', async () => {
  const { body } = await book(A, '10:00', '12:00');
  const r = await call('PATCH', `/booking/${body.booking_id}`, { token: A, body: { start_time: '13:00', end_time: '15:00' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.booking.start_time, '13:00');
  assert.equal(r.body.previous.start_time, '10:00');
  assert.equal((await book(B, '10:00', '12:00')).status, 201);
});

test('US6 TC2: ช่วงใหม่ไม่ว่าง = 409 "ช่วงเวลานี้ถูกจองแล้ว" และการจองเดิมยังอยู่', async () => {
  const { body } = await book(A, '10:00', '12:00');
  await book(B, '13:00', '14:00');
  const r = await call('PATCH', `/booking/${body.booking_id}`, { token: A, body: { start_time: '13:00', end_time: '15:00' } });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'ช่วงเวลานี้ถูกจองแล้ว');
  const mine = db.bookings.find((x) => x.booking_id === body.booking_id);
  assert.deepEqual([mine.start_time, mine.end_time], ['10:00', '12:00']);
});

test('US6 TC3: แก้เป็น 11:00–15:00 (4 ชม.) = 400 และการจองเดิมไม่เปลี่ยน', async () => {
  const { body } = await book(A, '10:00', '12:00');
  const r = await call('PATCH', `/booking/${body.booking_id}`, { token: A, body: { start_time: '11:00', end_time: '15:00' } });
  assert.equal(r.status, 400);
  assert.ok(r.body.details.includes('จองได้ครั้งละไม่เกิน 3 ชั่วโมง'));
  assert.equal(db.bookings[0].start_time, '10:00');
});

test('US6 TC4: เหลือไม่ถึง 30 นาทีก่อนเริ่ม = 400 "แก้ไขได้ก่อนเวลาเริ่มอย่างน้อย 30 นาที"', async () => {
  const start = new Date(Date.now() + 10 * 60000);
  const b = seed({ booking_date: ymd(start), start_time: hm(start), end_time: '23:59' });
  const r = await call('PATCH', `/booking/${b.booking_id}`, { token: A, body: { people: 4 } });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'แก้ไขได้ก่อนเวลาเริ่มอย่างน้อย 30 นาที');
});

test('US6: แก้การจองของคนอื่น = 403 / ไม่มีอะไรเปลี่ยน = 400', async () => {
  const { body } = await book(A, '10:00', '12:00');
  assert.equal((await call('PATCH', `/booking/${body.booking_id}`, { token: B, body: { people: 4 } })).status, 403);
  assert.equal((await call('PATCH', `/booking/${body.booking_id}`, { token: A, body: { start_time: '10:00' } })).status, 400);
});
