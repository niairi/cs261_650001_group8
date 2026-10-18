// ตรวจรหัสผ่านกับ TU API (US1)
//
// - ถ้าใส่ TU_API_KEY ใน .env จะเช็คกับ TU API จริง
// - ถ้ายังไม่ใส่ จะใช้ "โหมดจำลอง" รับรหัสผ่านอะไรก็ได้ ไว้ให้ทีมทดสอบระหว่างรอ key
//   (โหมดจำลองจะไม่ทำงานถ้าตั้ง NODE_ENV=production กันเผลอเปิดตอนใช้งานจริง)
//
// คืนค่า: ข้อมูลผู้ใช้ ถ้ารหัสถูก / null ถ้ารหัสผิด / throw ถ้าติดต่อ TU API ไม่ได้

const DEFAULT_TU_URL = 'https://restapi.tu.ac.th/api/v1/auth/Ad/verify';

class TuApiError extends Error {}

function isMockMode() {
  return !process.env.TU_API_KEY;
}

function mockVerify(username, password) {
  if (process.env.NODE_ENV === 'production') {
    throw new TuApiError('ยังไม่ได้ตั้ง TU_API_KEY แต่ระบบรันแบบ production');
  }
  if (!password) return null;
  return {
    student_id: username,
    email: process.env.MOCK_EMAIL || `${username}@dome.tu.ac.th`,
    name_th: 'ผู้ใช้ทดสอบ',
    name_en: 'Test User',
    type: 'student',
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
  };
}

module.exports = { verifyWithTU, isMockMode, TuApiError };
