const test = require('node:test');
const assert = require('node:assert');
const { configWarnings, printConfigSummary, countMockUsers } = require('../src/startupCheck');

test('มี TU_API_KEY = Login ตรวจกับ TU จริง (ok)', () => {
  const [login] = configWarnings({ TU_API_KEY: 'secret' });
  assert.equal(login.level, 'ok');
  assert.match(login.text, /TU REST API จริง/);
});

test('ไม่มี TU_API_KEY = เตือนโหมดจำลอง พร้อมจำนวนบัญชีทดสอบ', () => {
  const [login] = configWarnings({ MOCK_USERS: '6809650010:test1234,6609000001:x:คณิตศาสตร์' });
  assert.equal(login.level, 'warn');
  assert.match(login.text, /โหมดจำลอง/);
  assert.match(login.text, /\(2 บัญชี\)/);
  assert.match(login.text, /ห้ามใช้เดโม/);
});

test('ไม่แสดงค่าลับ (TU_API_KEY, รหัสผ่านใน MOCK_USERS) ในข้อความ', () => {
  const env = { TU_API_KEY: 'SUPER-SECRET-KEY', MOCK_USERS: '6809650010:mypass', SMTP_HOST: 'smtp.gmail.com', SMTP_PASS: 'smtp-pass' };
  const all = [...configWarnings(env), ...configWarnings({ ...env, TU_API_KEY: '' })].map((l) => l.text).join('\n');
  for (const secret of ['SUPER-SECRET-KEY', 'mypass', 'smtp-pass']) assert.ok(!all.includes(secret), `ห้ามมี ${secret}`);
});

test('ALLOWED_DEPARTMENTS ว่าง = เตือนว่ายังไม่ตรวจสาขา / ตั้งแล้ว = ok', () => {
  assert.equal(configWarnings({})[1].level, 'warn');
  const on = configWarnings({ ALLOWED_DEPARTMENTS: 'วิทยาการคอมพิวเตอร์' })[1];
  assert.equal(on.level, 'ok');
  assert.match(on.text, /วิทยาการคอมพิวเตอร์/);
});

test('SMTP_HOST ว่าง = เตือน / ตั้งแล้ว = ok', () => {
  assert.equal(configWarnings({})[2].level, 'warn');
  assert.equal(configWarnings({ SMTP_HOST: 'smtp.gmail.com' })[2].level, 'ok');
});

test('countMockUsers: นับเฉพาะรายการที่มีทั้งรหัสและรหัสผ่าน', () => {
  assert.equal(countMockUsers(''), 0);
  assert.equal(countMockUsers(' 1:a , 2: , :b, 3:c:สถิติ '), 2);
});

test('printConfigSummary พิมพ์ทุกบรรทัดผ่าน log ที่ส่งเข้ามา', () => {
  const out = [];
  printConfigSummary({}, (s) => out.push(s));
  assert.equal(out.length, 5); // เส้นบน + 3 บรรทัด + เส้นล่าง
  assert.ok(out.some((s) => s.includes('โหมดจำลอง')));
});
