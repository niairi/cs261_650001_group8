const test = require('node:test');
const assert = require('node:assert');
const { buildBookingQuery, listBookings } = require('../src/services/adminService');
const { requireAdmin } = require('../src/middleware/auth');

test('ไม่ใส่เงื่อนไข = ดึงทั้งหมด จำกัด 200 แถว', () => {
  const { sql, params } = buildBookingQuery({});
  assert.ok(!/WHERE/.test(sql));
  assert.deepEqual(params, [200]);
});

test('ค้นหาด้วย student_id (docs ข้อ 7)', () => {
  const { sql, params } = buildBookingQuery({ student_id: '650001' });
  assert.match(sql, /WHERE b\.student_id = \$1/);
  assert.deepEqual(params, ['650001', 200]);
});

test('ใส่หลายเงื่อนไขพร้อมกัน ลำดับ $1 $2 $3 ถูกต้อง', () => {
  const { sql, params } = buildBookingQuery({ student_id: '650001', status: 'booked', date: '2026-10-20', limit: '50' });
  assert.match(sql, /b\.student_id = \$1 AND b\.status = \$2 AND b\.booking_date = \$3/);
  assert.match(sql, /LIMIT \$4/);
  assert.deepEqual(params, ['650001', 'BOOKED', '2026-10-20', 50]);
});

test('status / date / limit ผิด = 400', () => {
  assert.throws(() => buildBookingQuery({ status: 'DELETED' }), { status: 400 });
  assert.throws(() => buildBookingQuery({ date: '20/10/2026' }), { status: 400 });
  assert.throws(() => buildBookingQuery({ limit: '5000' }), { status: 400 });
});

test('listBookings แปลง id เป็นตัวเลข และนับจำนวน', async () => {
  const db = { query: async () => ({ rows: [{ booking_id: '7', room_id: '101', status: 'BOOKED' }] }) };
  assert.deepEqual(await listBookings(db, {}), { count: 1, bookings: [{ booking_id: 7, room_id: 101, status: 'BOOKED' }] });
});

test('requireAdmin: student = 403 / admin = ผ่าน', () => {
  assert.throws(() => requireAdmin({ user: { role: 'student' } }, {}, () => {}), { status: 403 });
  let passed = false;
  requireAdmin({ user: { role: 'admin' } }, {}, () => { passed = true; });
  assert.ok(passed);
});
