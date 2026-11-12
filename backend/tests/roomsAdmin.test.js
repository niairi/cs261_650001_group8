// Task85 (US12): เจ้าหน้าที่จัดการข้อมูลห้อง — เพิ่ม / แก้ไข / ปิดปรับปรุงห้องรายวัน
// ยิง HTTP จริงเข้า app บนพอร์ตสุ่ม ใช้ฐานข้อมูลปลอมในหน่วยความจำ (แบบเดียวกับ bookingsRoutes.test.js)
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
delete process.env.SMTP_HOST;

// ---------- ฐานข้อมูลปลอม ----------
const db = { rooms: new Map(), closures: [], bookings: [], nextRoomId: 1, nextClosureId: 1, nextBookingId: 1, noClosureTable: false };
function reset() {
  db.rooms = new Map([
    [101, { room_id: 101, room_name: 'Room A', capacity: 4, location: 'LC4 ชั้น 1', is_active: true }],
    [102, { room_id: 102, room_name: 'Room B', capacity: 6, location: 'LC4 ชั้น 1', is_active: true }],
    [103, { room_id: 103, room_name: 'Room C', capacity: 8, location: 'LC4 ชั้น 1', is_active: false }],
  ]);
  db.closures = [];
  db.bookings = [];
  db.nextRoomId = 1;
  db.nextClosureId = 1;
  db.nextBookingId = 1;
  db.noClosureTable = false;
}
const missingTable = () => Object.assign(new Error('relation "room_closure" does not exist'), { code: '42P01' });
const unique = () => Object.assign(new Error('duplicate key'), { code: '23505' });
const ACTIVE = ['BOOKED', 'CONFIRMED'];

async function query(sql, p = []) {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(s)) return { rows: [] };
  if (/INSERT INTO email_logs/.test(s)) return { rows: [] };
  if (/FROM blacklist/.test(s)) return { rows: [] }; // US10 (PR #30): ไม่มีใครถูกระงับสิทธิ์

  if (/room_closure/.test(s) && db.noClosureTable) throw missingTable();
  if (/^SELECT closure_id, room_id, .* FROM room_closure WHERE room_id = \$1 AND closure_date = \$2/.test(s)) {
    return { rows: db.closures.filter((c) => c.room_id === Number(p[0]) && c.closure_date === p[1]).map((c) => ({ ...c })) };
  }
  if (/^SELECT room_id, reason FROM room_closure WHERE closure_date = \$1/.test(s)) {
    return { rows: db.closures.filter((c) => c.closure_date === p[0]).map((c) => ({ room_id: c.room_id, reason: c.reason })) };
  }
  if (/FROM room_closure WHERE closure_date >= \$1/.test(s)) {
    return { rows: db.closures.filter((c) => c.closure_date >= p[0]).sort((a, b) => a.closure_date.localeCompare(b.closure_date)).map((c) => ({ ...c })) };
  }
  if (/^INSERT INTO room_closure/.test(s)) {
    const [room_id, closure_date, reason, created_by] = p;
    if (db.closures.some((c) => c.room_id === Number(room_id) && c.closure_date === closure_date)) throw unique();
    const row = { closure_id: db.nextClosureId++, room_id: Number(room_id), closure_date, reason, created_by };
    db.closures.push(row);
    return { rows: [{ ...row }] };
  }
  if (/^DELETE FROM room_closure/.test(s)) {
    const i = db.closures.findIndex((c) => c.room_id === Number(p[0]) && c.closure_date === p[1]);
    if (i < 0) return { rows: [] };
    const [row] = db.closures.splice(i, 1);
    return { rows: [{ room_id: row.room_id, closure_date: row.closure_date }] };
  }

  if (/^SELECT room_id, room_name, capacity, location FROM room WHERE is_active ORDER BY room_id/.test(s)) {
    return { rows: [...db.rooms.values()].filter((r) => r.is_active).map((r) => ({ ...r })) };
  }
  if (/^SELECT room_id, room_name, capacity, location, is_active FROM room ORDER BY room_id/.test(s)) {
    return { rows: [...db.rooms.values()].map((r) => ({ ...r })) };
  }
  if (/^SELECT room_id, room_name FROM room WHERE room_id = \$1/.test(s)) {
    const r = db.rooms.get(Number(p[0]));
    return { rows: r ? [{ room_id: r.room_id, room_name: r.room_name }] : [] };
  }
  if (/FROM room WHERE room_id = \$1 AND is_active/.test(s)) {
    const r = db.rooms.get(Number(p[0]));
    return { rows: r && r.is_active ? [{ ...r }] : [] };
  }
  if (/^INSERT INTO room \(/.test(s)) {
    const cols = s.match(/INSERT INTO room \(([^)]+)\)/)[1].split(',').map((c) => c.trim());
    const row = { location: null, is_active: true };
    cols.forEach((c, i) => { row[c] = p[i]; });
    if (row.room_id === undefined) row.room_id = db.nextRoomId++;
    if (db.rooms.has(Number(row.room_id))) throw unique();
    db.rooms.set(Number(row.room_id), row);
    return { rows: [{ ...row }] };
  }
  if (/^UPDATE room SET/.test(s)) {
    const r = db.rooms.get(Number(p[0]));
    if (!r) return { rows: [] };
    const keys = [...s.matchAll(/(\w+) = \$(\d+)/g)].filter(([, , n]) => n !== '1');
    for (const [, key, n] of keys) r[key] = p[Number(n) - 1];
    return { rows: [{ ...r }] };
  }

  if (/^SELECT booking_id, student_id, .* FROM booking WHERE room_id = \$1 AND booking_date = \$2 AND status IN/.test(s)) {
    return { rows: db.bookings.filter((b) => b.room_id === Number(p[0]) && b.booking_date === p[1] && ACTIVE.includes(b.status)) };
  }
  if (/^SELECT 1 FROM booking/.test(s)) return { rows: [] }; // ตรวจจองชน: ไม่มีชน
  if (/^INSERT INTO booking/.test(s)) {
    const [student_id, room_id, booking_date, start_time, end_time, people, purpose] = p;
    const row = { booking_id: db.nextBookingId++, student_id, room_id: Number(room_id), booking_date, start_time, end_time, people, purpose, status: 'BOOKED', created_at: new Date().toISOString() };
    db.bookings.push(row);
    return { rows: [{ ...row }] };
  }
  if (/WHERE (b\.)?booking_id = \$1 FOR UPDATE/.test(s)) {
    const b = db.bookings.find((x) => x.booking_id === Number(p[0]));
    return { rows: b ? [{ ...b, room_name: db.rooms.get(b.room_id).room_name }] : [] };
  }
  throw new Error(`ฐานข้อมูลปลอมไม่รู้จัก SQL นี้: ${s.slice(0, 100)}`);
}
const fakePool = { query, connect: async () => ({ query, release() {} }) };

