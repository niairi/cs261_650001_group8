const test = require('node:test');
const assert = require('node:assert');
const { verifyWithTU, parseMockUsers, TuApiError } = require('../src/services/tuAuth');

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

test.beforeEach(() => { process.env.MOCK_USERS = '6609651234:test1234,6609000001:pass5678:คณิตศาสตร์'; });
test.afterEach(() => {
  delete process.env.TU_API_KEY; delete process.env.NODE_ENV;
  delete process.env.MOCK_EMAIL; delete process.env.MOCK_USERS;
});

// ---------- US15: โหมดจำลองต้องตรวจเลขทะเบียนและรหัสผ่าน ----------
test('US15 TC1: เลขทะเบียนถูก รหัสผ่านผิด = ไม่ผ่าน', async () => {
  assert.equal(await verifyWithTU('6609651234', 'wrong'), null);
});

test('US15 TC2: เลขทะเบียนผิด รหัสผ่านถูก = ไม่ผ่าน', async () => {
  assert.equal(await verifyWithTU('6800000000', 'test1234'), null);
});

test('US15 TC3: ผิดทั้งเลขทะเบียนและรหัสผ่าน = ไม่ผ่าน', async () => {
  assert.equal(await verifyWithTU('6800000000', 'wrong'), null);
});

test('US15 TC4: เลขทะเบียนและรหัสผ่านถูก = ได้ข้อมูลผู้ใช้', async () => {
  const user = await verifyWithTU('6609651234', 'test1234');
  assert.equal(user.student_id, '6609651234');
  assert.equal(user.email, '6609651234@dome.tu.ac.th');
  assert.equal(user.department, 'วิทยาการคอมพิวเตอร์');
});

test('โหมดจำลอง: ไม่ได้ตั้ง MOCK_USERS = Login ไม่ได้ทุกบัญชี', async () => {
  delete process.env.MOCK_USERS;
  assert.equal(await verifyWithTU('6609651234', 'test1234'), null);
});

test('โหมดจำลอง: รหัสผ่านว่าง = ไม่ผ่าน', async () => {
  assert.equal(await verifyWithTU('6609651234', ''), null);
});

test('โหมดจำลอง: Login ด้วยอีเมล @dome.tu.ac.th ได้', async () => {
  const user = await verifyWithTU('6609651234@dome.tu.ac.th', 'test1234');
  assert.equal(user.student_id, '6609651234');
});

test('โหมดจำลอง: รหัสผ่านต้องตรงทุกตัว (ตัวพิมพ์เล็ก/ใหญ่ต่างกัน = ไม่ผ่าน)', async () => {
  assert.equal(await verifyWithTU('6609651234', 'TEST1234'), null);
});

test('โหมดจำลอง: บัญชีทดสอบกำหนดสาขาได้ (ใช้ทดสอบ US14)', async () => {
  assert.equal((await verifyWithTU('6609000001', 'pass5678')).department, 'คณิตศาสตร์');
});

test('โหมดจำลอง: ใช้ MOCK_EMAIL ได้', async () => {
  process.env.MOCK_EMAIL = 'me@example.com';
  assert.equal((await verifyWithTU('6609651234', 'test1234')).email, 'me@example.com');
});

test('parseMockUsers: ข้ามรายการที่ไม่ครบ และตัดช่องว่าง', () => {
  const users = parseMockUsers(' 1:a , 2: , :b, 3:c:สถิติ ');
  assert.deepEqual([...users.keys()], ['1', '3']);
  assert.equal(users.get('3').department, 'สถิติ');
});

test('โหมดจำลองไม่ทำงานตอน production', async () => {
  process.env.NODE_ENV = 'production';
  await assert.rejects(verifyWithTU('6609651234', 'test1234'), TuApiError);
});

test('TU API: รหัสถูก ได้ข้อมูลผู้ใช้ และส่ง key ไปใน header', async () => {
  process.env.TU_API_KEY = 'KEY123';
  const f = fakeFetch(200, {
    status: true, type: 'student', username: '6609651234',
    displayname_th: 'สมชาย ใจดี', displayname_en: 'Somchai Jaidee', email: 'somchai.jai@dome.tu.ac.th',
    department: 'วิทยาการคอมพิวเตอร์', faculty: 'คณะวิทยาศาสตร์และเทคโนโลยี',
  });
  const user = await verifyWithTU('6609651234', 'secret', f);
  assert.deepEqual(user, {
    student_id: '6609651234', email: 'somchai.jai@dome.tu.ac.th',
    name_th: 'สมชาย ใจดี', name_en: 'Somchai Jaidee', type: 'student',
    department: 'วิทยาการคอมพิวเตอร์', faculty: 'คณะวิทยาศาสตร์และเทคโนโลยี',
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
