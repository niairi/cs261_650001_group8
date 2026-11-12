// ตรวจรหัสผ่านกับ TU API (US1)
//
// - ถ้าใส่ TU_API_KEY ใน .env จะเช็คกับ TU API จริง
// - ถ้ายังไม่ใส่ จะใช้ "โหมดจำลอง" ซึ่งรับเฉพาะบัญชีทดสอบใน MOCK_USERS (US15)
//   รูปแบบ MOCK_USERS=รหัส:รหัสผ่าน หรือ รหัส:รหัสผ่าน:สาขา คั่นหลายบัญชีด้วย ,
//   เช่น MOCK_USERS=6809650010:test1234,6609000001:test1234:คณิตศาสตร์
//   ถ้าไม่ตั้ง MOCK_USERS จะ Login ไม่ได้ทุกบัญชี (เดิมรับรหัสอะไรก็ได้ ซึ่งอาจารย์พบตอน Review Sprint 1)
//   (โหมดจำลองจะไม่ทำงานถ้าตั้ง NODE_ENV=production กันเผลอเปิดตอนใช้งานจริง)
//
// คืนค่า: ข้อมูลผู้ใช้ ถ้ารหัสถูก / null ถ้ารหัสผิด / throw ถ้าติดต่อ TU API ไม่ได้

const crypto = require('node:crypto');

const DEFAULT_TU_URL = 'https://restapi.tu.ac.th/api/v1/auth/Ad/verify';

class TuApiError extends Error {}

function isMockMode() {
  return !process.env.TU_API_KEY;
}

const DEFAULT_MOCK_DEPARTMENT = 'วิทยาการคอมพิวเตอร์';

// อ่านบัญชีทดสอบจาก MOCK_USERS → Map { รหัส: { password, department } }
function parseMockUsers(raw = process.env.MOCK_USERS) {
  const users = new Map();
  for (const entry of String(raw || '').split(',')) {
    const [id, password, department] = entry.split(':').map((s) => (s || '').trim());
    if (id && password) users.set(id, { password, department: department || DEFAULT_MOCK_DEPARTMENT });
  }
  return users;
}

// เทียบรหัสผ่านแบบใช้เวลาเท่ากันทุกครั้ง (กันเดารหัสจากเวลาที่ตอบ)
function samePassword(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// รับได้ทั้ง "6809650010" และ "6809650010@dome.tu.ac.th"
function toStudentId(username) {
  return String(username || '').trim().split('@')[0];
}

function mockVerify(username, password) {
  if (process.env.NODE_ENV === 'production') {
    throw new TuApiError('ยังไม่ได้ตั้ง TU_API_KEY แต่ระบบรันแบบ production');
  }
  if (!password) return null;

  const studentId = toStudentId(username);
  const account = parseMockUsers().get(studentId);
  // เลขทะเบียนไม่มีในบัญชีทดสอบ หรือรหัสผ่านไม่ตรง = ไม่ผ่าน (US15 TC1–TC3)
  if (!account || !samePassword(password, account.password)) return null;

  return {
    student_id: studentId,
    email: process.env.MOCK_EMAIL || `${studentId}@dome.tu.ac.th`,
    name_th: 'ผู้ใช้ทดสอบ',
    name_en: 'Test User',
    type: 'student',
    department: account.department,
    faculty: 'คณะวิทยาศาสตร์และเทคโนโลยี',
  };
}

async function verifyWithTU(username, password, fetchImpl = globalThis.fetch) {
  if (isMockMode()) return mockVerify(username, password);

  let res;
  let data;
  try {
    res = await fetchImpl(process.env.TU_API_URL || DEFAULT_TU_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Application-Key': process.env.TU_API_KEY,
      },
      body: JSON.stringify({ UserName: username, PassWord: password }),
      signal: AbortSignal.timeout(10000), // รอไม่เกิน 10 วินาที
    });
    data = await res.json().catch(() => ({}));
  } catch (err) {
    throw new TuApiError(`ติดต่อ TU API ไม่ได้: ${err.message}`);
  }

  if (res.status >= 500) throw new TuApiError(`TU API ตอบ ${res.status}`);
  if (data.status !== true) return null; // รหัสนักศึกษาหรือรหัสผ่านผิด

  return {
    student_id: String(data.username || username),
    email: data.email || null,
    name_th: data.displayname_th || null,
    name_en: data.displayname_en || null,
    type: data.type || null,
    department: data.department || null,
    faculty: data.faculty || null,
  };
}

module.exports = { verifyWithTU, isMockMode, parseMockUsers, TuApiError };