const dbPath = path.join(__dirname, '../src/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakePool };
const app = require('../src/app');

// ---------- ตัวช่วย ----------
const tokenOf = (student_id, role = 'student') => jwt.sign({ student_id, email: `${student_id}@dome.tu.ac.th`, name: 'ทดสอบ', role }, 'test-secret');
const ADMIN = tokenOf('6809650099', 'admin');
const STUDENT = tokenOf('6809650010');
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
const TOMORROW = plusDays(1);
const DAY2 = plusDays(2);

let server;
let base;
const realLog = console.log;
test.before(async () => {
  console.log = () => {};
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { console.log = realLog; server.close(); });
test.beforeEach(reset);

async function call(method, url, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const closeRoom = (roomId, date, reason = 'ซ่อมเครื่องปรับอากาศ', token = ADMIN) =>
  call('POST', `/admin/rooms/${roomId}/closures`, { token, body: { date, reason } });
const book = (roomId, date, start = '10:00', end = '12:00') => call('POST', '/booking', {
  token: STUDENT, body: { room_id: roomId, people: 2, booking_date: date, start_time: start, end_time: end },
});

// ---------- ปิดปรับปรุงห้อง ----------
test('US12 TC1: ปิด Room B (102) วันหนึ่ง → GET /rooms?date= วันนั้นบอก closed + เหตุผล ห้องอื่นยังเปิด', async () => {
  const r = await closeRoom(102, TOMORROW);
  assert.equal(r.status, 201);
  assert.deepEqual(
    { room_id: r.body.room_id, room_name: r.body.room_name, date: r.body.date, created_by: r.body.created_by },
    { room_id: 102, room_name: 'Room B', date: TOMORROW, created_by: '6809650099' }
  );

  const rooms = await call('GET', `/rooms?date=${TOMORROW}`);
  assert.equal(rooms.status, 200);
  const roomB = rooms.body.find((x) => x.room_id === 102);
  assert.equal(roomB.closed, true);
  assert.equal(roomB.closure_reason, 'ซ่อมเครื่องปรับอากาศ');
  assert.equal(rooms.body.find((x) => x.room_id === 101).closed, false);
  assert.ok(!rooms.body.some((x) => x.room_id === 103), 'ห้องที่ปิดใช้งานไม่แสดง');

  const nextDay = await call('GET', `/rooms?date=${DAY2}`);
  assert.equal(nextDay.body.find((x) => x.room_id === 102).closed, false, 'ปิดเฉพาะวันที่เลือก');
});

test('US12 TC2: จองห้องที่ปิดปรับปรุงผ่าน API ตรง = 409 และไม่บันทึก', async () => {
  await closeRoom(102, TOMORROW);
  const r = await book(102, TOMORROW);
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'ห้องนี้ปิดปรับปรุงในวันที่เลือก');
  assert.deepEqual(r.body.details, ['เหตุผล: ซ่อมเครื่องปรับอากาศ']);
  assert.equal(db.bookings.length, 0);
});

test('US12: จองห้องเดียวกันวันอื่น / ห้องอื่นวันเดียวกันได้ตามปกติ (US3 TC1 ซ้ำ)', async () => {
  await closeRoom(102, TOMORROW);
  assert.equal((await book(102, DAY2)).status, 201);
  assert.equal((await book(101, TOMORROW)).status, 201);
});

test('US12 TC3: วันนั้นมีการจองค้างอยู่ = ปิดปรับปรุงไม่ได้ 409 พร้อมรายการจอง', async () => {
  assert.equal((await book(102, TOMORROW, '13:00', '15:00')).status, 201);
  const r = await closeRoom(102, TOMORROW);
  assert.equal(r.status, 409);
  assert.match(r.body.error, /มีการจองห้องนี้อยู่ 1 รายการ/);
  assert.deepEqual(r.body.details, ['#1 6809650010 13:00-15:00']);
  assert.equal(db.closures.length, 0);
});

test('US12: ปิดซ้ำวันเดิม = 409 / ย้อนหลัง = 400 / ไม่มีห้อง = 404 / วันที่ผิดรูปแบบ = 400', async () => {
  await closeRoom(102, TOMORROW);
  assert.equal((await closeRoom(102, TOMORROW)).body.error, 'ห้องนี้ปิดปรับปรุงวันนี้อยู่แล้ว');
  const past = await closeRoom(102, plusDays(-1));
  assert.equal(past.status, 400);
  assert.deepEqual(past.body.details, ['ปิดปรับปรุงย้อนหลังไม่ได้']);
  assert.equal((await closeRoom(999, TOMORROW)).status, 404);
  assert.equal((await closeRoom(102, '2026-02-30')).status, 400);
});

test('US12: ยกเลิกการปิดปรับปรุง → ห้องกลับมาจองได้ / ไม่ได้ปิดอยู่ = 404', async () => {
  await closeRoom(102, TOMORROW);
  const r = await call('DELETE', `/admin/rooms/102/closures/${TOMORROW}`, { token: ADMIN });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { room_id: 102, date: TOMORROW });
  assert.equal((await book(102, TOMORROW)).status, 201);
  assert.equal((await call('DELETE', `/admin/rooms/102/closures/${TOMORROW}`, { token: ADMIN })).status, 404);
});

test('US12: GET /admin/rooms แสดงทุกห้อง (รวมที่ปิดใช้งาน) พร้อมวันปิดปรับปรุงที่ยังไม่ถึง', async () => {
  await closeRoom(102, DAY2, null);
  await closeRoom(102, TOMORROW);
  const r = await call('GET', '/admin/rooms', { token: ADMIN });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.rooms.map((x) => [x.room_id, x.is_active]), [[101, true], [102, true], [103, false]]);
  assert.deepEqual(r.body.rooms[1].closures, [
    { date: TOMORROW, reason: 'ซ่อมเครื่องปรับอากาศ' },
    { date: DAY2, reason: null },
  ]);
  assert.deepEqual(r.body.rooms[0].closures, []);
});

