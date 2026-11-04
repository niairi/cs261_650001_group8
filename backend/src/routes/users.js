const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getUserStatus } = require('../services/noShowStatus');

const router = express.Router();

// GET /users/me/status — จำนวน No-show ในภาคการศึกษา และสถานะระงับสิทธิ์ (US9 TC4, US10)
router.get('/me/status', requireAuth, async (req, res, next) => {
  try {
    res.json(await getUserStatus(pool, req.user.student_id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
