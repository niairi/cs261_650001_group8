const test = require('node:test');
const assert = require('node:assert');
const { verifyWithTU, TuApiError } = require('../src/services/tuAuth');

// fetch ปลอม: ตอบตามที่กำหนด และจำว่าถูกเรียกด้วยอะไร
function fakeFetch(status, body) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    return { status, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

test.afterEach(() => { delete process.env.TU_API_KEY; delete process.env.NODE_ENV; delete process.env.MOCK_EMAIL; });

test('โหมดจำลอง: ไม่มี key รับรหัสอะไรก็ได้', async () => {
  const user = await verifyWithTU('6609651234', 'anything');
  assert.equal(user.student_id, '6609651234');
  assert.equal(user.email, '6609651234@dome.tu.ac.th');
});

test('โหมดจำลอง: รหัสผ่านว่าง = ไม่ผ่าน', async () => {
  assert.equal(await verifyWithTU('6609651234', ''), null);
});

test('โหมดจำลอง: ใช้ MOCK_EMAIL ได้', async () => {
  process.env.MOCK_EMAIL = 'me@example.com';
  assert.equal((await verifyWithTU('6609651234', 'x')).email, 'me@example.com');
});

test('โหมดจำลองไม่ทำงานตอน production', async () => {
  process.env.NODE_ENV = 'production';
  await assert.rejects(verifyWithTU('6609651234', 'x'), TuApiError);
});

test('TU API: รหัสถูก ได้ข้อมูลผู้ใช้ และส่ง key ไปใน header', async () => {
  process.env.TU_API_KEY = 'KEY123';
  const f = fakeFetch(200, {
    status: true, type: 'student', username: '6609651234',
    displayname_th: 'สมชาย ใจดี', displayname_en: 'Somchai Jaidee', email: 'somchai.jai@dome.tu.ac.th',
  });
  const user = await verifyWithTU('6609651234', 'secret', f);
  assert.deepEqual(user, {
    student_id: '6609651234', email: 'somchai.jai@dome.tu.ac.th',
    name_th: 'สมชาย ใจดี', name_en: 'Somchai Jaidee', type: 'student',
  });
  assert.equal(f.calls[0].opts.headers['Application-Key'], 'KEY123');
  assert.deepEqual(JSON.parse(f.calls[0].opts.body), { UserName: '6609651234', PassWord: 'secret' });
});

test('TU API: รหัสผิด = null', async () => {
  process.env.TU_API_KEY = 'KEY123';
  assert.equal(await verifyWithTU('6609651234', 'wrong', fakeFetch(400, { status: false })), null);
});

test('TU API ล่ม (500) = TuApiError', async () => {
  process.env.TU_API_KEY = 'KEY123';
  await assert.rejects(verifyWithTU('6609651234', 'x', fakeFetch(503, {})), TuApiError);
});

test('ต่อ TU API ไม่ได้เลย = TuApiError', async () => {
  process.env.TU_API_KEY = 'KEY123';
  const broken = async () => { throw new Error('ECONNREFUSED'); };
  await assert.rejects(verifyWithTU('6609651234', 'x', broken), TuApiError);
});
