// ทดสอบ query ของ users / email_logs ด้วยฐานข้อมูลปลอม (เช็คว่าส่งค่าไปถูกตำแหน่ง)
const test = require('node:test');
const assert = require('node:assert');
const { upsertUser } = require('../src/repositories/userRepo');
const { insertEmailLog } = require('../src/repositories/emailLogRepo');

function fakeDb(rows = [{}]) {
  const calls = [];
  return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows }; } };
}

test('upsertUser: INSERT ... ON CONFLICT พร้อมค่าครบ 8 ช่อง', async () => {
  const db = fakeDb([{ student_id: '6609651234' }]);
  const row = await upsertUser(db, {
    student_id: '6609651234', name_th: 'สมชาย', name_en: 'Somchai', email: 's@dome.tu.ac.th',
    type: 'student', department: 'วิทยาการคอมพิวเตอร์', faculty: 'วิทย์', role: 'student',
  });
  assert.equal(row.student_id, '6609651234');
  assert.match(db.calls[0].sql, /INSERT INTO users/);
  assert.match(db.calls[0].sql, /ON CONFLICT \(student_id\) DO UPDATE/);
  assert.deepEqual(db.calls[0].params, ['6609651234', 'สมชาย', 'Somchai', 's@dome.tu.ac.th', 'student', 'วิทยาการคอมพิวเตอร์', 'วิทย์', 'student']);
});

test('insertEmailLog: ค่าที่ไม่มีใส่เป็น null', async () => {
  const db = fakeDb();
  await insertEmailLog(db, { booking_id: 15, to_email: 'a@b.c', email_type: 'BOOKING_CONFIRMED', status: 'SENT' });
  assert.match(db.calls[0].sql, /INSERT INTO email_logs/);
  assert.deepEqual(db.calls[0].params, [15, 'a@b.c', 'BOOKING_CONFIRMED', 'SENT', null]);
});