// ---------- เพิ่ม / แก้ไขห้อง ----------
test('US12 TC4: เพิ่มห้อง Room D (104) จุ 10 คน → แสดงใน GET /rooms', async () => {
  const r = await call('POST', '/admin/rooms', { token: ADMIN, body: { room_id: 104, room_name: '  Room D ', capacity: 10, location: 'LC4 ชั้น 1' } });
  assert.equal(r.status, 201);
  assert.deepEqual(r.body, { room_id: 104, room_name: 'Room D', capacity: 10, location: 'LC4 ชั้น 1', is_active: true });
  const rooms = await call('GET', `/rooms?date=${TOMORROW}`);
  assert.ok(rooms.body.some((x) => x.room_id === 104 && x.closed === false));
  assert.equal((await call('POST', '/admin/rooms', { token: ADMIN, body: { room_id: 104, room_name: 'ซ้ำ', capacity: 2 } })).body.error, 'มีห้องรหัสนี้อยู่แล้ว');
});

test('US12 TC5: แก้ความจุ Room A 4 → 6 คน แล้วจอง 6 คนได้ / ปิดใช้งานห้องแล้วไม่แสดง', async () => {
  const r = await call('PATCH', '/admin/rooms/101', { token: ADMIN, body: { capacity: 6 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.capacity, 6);
  assert.equal(r.body.room_name, 'Room A');
  const booked = await call('POST', '/booking', { token: STUDENT, body: { room_id: 101, people: 6, booking_date: TOMORROW, start_time: '10:00', end_time: '11:00' } });
  assert.equal(booked.status, 201);

  assert.equal((await call('PATCH', '/admin/rooms/102', { token: ADMIN, body: { is_active: false } })).body.is_active, false);
  const rooms = await call('GET', `/rooms?date=${TOMORROW}`);
  assert.ok(!rooms.body.some((x) => x.room_id === 102));
});

test('US12 TC7: ข้อมูลห้องผิด = 400 พร้อมรายละเอียด / แก้ห้องที่ไม่มี = 404', async () => {
  const r = await call('POST', '/admin/rooms', { token: ADMIN, body: { room_name: ' ', capacity: 0 } });
  assert.equal(r.status, 400);
  assert.deepEqual(r.body.details, ['กรุณากรอกชื่อห้อง', 'ความจุต้องเป็นจำนวนเต็ม 1-100 คน']);
  assert.deepEqual((await call('PATCH', '/admin/rooms/101', { token: ADMIN, body: {} })).body.details, ['ไม่มีข้อมูลห้องที่เปลี่ยนแปลง']);
  assert.equal((await call('PATCH', '/admin/rooms/101', { token: ADMIN, body: { is_active: 'no' } })).status, 400);
  assert.equal((await call('PATCH', '/admin/rooms/999', { token: ADMIN, body: { capacity: 5 } })).status, 404);
});

// ---------- สิทธิ์ ----------
test('US12 TC6: นักศึกษาเรียก API จัดการห้องทุกตัว = 403 / ไม่ login = 401', async () => {
  const calls = [
    ['GET', '/admin/rooms'],
    ['POST', '/admin/rooms', { room_name: 'X', capacity: 2 }],
    ['PATCH', '/admin/rooms/101', { capacity: 2 }],
    ['POST', '/admin/rooms/102/closures', { date: TOMORROW }],
    ['DELETE', `/admin/rooms/102/closures/${TOMORROW}`],
  ];
  for (const [method, url, body] of calls) {
    const r = await call(method, url, { token: STUDENT, body });
    assert.equal(r.status, 403, `${method} ${url}`);
    assert.equal(r.body.error, 'เฉพาะเจ้าหน้าที่เท่านั้น');
    assert.equal((await call(method, url, { body })).status, 401, `${method} ${url} ไม่ login`);
  }
  assert.equal(db.rooms.get(101).capacity, 4);
  assert.equal(db.closures.length, 0);
});

// ---------- ก่อน merge Task84 (ยังไม่มีตาราง room_closure) ----------
test('ยังไม่มีตาราง room_closure: ดูห้องและจองได้ตามปกติ / ปิดปรับปรุง = 503 บอกให้รอ migration', async () => {
  db.noClosureTable = true;
  const rooms = await call('GET', `/rooms?date=${TOMORROW}`);
  assert.equal(rooms.status, 200);
  assert.ok(rooms.body.every((x) => x.closed === false));
  assert.equal((await book(102, TOMORROW)).status, 201);
  assert.equal((await call('GET', '/admin/rooms', { token: ADMIN })).status, 200);
  const r = await closeRoom(102, DAY2);
  assert.equal(r.status, 503);
  assert.match(r.body.error, /Task84/);
});

test('GET /rooms: date ผิดรูปแบบ = 400 / ไม่ส่ง date = ใช้วันนี้', async () => {
  assert.equal((await call('GET', '/rooms?date=11-11-2026')).status, 400);
  const r = await call('GET', '/rooms');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.map((x) => x.room_id), [101, 102]);
});
