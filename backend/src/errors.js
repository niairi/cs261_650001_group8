class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// error ทุกแบบตอบในรูปแบบเดียวกัน:
// { "error": "ข้อความหลัก", "details": ["รายละเอียด", ...] }   (details มีเฉพาะบางกรณี)
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  // body ไม่ใช่ JSON ที่ถูกต้อง
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง (ต้องเป็น JSON)' });
  }
  // 23514 = ข้อมูลผิด CHECK constraint ใน DB (เช่น เกิน 3 ชม.) — ปกติ validation จะดักไว้ก่อนแล้ว
    if (err.code === '23514') {
    return res.status(400).json({ error: 'ข้อมูลการจองไม่ถูกต้อง' });
  }
  // 23503 = ไม่พบผู้ใช้ในตาราง users (เช่น ฐานข้อมูลถูกสร้างใหม่) ให้ login ใหม่
  if (err.code === '23503' && err.constraint === 'fk_booking_student') {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง' });
  }
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
}

module.exports = { HttpError, errorHandler };
