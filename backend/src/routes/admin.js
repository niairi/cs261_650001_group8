const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { HttpError } = require('../errors');
const { listBookings, bookingSummary } = require('../services/adminService');
const { createBlacklistService } = require('../services/blacklistService');
const { sendBlacklistNotice } = require('../services/emailService');

const router = express.Router();
const blacklistService = createBlacklistService({ db: pool, sendNotice: sendBlacklistNotice });

// GET /admin/bookings?student_id=6609651234&status=BOOKED&date=2026-10-20&room_id=101  (US7 — admin เท่านั้น)
// ช่วงวันที่: date_from / date_to · เรียงลำดับ: order=asc|desc
router.get('/bookings', requireAuth, requireAdmin, async (req, res) => {
  res.json(await listBookings(pool, req.query));
});

// GET /admin/reports/summary?date_from=2026-10-22&date_to=2026-10-22&room_id=101  (US7 TC6 · Task65)
router.get('/reports/summary', requireAuth, requireAdmin, async (req, res) => {
  res.json(await bookingSummary(pool, req.query));
});

// GET /admin/blacklist — รายชื่อผู้ถูกระงับสิทธิ์ที่ยังมีผล (US13 · Task87)
router.get('/blacklist', requireAuth, requireAdmin, async (req, res) => {
  const rows = await blacklistService.listActiveBlacklist();
  res.json({ rows, count: rows.length });
});

// POST /admin/blacklist/:id/lift — ปลดระงับก่อนกำหนด นักศึกษาจองได้ทันที (US13 · Task87)
router.post('/blacklist/:id/lift', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'รหัสรายการระงับสิทธิ์ไม่ถูกต้อง');
  res.json(await blacklistService.liftBlacklist(id, req.user.student_id));
});

module.exports = router;