const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { listBookings, bookingSummary } = require('../services/adminService');

const router = express.Router();

// GET /admin/bookings?student_id=6609651234&status=BOOKED&date=2026-10-20&room_id=101  (US7 — admin เท่านั้น)
// ช่วงวันที่: date_from / date_to · เรียงลำดับ: order=asc|desc
router.get('/bookings', requireAuth, requireAdmin, async (req, res) => {
  res.json(await listBookings(pool, req.query));
});

// GET /admin/reports/summary?date_from=2026-10-22&date_to=2026-10-22&room_id=101  (US7 TC6 · Task65)
router.get('/reports/summary', requireAuth, requireAdmin, async (req, res) => {
  res.json(await bookingSummary(pool, req.query));
});

module.exports = router;
