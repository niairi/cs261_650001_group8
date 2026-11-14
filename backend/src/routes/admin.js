const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { listBookings, bookingSummary } = require('../services/adminService');
const {
  listRoomsForAdmin, createRoom, updateRoom, addClosure, removeClosure,
} = require('../services/roomService');

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

// ---------- US12 จัดการข้อมูลห้อง (Task85) ----------
// GET /admin/rooms — ห้องทั้งหมด (รวมที่ปิดใช้งาน) + วันปิดปรับปรุงตั้งแต่วันนี้
router.get('/rooms', requireAuth, requireAdmin, async (req, res) => {
  res.json({ rooms: await listRoomsForAdmin(pool) });
});

// POST /admin/rooms { room_id?, room_name, capacity, location?, is_active? }
router.post('/rooms', requireAuth, requireAdmin, async (req, res) => {
  res.status(201).json(await createRoom(pool, req.body || {}));
});

// PATCH /admin/rooms/:id { room_name?, capacity?, location?, is_active? }
router.patch('/rooms/:id', requireAuth, requireAdmin, async (req, res) => {
  res.json(await updateRoom(pool, req.params.id, req.body || {}));
});

// POST /admin/rooms/:id/closures { date: "YYYY-MM-DD", reason? } — ปิดปรับปรุงห้องวันนั้น
router.post('/rooms/:id/closures', requireAuth, requireAdmin, async (req, res) => {
  res.status(201).json(await addClosure(pool, req.params.id, req.body || {}, req.user.student_id));
});

// DELETE /admin/rooms/:id/closures/:date — ยกเลิกการปิดปรับปรุง (เปิดห้องวันนั้นกลับมา)
router.delete('/rooms/:id/closures/:date', requireAuth, requireAdmin, async (req, res) => {
  res.json(await removeClosure(pool, req.params.id, req.params.date));
});

module.exports = router;
