// Task87 · US13: Unit Test ของ GET /admin/blacklist และ POST /admin/blacklist/:id/lift
// ยิง HTTP จริงเข้า app บนพอร์ตสุ่ม ใช้ฐานข้อมูลปลอมในหน่วยความจำ (แบบเดียวกับ bookingsRoutes.test.js)
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
delete process.env.SMTP_HOST;

const { createBlacklistService } = require('../src/services/blacklistService');

// ---------- ฐานข้อมูลปลอม: เข้าใจเฉพาะ SQL ของ blacklist ----------
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
const plusDays = (n) => {
  const d = new Date(`${today()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const db = { blacklist: [], users: new Map([['6809650010', { name_th: 'นักศึกษาทดสอบ' }]]) };
const isActive = (x, day) => x.end_date >= day && !x.lifted_at;

async function query(sql, p = []) {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (/FROM blacklist bl LEFT JOIN users/.test(s)) { // GET /admin/blacklist
    return {
      rows: db.blacklist.filter((x) => isActive(x, p[0])).map((x) => ({
        blacklist_id: x.blacklist_id, student_id: x.student_id, name: db.users.get(x.student_id)?.name_th ?? null,
        start_date: x.start_date, end_date: x.end_date, reason: x.reason,
      })),
    };
  }
  if (/^UPDATE blacklist SET lifted_at = \$2, lifted_by = \$3/.test(s)) { // ปลดระงับ
    const x = db.blacklist.find((r) => r.blacklist_id === p[0] && isActive(r, p[3]));
    if (!x) return { rows: [] };
    Object.assign(x, { lifted_at: p[1], lifted_by: p[2] });
    return { rows: [{ ...x }] };
  }
  if (/^SELECT blacklist_id FROM blacklist WHERE blacklist_id = \$1$/.test(s)) {
    return { rows: db.blacklist.filter((x) => x.blacklist_id === p[0]).map((x) => ({ blacklist_id: x.blacklist_id })) };
  }
  if (/FROM blacklist WHERE student_id = \$1 AND end_date >= \$2::date AND lifted_at IS NULL/.test(s)) { // ตอนจอง
    return { rows: db.blacklist.filter((x) => x.student_id === p[0] && isActive(x, p[1])) };
  }
  throw new Error(`ฐานข้อมูลปลอมไม่รู้จัก SQL นี้: ${s.slice(0, 80)}`);
}
const fakePool = { query, connect: async () => ({ query, release() {} }) };

const dbPath = path.join(__dirname, '../src/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakePool };
const app = require('../src/app');

// ---------- ตัวช่วย ----------
const tokenOf = (student_id, role) => jwt.sign({ student_id, email: `${student_id}@dome.tu.ac.th`, name: 'ทดสอบ', role }, 'test-secret');
const ADMIN = tokenOf('admin01', 'admin');
const STUDENT = tokenOf('6809650010', 'student');

let server;
let base;
test.before(async () => {
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());
test.beforeEach(() => {
  db.blacklist = [
    { blacklist_id: 1, student_id: '6809650010', start_date: today(), end_date: plusDays(30), reason: 'No-show ครบ 3 ครั้ง', lifted_at: null, lifted_by: null },
    { blacklist_id: 2, student_id: '6809650011', start_date: plusDays(-40), end_date: plusDays(-10), reason: 'No-show ครบ 3 ครั้ง', lifted_at: null, lifted_by: null },
  ];
});

async function call(method, url, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + url, { method, headers });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

test('US13: admin ดูรายชื่อ เห็นเฉพาะคนที่ยังถูกระงับ พร้อมชื่อ เลขทะเบียน วันสิ้นสุด เหตุผล', async () => {
  const r = await call('GET', '/admin/blacklist', ADMIN);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.count, 1);
  const [row] = r.body.rows;
  assert.strictEqual(row.student_id, '6809650010');
  assert.strictEqual(row.name, 'นักศึกษาทดสอบ');
  assert.strictEqual(row.end_date, plusDays(30));
  assert.strictEqual(row.reason, 'No-show ครบ 3 ครั้ง');
});

test('US13 TC1: 6809650010 ถูกระงับสิทธิ์ → Admin กดปลด → นักศึกษาจองได้ทันที', async () => {
  const service = createBlacklistService({ db: fakePool, sendNotice: async () => {} });
  await assert.rejects(service.assertNotBlacklisted('6809650010'), { message: /คุณถูกระงับสิทธิ์การจองถึงวันที่/ }); // ก่อนปลด (US10 TC2)

  const r = await call('POST', '/admin/blacklist/1/lift', ADMIN);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.lifted_by, 'admin01'); // บันทึกว่าใครปลด
  assert.ok(r.body.lifted_at); // และเมื่อไหร่

  await service.assertNotBlacklisted('6809650010'); // หลังปลด ผ่านทันที
  const list = await call('GET', '/admin/blacklist', ADMIN);
  assert.strictEqual(list.body.count, 0);
});

test('US13: ผู้ใช้ที่ไม่ใช่ admin เรียก API ปลด / ดูรายชื่อ → 403 และไม่ถูกปลด', async () => {
  assert.strictEqual((await call('POST', '/admin/blacklist/1/lift', STUDENT)).status, 403);
  assert.strictEqual((await call('GET', '/admin/blacklist', STUDENT)).status, 403);
  assert.strictEqual(db.blacklist[0].lifted_at, null);
});

test('US13: ไม่ได้ login → 401', async () => {
  assert.strictEqual((await call('POST', '/admin/blacklist/1/lift')).status, 401);
});

test('US13: ปลดรายการที่ไม่มี → 404 · ปลดซ้ำ / หมดอายุแล้ว → 409 · รหัสไม่ถูกต้อง → 400', async () => {
  assert.strictEqual((await call('POST', '/admin/blacklist/99/lift', ADMIN)).status, 404);
  assert.strictEqual((await call('POST', '/admin/blacklist/2/lift', ADMIN)).status, 409);
  assert.strictEqual((await call('POST', '/admin/blacklist/1/lift', ADMIN)).status, 200);
  assert.strictEqual((await call('POST', '/admin/blacklist/1/lift', ADMIN)).status, 409);
  assert.strictEqual((await call('POST', '/admin/blacklist/abc/lift', ADMIN)).status, 400);
});

test('US10 TC2 (ซ้ำ): คนที่ยังไม่ถูกปลดยังจองไม่ได้', async () => {
  const service = createBlacklistService({ db: fakePool, sendNotice: async () => {} });
  await call('POST', '/admin/blacklist/2/lift', ADMIN); // ปลดคนอื่น ไม่กระทบ
  await assert.rejects(service.assertNotBlacklisted('6809650010'), { message: /คุณถูกระงับสิทธิ์การจองถึงวันที่/ });
});