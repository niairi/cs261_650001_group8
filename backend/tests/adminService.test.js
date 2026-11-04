const test = require('node:test');
const assert = require('node:assert');
const { buildBookingQuery, listBookings, buildSummaryQuery, bookingSummary } = require('../src/services/adminService');
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

// ---------- US7 (Task65): กรองเพิ่ม + รายงานสรุป ----------
test('US7 TC2: ค้นหารหัส 6809650069 → WHERE student_id', () => {
  const { sql, params } = buildBookingQuery({ student_id: '6809650069' });
  assert.match(sql, /b\.student_id = \$1/);
  assert.equal(params[0], '6809650069');
});

test('US7 TC3: กรองห้อง Room A (101) + วันที่ 22 ต.ค.', () => {
  const { sql, params } = buildBookingQuery({ room_id: '101', date: '2026-10-22' });
  assert.match(sql, /b\.booking_date = \$1 AND b\.room_id = \$2/);
  assert.deepEqual(params, ['2026-10-22', 101, 200]);
});

test('US7 TC1: เรียงตามวัน/เวลา ค่าเริ่มต้นใหม่→เก่า และเลือก asc ได้ พร้อมคืน people/purpose', () => {
  assert.match(buildBookingQuery({}).sql, /ORDER BY b\.booking_date DESC, b\.start_time DESC/);
  assert.match(buildBookingQuery({ order: 'ASC' }).sql, /ORDER BY b\.booking_date ASC, b\.start_time ASC/);
  assert.match(buildBookingQuery({}).sql, /b\.people, b\.purpose, b\.status/);
});

test('ช่วงวันที่ date_from / date_to', () => {
  const { sql, params } = buildBookingQuery({ date_from: '2026-10-20', date_to: '2026-10-27' });
  assert.match(sql, /b\.booking_date >= \$1 AND b\.booking_date <= \$2/);
  assert.deepEqual(params, ['2026-10-20', '2026-10-27', 200]);
});

test('room_id / ช่วงวันที่ / order ผิด = 400 พร้อมรายละเอียด', () => {
  assert.throws(() => buildBookingQuery({ room_id: 'A' }), { status: 400, details: ['room_id ต้องเป็นตัวเลข'] });
  assert.throws(() => buildBookingQuery({ date_from: '2026-13-01' }), { status: 400 });
  assert.throws(() => buildBookingQuery({ date_from: '2026-10-27', date_to: '2026-10-20' }), { details: ['date_from ต้องไม่หลัง date_to'] });
  assert.throws(() => buildBookingQuery({ order: 'up' }), { details: ['order ต้องเป็น asc หรือ desc'] });
});

test('รายงานสรุป: ค่าเริ่มต้น 7 วันล่าสุด', () => {
  const { params } = buildSummaryQuery({}, new Date(2026, 9, 22, 12, 0));
  assert.deepEqual(params, ['2026-10-16', '2026-10-22']);
});

test('รายงานสรุป: นับแยกสถานะ และ No-show = EXPIRED ที่ไม่ได้ Check-in', () => {
  const { sql, params } = buildSummaryQuery({ date_from: '2026-10-22', date_to: '2026-10-22', room_id: '101' });
  assert.match(sql, /FILTER \(WHERE b\.status = 'CANCELLED'\)/);
  assert.match(sql, /FILTER \(WHERE b\.status = 'EXPIRED' AND b\.confirmed_at IS NULL\)::int AS no_show/);
  assert.match(sql, /GROUP BY b\.booking_date, b\.room_id, r\.room_name/);
  assert.deepEqual(params, ['2026-10-22', '2026-10-22', 101]);
});

test('รายงานสรุป: เงื่อนไขผิด = 400', () => {
  assert.throws(() => buildSummaryQuery({ date_from: '22/10/2026' }), { status: 400 });
  assert.throws(() => buildSummaryQuery({ date_from: '2026-10-23', date_to: '2026-10-22' }), { details: ['date_from ต้องไม่หลัง date_to'] });
  assert.throws(() => buildSummaryQuery({ date_from: '2026-01-01', date_to: '2026-12-31' }), { details: ['ช่วงวันที่ต้องไม่เกิน 93 วัน'] });
  assert.throws(() => buildSummaryQuery({ date_from: '2026-10-22', date_to: '2026-10-22', room_id: '0' }), { details: ['room_id ต้องเป็นตัวเลข'] });
});

test('US7 TC6: รายงานสรุปรวมยอด จอง 3 / ยกเลิก 1 / No-show 1', async () => {
  const db = { query: async () => ({ rows: [
    { booking_date: '2026-10-22', room_id: '101', room_name: 'Room A', total: 3, booked: 0, confirmed: 1, cancelled: 1, no_show: 1 },
  ] }) };
  const out = await bookingSummary(db, { date_from: '2026-10-22', date_to: '2026-10-22', room_id: '101' });
  assert.deepEqual(out, {
    date_from: '2026-10-22', date_to: '2026-10-22',
    rows: [{ booking_date: '2026-10-22', room_id: 101, room_name: 'Room A', total: 3, booked: 0, confirmed: 1, cancelled: 1, no_show: 1 }],
    totals: { total: 3, booked: 0, confirmed: 1, cancelled: 1, no_show: 1 },
  });
});

test('US7 TC4: นักศึกษาเรียกรายงาน = 403', () => {
  assert.throws(() => requireAdmin({ user: { role: 'student' } }, {}, () => {}), { status: 403, message: 'เฉพาะเจ้าหน้าที่เท่านั้น' });
});
