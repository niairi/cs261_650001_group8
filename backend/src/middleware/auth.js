const jwt = require('jsonwebtoken');
const { HttpError } = require('../errors');

// ต้องส่ง header: Authorization: Bearer <token>
// token ออกโดย POST /login มี payload { student_id, email, name, role }
// - email ใช้ส่งอีเมลยืนยันการจอง (US7)
// - role ใช้แยก admin (US5)
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');
  }
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Token ไม่ถูกต้องหรือหมดอายุ');
  }
  if (!payload.student_id) throw new HttpError(401, 'Token ไม่มีรหัสนักศึกษา');
  req.user = {
    student_id: String(payload.student_id),
    email: payload.email || null,
    name: payload.name || null,
    role: payload.role || 'student',
  };
  next();
}

// ใช้ต่อจาก requireAuth: อนุญาตเฉพาะ role admin (US5)
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    throw new HttpError(403, 'เฉพาะเจ้าหน้าที่เท่านั้น');
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
