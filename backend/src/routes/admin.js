const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { listBookings } = require('../services/adminService');

const router = express.Router();

// GET /admin/bookings?student_id=6609651234&status=BOOKED&date=2026-10-20  (US5 — admin เท่านั้น)
router.get('/bookings', requireAuth, requireAdmin, async (req, res) => {
  res.json(await listBookings(pool, req.query));
});

module.exports = router;
