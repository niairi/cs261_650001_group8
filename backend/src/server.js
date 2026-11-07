require('dotenv').config();
const app = require('./app');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Room booking API running on http://localhost:${port}`);
});

// US9: ตัวตรวจ No-show ทุก 1 นาที (Task67) — onNoShow ไว้ให้ระบบ Blacklist (Task68) ต่อเข้ามา
const pool = require('./db');
const { startNoShowScheduler } = require('./services/noShowService');
startNoShowScheduler(pool);
