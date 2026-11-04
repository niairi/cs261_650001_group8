require('dotenv').config();
const app = require('./app');
const { printConfigSummary } = require('./startupCheck');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Room booking API running on http://localhost:${port}`);
  // บอกโหมด Login / ตรวจสาขา / อีเมล ทุกครั้งที่เปิด — ก่อนเดโมต้องเห็น ✅ ที่บรรทัด Login
  printConfigSummary();
});
