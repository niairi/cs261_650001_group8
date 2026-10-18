const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /rooms — รายการห้องที่เปิดใช้งาน สำหรับ dropdown "เลือกห้อง" ในฟอร์มจอง
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT room_id, room_name, capacity, location
       FROM room
      WHERE is_active
      ORDER BY room_id`
  );
  // room_id เป็น BIGINT ซึ่ง pg คืนมาเป็น string แปลงเป็นตัวเลขให้ frontend ใช้ง่าย
  res.json(rows.map((r) => ({ ...r, room_id: Number(r.room_id) })));
});

module.exports = router;
