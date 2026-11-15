const express = require('express');
const roomsRouter = require('./routes/rooms');
const adminRouter = require('./routes/admin');
const loginRouter = require('./routes/login');
const bookingsRouter = require('./routes/bookings'); 
const usersRouter = require('./routes/users');      // US9, US10 สถานะ No-show ของตัวเอง

const { requireAuth } = require('./middleware/auth');
const { errorHandler } = require('./errors');

const app = express();


const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/rooms', roomsRouter);
app.use('/admin', adminRouter);                     // US5 เจ้าหน้าที่
app.use('/login', loginRouter);                     // US1 เข้าสู่ระบบ
app.use('/booking', bookingsRouter); // เพิ่ม
app.use('/users', usersRouter);                     // US9, US10

app.use((req, res) => res.status(404).json({ error: 'ไม่พบ endpoint นี้' }));
app.use(errorHandler);

module.exports = app;
