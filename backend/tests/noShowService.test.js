// US9: ระบบนับ No-show อัตโนมัติ (Task67) — ทดสอบด้วยฐานข้อมูลปลอม (เช็ค SQL และค่าที่ส่ง)
const test = require('node:test');
const assert = require('node:assert');
const {
  localTimestamp, semesterRange, expireNoShows, countNoShows, runNoShowCheck, startNoShowScheduler,
} = require('../src/services/noShowService');
const { getUserStatus } = require('../src/services/noShowStatus');

// ฐานข้อมูลปลอม: ตอบตามลำดับที่กำหนด และจำ SQL ที่ถูกเรียก
function fakeDb(...answers) {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      const a = answers.length ? answers.shift() : { rows: [] };
      if (a instanceof Error) throw a;
      return a;
    },
  };
}
const quiet = { log() {}, error() {} };
const expiredRow = {
  booking_id: '15', student_id: '6809650069', room_id: '101',
  booking_date: '2026-10-22', start_time: '10:00', end_time: '12:00',
};

test.afterEach(() => {
  for (const k of ['SEMESTER_START', 'SEMESTER_END', 'NO_SHOW_GRACE_MIN', 'NO_SHOW_LIMIT']) delete process.env[k];
});

test('localTimestamp: เวลาเครื่องรูปแบบ YYYY-MM-DD HH:MM:SS', () => {
  assert.equal(localTimestamp(new Date(2026, 9, 22, 10, 15, 0)), '2026-10-22 10:15:00');
});

test('US9 TC1: เปลี่ยนเฉพาะ BOOKED ที่เลยเวลาเริ่ม 15 นาที เป็น EXPIRED', async () => {
  const db = fakeDb({ rows: [expiredRow] });
  const rows = await expireNoShows(db, new Date(2026, 9, 22, 10, 15, 0));
  const { sql, params } = db.calls[0];
  assert.match(sql, /SET status = 'EXPIRED'/);
  assert.match(sql, /WHERE status = 'BOOKED'/); // US9 TC2, TC3: CONFIRMED / CANCELLED ไม่ถูกแตะ
  assert.match(sql, /\(booking_date \+ start_time\) \+ make_interval\(mins => \$2\) <= \$1::timestamp/);
  assert.deepEqual(params, ['2026-10-22 10:15:00', 15]);
  assert.equal(rows[0].booking_id, 15);
  assert.equal(rows[0].room_id, 101);
});

test('NO_SHOW_GRACE_MIN ปรับจำนวนนาทีได้', async () => {
  process.env.NO_SHOW_GRACE_MIN = '20';
  const db = fakeDb({ rows: [] });
  await expireNoShows(db, new Date(2026, 9, 22, 10, 15, 0));
  assert.equal(db.calls[0].params[1], 20);
});

test('countNoShows: นับ EXPIRED ที่ไม่ได้ Check-in เฉพาะในภาคการศึกษา', async () => {
  const db = fakeDb({ rows: [{ count: 2 }] });
  const n = await countNoShows(db, '6809650069', { start: '2026-08-10', end: '2026-12-11' });
  assert.equal(n, 2);
  assert.match(db.calls[0].sql, /status = 'EXPIRED' AND confirmed_at IS NULL/);
  assert.match(db.calls[0].sql, /booking_date >= \$2 AND booking_date <= \$3/);
  assert.deepEqual(db.calls[0].params, ['6809650069', '2026-08-10', '2026-12-11']);
});

test('countNoShows: ไม่ได้ตั้งภาคการศึกษา = นับทั้งหมด', async () => {
  const db = fakeDb({ rows: [{ count: 1 }] });
  await countNoShows(db, '6809650069', { start: null, end: null });
  assert.doesNotMatch(db.calls[0].sql, /booking_date >=/);
  assert.deepEqual(db.calls[0].params, ['6809650069']);
});

