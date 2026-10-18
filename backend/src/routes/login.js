const express = require('express');
const { login } = require('../services/loginService');

const router = express.Router();

// POST /login  (US1)
// body: { "username": "6609651234", "password": "...", "remember": true }
// ตอบ:  { "token": "...", "user": { student_id, email, name, role } }
router.post('/', async (req, res) => {
  const result = await login(req.body || {});
  res.json(result);
});

module.exports = router;
