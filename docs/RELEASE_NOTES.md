# Release Notes

## v1.0 : Sprint 1 (20 ต.ค. 2569)

Release แรกของระบบจองห้อง CS Co-Working Space (MVP 1)

### ฟีเจอร์
| US | ฟีเจอร์ | Endpoint |
|---|---|---|
| US1 | Login ด้วย TU Account (TU REST API) และออก JWT token | `POST /login` |
| US2 | ตารางสถานะห้องว่าง/ไม่ว่าง 09:00–17:00 รีเฟรชเองทุก 5 วินาที | `GET /rooms`, `GET /booking?date=` |
| US3 | จองห้องล่วงหน้า ครั้งละไม่เกิน 3 ชม. ล่วงหน้าไม่เกิน 7 วัน กันจองซ้อน | `POST /booking` |
| US4 | ดูการจองของฉัน และยกเลิกได้ก่อนเวลาเริ่มอย่างน้อย 30 นาที | `GET /booking/me`, `PATCH /booking/:id/cancel` |
| US5 | อีเมลยืนยันการจอง / การยกเลิก และบันทึกผลใน `email_logs` | (เรียกจาก US3, US4) |

### Infrastructure
- รันทั้งระบบด้วย `docker compose up --build`: frontend (Nginx :5500), backend (Node.js :3000), PostgreSQL 16 (:5433)
- ฐานข้อมูลสร้างตารางและข้อมูลตัวอย่างอัตโนมัติจาก `schema.sql` → `002_users_and_email_logs.sql` → `seed.sql`
- โหมดจำลอง: ไม่ใส่ `.env` = login ด้วยรหัสอะไรก็ได้ และอีเมลแสดงใน log ของ backend

### คุณภาพ
- Unit Test 40 tests ผ่านทั้งหมด (`npm test`)
- ทุกงานเข้า `develop` ผ่าน Pull Request และมีเพื่อนรีวิว

### ข้อจำกัดที่รู้อยู่ (ย้ายไป Sprint 2)
- ยังไม่ตรวจสาขาวิทยาการคอมพิวเตอร์ตอน login (US1 เดิม TC3)
- เมนู "จัดการการจอง" ของ Admin (US7 TC5)
- ข้อความบนหน้าจอเมื่อส่งอีเมลไม่สำเร็จ (US5 เดิม TC3)

### Pull Requests ใน release นี้
#3 frontend-connect-api · #8 db-queries · #9 Docker · #10 frontend · #11 เอกสาร · #12 แก้ตาม Test Case
