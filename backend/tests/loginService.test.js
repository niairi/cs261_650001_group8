const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { login, roleOf } = require('../src/services/loginService');
const { TuApiError } = require('../src/services/tuAuth');

process.env.JWT_SECRET = 'test-secret';
const okUser = { student_id: '6609651234', email: 's@dome.tu.ac.th', name_th: 'สมชาย ใจดี', type: 'student' };
const verifyOk = async () => okUser;

test('login สำเร็จ ได้ token ที่มี student_id, email, role', async () => {
  const { token, user } = await login({ username: '6609651234', password: 'x' }, verifyOk);
  const payload = jwt.verify(token, 'test-secret');
  assert.equal(payload.student_id, '6609651234');
  assert.equal(payload.email, 's@dome.tu.ac.th');
  assert.equal(payload.role, 'student');
  assert.equal(user.name, 'สมชาย ใจดี');
});

test('token หมดอายุใน 8 ชม. ปกติ / 7 วันถ้าติ๊กจดจำ', async () => {
  const exp = (t) => { const p = jwt.decode(t); return (p.exp - p.iat) / 3600; };
  assert.equal(exp((await login({ username: 'a', password: 'x' }, verifyOk)).token), 8);
  assert.equal(exp((await login({ username: 'a', password: 'x', remember: true }, verifyOk)).token), 168);
});

test('รหัสผิด = 401', async () => {
  await assert.rejects(login({ username: 'a', password: 'x' }, async () => null), { status: 401 });
});

test('ไม่กรอก = 400 พร้อมรายละเอียด', async () => {
  await assert.rejects(login({}, verifyOk), { status: 400, details: ['กรุณากรอกเลขทะเบียนนักศึกษาหรืออีเมล', 'กรุณากรอกรหัสผ่าน'] });
});

test('TU API ล่ม = 502', async () => {
  await assert.rejects(login({ username: 'a', password: 'x' }, async () => { throw new TuApiError('down'); }), { status: 502 });
});

test('รหัสที่อยู่ใน ADMIN_IDS ได้ role admin', async () => {
  process.env.ADMIN_IDS = '6609650000, 6609659999';
  assert.equal(roleOf('6609659999'), 'admin');
  assert.equal(roleOf('6609651234'), 'student');
  const { user } = await login({ username: 'x', password: 'x' }, async () => ({ ...okUser, student_id: '6609650000' }));
  assert.equal(user.role, 'admin');
  delete process.env.ADMIN_IDS;
});
