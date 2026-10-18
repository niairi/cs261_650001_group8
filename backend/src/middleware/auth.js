const jwt = require('jsonwebtoken');
const { HttpError } = require('../errors');

// ต้องส่ง header: Authorization: Bearer <token>
// token มี payload { student_id } (ระบบ login ใน US1 เป็นคนออก token)
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
  req.user = { student_id: String(payload.student_id) };
  next();
}

module.exports = { requireAuth };
