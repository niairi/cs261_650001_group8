// Login (US1): ตรวจรหัสกับ TU แล้วออก token ให้ frontend
const jwt = require('jsonwebtoken');
const { HttpError } = require('../errors');
const { verifyWithTU, TuApiError } = require('./tuAuth');

// รหัสของเจ้าหน้าที่ (admin) ตั้งใน .env ADMIN_IDS คั่นด้วย , — ใช้ใน US5
function roleOf(studentId) {
  const admins = (process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return admins.includes(studentId) ? 'admin' : 'student';
}

// บันทึกผู้ใช้ลงตาราง users (Task28) — ถ้าบันทึกไม่ได้ login ยังผ่าน แค่เขียน log ไว้
async function defaultSaveUser(user) {
  const pool = require('../db');
  const { upsertUser } = require('../repositories/userRepo');
  await upsertUser(pool, user);
}

// body: { username, password, remember }
async function login(body, verify = verifyWithTU, saveUser = defaultSaveUser) {
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const errors = [];
  if (!username) errors.push('กรุณากรอกเลขทะเบียนนักศึกษาหรืออีเมล');
  if (!password) errors.push('กรุณากรอกรหัสผ่าน');
  if (username.length > 100 || password.length > 100) errors.push('ข้อมูลยาวเกินไป');
  if (errors.length) throw new HttpError(400, 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง', errors);

  let user;
  try {
    user = await verify(username, password);
  } catch (err) {
    if (err instanceof TuApiError) {
      console.error('[login]', err.message); // ห้าม log รหัสผ่าน
      throw new HttpError(502, 'ไม่สามารถเชื่อมต่อระบบของมหาวิทยาลัยได้ กรุณาลองใหม่อีกครั้ง');
    }
    throw err;
  }
  if (!user) throw new HttpError(401, 'เลขทะเบียนนักศึกษาหรือรหัสผ่านไม่ถูกต้อง');

  const role = roleOf(user.student_id);

  try {
    await saveUser({ ...user, role });
  } catch (err) {
    console.error('[login] บันทึกผู้ใช้ลงตาราง users ไม่สำเร็จ:', err.message);
  }

  const payload = { student_id: user.student_id, email: user.email, name: user.name_th || user.name_en, role };
  // ติ๊ก "จดจำการเข้าสู่ระบบ" = token อยู่ได้นานขึ้น
  const expiresIn = body.remember ? '7d' : process.env.JWT_EXPIRES_IN || '8h';
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

  return { token, user: payload };
}

module.exports = { login, roleOf };
