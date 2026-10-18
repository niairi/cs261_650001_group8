const express = require('express');
const roomsRouter = require('./routes/rooms');
const bookingsRouter = require('./routes/bookings');
const { requireAuth } = require('./middleware/auth');
const { errorHandler } = require('./errors');

const app = express();

// CORS: อนุญาตให้ frontend (คนละ port) เรียก API ได้ — ตั้งค่าใน .env CORS_ORIGIN
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/rooms', roomsRouter);                     // ดูรายการห้องได้โดยไม่ต้อง login
app.use('/bookings', requireAuth, bookingsRouter);  // จองต้อง login

app.use((req, res) => res.status(404).json({ error: 'ไม่พบ endpoint นี้' }));
app.use(errorHandler);

module.exports = app;
