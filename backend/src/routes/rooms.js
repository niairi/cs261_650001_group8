const express = require('express');
const pool = require('../db');
const { HttpError } = require('../errors');
const { isRealDate } = require('../services/bookingRules');
const { listRoomsForDate } = require('../services/roomService');

const router = express.Router();

// GET /rooms?date=YYYY-MM-DD — รายการห้องที่เปิดใช้งาน สำหรับผังห้อง / dropdown "เลือกห้อง" ในฟอร์มจอง
// แต่ละห้องบอก closed / closure_reason ของวันนั้น (US12 TC1) ไม่ส่ง date = วันนี้
router.get('/', async (req, res) => {
  const date = req.query.date ?? new Date().toLocaleDateString('sv-SE');
  if (typeof date !== 'string' || !isRealDate(date)) {
    throw new HttpError(400, 'date ต้องอยู่ในรูปแบบ YYYY-MM-DD');
  }
  res.json(await listRoomsForDate(pool, date));
});

module.exports = router;
