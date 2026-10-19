// อ่าน/บันทึกตาราง users (Task28)

// บันทึกผู้ใช้ตอน login: ถ้ายังไม่มีให้เพิ่ม ถ้ามีแล้วให้อัปเดตข้อมูลล่าสุดจาก TU API
async function upsertUser(db, user) {
  const { rows } = await db.query(
    `INSERT INTO users (student_id, name_th, name_en, email, type, department, faculty, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (student_id) DO UPDATE SET
       name_th = EXCLUDED.name_th,
       name_en = EXCLUDED.name_en,
       email = EXCLUDED.email,
       type = EXCLUDED.type,
       department = EXCLUDED.department,
       faculty = EXCLUDED.faculty,
       role = EXCLUDED.role,
       last_login_at = CURRENT_TIMESTAMP
     RETURNING student_id, created_at, last_login_at`,
    [user.student_id, user.name_th, user.name_en, user.email, user.type, user.department, user.faculty, user.role]
  );
  return rows[0];
}

module.exports = { upsertUser };