test('semesterRange: อ่านจาก .env และข้ามค่าที่รูปแบบผิด', () => {
  assert.deepEqual(semesterRange({ SEMESTER_START: '2026-08-10', SEMESTER_END: '2026-12-11' }), { start: '2026-08-10', end: '2026-12-11' });
  assert.deepEqual(semesterRange({ SEMESTER_START: '10/08/2026' }), { start: null, end: null });
});

test('runNoShowCheck: นับแล้วส่งให้ onNoShow (สำหรับ Blacklist ใน Task68)', async () => {
  const db = fakeDb({ rows: [expiredRow] }, { rows: [{ count: 3 }] });
  const events = [];
  const out = await runNoShowCheck(db, { onNoShow: async (e) => events.push(e), log: quiet });
  assert.equal(out.length, 1);
  assert.deepEqual(events[0], { ...expiredRow, booking_id: 15, room_id: 101, no_show_count: 3, no_show_limit: 3 });
});

test('runNoShowCheck: onNoShow error ไม่ทำให้รอบนี้ล้ม', async () => {
  const db = fakeDb({ rows: [expiredRow] }, { rows: [{ count: 1 }] });
  const out = await runNoShowCheck(db, { onNoShow: async () => { throw new Error('blacklist down'); }, log: quiet });
  assert.equal(out.length, 1);
});

test('runNoShowCheck: ไม่มีการจองที่เลยเวลา = ไม่นับ ไม่เรียก onNoShow', async () => {
  const db = fakeDb({ rows: [] });
  let called = false;
  const out = await runNoShowCheck(db, { onNoShow: async () => { called = true; }, log: quiet });
  assert.equal(out.length, 0);
  assert.equal(called, false);
  assert.equal(db.calls.length, 1);
});

test('startNoShowScheduler: interval 0 = ปิด ไม่ query ฐานข้อมูล', () => {
  const db = fakeDb();
  const stop = startNoShowScheduler(db, { intervalMs: 0, log: quiet });
  stop();
  assert.equal(db.calls.length, 0);
});

test('startNoShowScheduler: ตรวจทันทีตอนเริ่ม และหยุดได้', async () => {
  const db = fakeDb({ rows: [] });
  const stop = startNoShowScheduler(db, { intervalMs: 60000, log: quiet });
  await new Promise((r) => setImmediate(r));
  stop();
  assert.equal(db.calls.length, 1);
});

test('US9 TC4: สถานะของตัวเอง มีจำนวน No-show / 3 และไม่ถูกระงับ', async () => {
  process.env.SEMESTER_START = '2026-08-10';
  process.env.SEMESTER_END = '2026-12-11';
  const db = {
    query: async (sql) => (/FROM blacklist/.test(sql) ? { rows: [] } : { rows: [{ count: 1 }] }),
  };
  assert.deepEqual(await getUserStatus(db, '6809650069'), {
    student_id: '6809650069',
    semester: { start: '2026-08-10', end: '2026-12-11' },
    no_show_count: 1, no_show_limit: 3, banned: false, banned_until: null,
  });
});

test('US10: ถูกระงับสิทธิ์ = banned true พร้อมวันสิ้นสุด', async () => {
  const db = {
    query: async (sql) => (/FROM blacklist/.test(sql) ? { rows: [{ end_date: '2026-11-21' }] } : { rows: [{ count: 3 }] }),
  };
  const s = await getUserStatus(db, '6809650069');
  assert.equal(s.banned, true);
  assert.equal(s.banned_until, '2026-11-21');
});

test('ยังไม่มีตาราง blacklist (ก่อน migration Task69) = ไม่ถูกระงับ ไม่ error', async () => {
  const noTable = Object.assign(new Error('relation "blacklist" does not exist'), { code: '42P01' });
  const db = { query: async (sql) => { if (/FROM blacklist/.test(sql)) throw noTable; return { rows: [{ count: 0 }] }; } };
  const s = await getUserStatus(db, '6809650069');
  assert.equal(s.banned, false);
});
