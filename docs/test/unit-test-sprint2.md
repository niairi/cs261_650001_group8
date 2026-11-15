# Unit Test Report : Sprint 2 (Task72)

ผลการรัน Unit Test ของ Backend หลัง merge งาน Sprint 2 ทั้งหมดเข้า `develop`

| รายการ | ค่า |
|---|---|
| วันที่รัน | 15 พ.ย. 2569 (รอบแรก 10 พ.ย. 2569 ได้ 126/126) |
| Branch / Commit | `develop` @ `72cc1ca` (หลัง merge PR #53) |
| คำสั่ง | `cd backend && npm install && npm test` (Node.js `node --test`) |
| ผล | **192 tests · pass 192 · fail 0** |
| หลักฐาน | `docs/test-evidence/sprint2-npm-test.png` |
| ผู้รัน | Chaweewan (BE1) |

## 1. สรุปตามไฟล์ทดสอบ

| ไฟล์ | ส่วนที่ทดสอบ | User Story | จำนวน | ผล |
|---|---|---|---|---|
| `tests/bookingsRoutes.test.js` | `routes/bookings.js` ผ่าน HTTP จริง (จอง, ดูตาราง, การจองของฉัน, ยกเลิก, แก้ไข, จองระหว่างถูกระงับ) | US2, US3, US4, US6, US10 | 22 | ✅ 22/22 |
| `tests/editBooking.test.js` | `bookingRules` + อีเมลแจ้งแก้ไข + BUG-01 วันเสาร์/อาทิตย์ | US3, US4, US6 | 18 | ✅ 18/18 |
| `tests/adminService.test.js` | รายการจองและรายงานสรุปของเจ้าหน้าที่ | US7 | 16 | ✅ 16/16 |
| `tests/checkin.test.js` | Check-in: ระยะ 5 เมตร, ช่วงเวลา −10/+15 นาที, พิกัดผิด | US8 | 13 | ✅ 13/13 |
| `tests/noShowService.test.js` | ตัวตรวจ No-show, นับ No-show, `GET /users/me/status` (รวมสถานะแบน/ปลดแบน) | US9, US10, US13 | 16 | ✅ 16/16 |
| `tests/blacklistService.test.js` | แบนเมื่อครบ 3 ครั้ง, ระยะ 30 วัน, จองระหว่างแบน, หมดอายุ, ปลดแบน | US10, US13 | 18 | ✅ 18/18 |
| `tests/blacklistAdmin.test.js` | `GET /admin/blacklist`, `POST /admin/blacklist/:id/lift` | US13 | 6 | ✅ 6/6 |
| `tests/roomsAdmin.test.js` | เพิ่ม/แก้ไขห้อง, ปิดปรับปรุง, `GET /rooms?date=` | US12 | 13 | ✅ 13/13 |
| `tests/loginService.test.js` | Login, role admin, ตรวจสาขา | US1, US14 | 16 | ✅ 16/16 |
| `tests/tuAuth.test.js` | ตรวจเลขทะเบียน/รหัสผ่าน (TU API และโหมดจำลอง) | US15 | 16 | ✅ 16/16 |
| `tests/emailService.test.js` | อีเมลยืนยัน/ยกเลิก, `email_logs`, `email_status` | US5 | 20 | ✅ 20/20 |
| `tests/startupCheck.test.js` | กล่องสรุปการตั้งค่าตอนเปิด Backend | US14, US15 | 7 | ✅ 7/7 |
| `tests/envSecret.test.js` | ไฟล์ `.env` แบบเข้ารหัส (`scripts/env-secret.js`) | – (DevOps) | 9 | ✅ 9/9 |
| `tests/repositories.test.js` | `upsertUser`, `insertEmailLog` | US1, US5 | 2 | ✅ 2/2 |
| **รวม** | | | **192** | **✅ 192/192** |

## 2. Test Case ที่มี Unit Test ครอบคลุม

| User Story | Test Case | ไฟล์ทดสอบ | ผล |
|---|---|---|---|
| US3 | TC1 จองสำเร็จ · TC2 จองซ้อน "ช่วงเวลานี้ถูกจองแล้ว" · TC3 เกิน 3 ชม. · TC4 ล่วงหน้าเกิน 7 วัน · TC5 นอกเวลา 09:00–16:00 · TC6 วันที่ผ่านมาแล้ว | bookingsRoutes, editBooking | ✅ PASS |
| US4 | TC1 การจองของฉัน · TC2 ยกเลิกแล้วช่วงเวลาว่าง · TC4 เหลือไม่ถึง 30 นาที · TC5 ยกเลิกของคนอื่น | bookingsRoutes, editBooking | ✅ PASS |
| US5 | TC1 ส่งได้ = SENT · TC3 ส่งไม่ได้ = FAILED + `email_logs` | emailService | ✅ PASS |
| US6 | TC1 แก้ไขสำเร็จช่วงเดิมว่าง · TC2 ช่วงใหม่ไม่ว่าง · TC3 เกิน 3 ชม. · TC4 เหลือไม่ถึง 30 นาที | bookingsRoutes, editBooking | ✅ PASS |
| US7 | TC1 เรียงตามวัน/เวลา · TC2 ค้นหารหัส · TC3 กรองห้อง+วัน · TC4 นักศึกษา = 403 · TC6 รายงานสรุป | adminService | ✅ PASS |
| US8 | TC1 ห่าง 3 เมตร ผ่าน · TC2 ห่าง 50 เมตร "คุณอยู่นอกระยะ" · TC3 พิกัดไม่ส่ง/ผิด · TC4 เลย +15 นาที · TC5 ก่อน −10 นาที | checkin | ✅ PASS |
| US9 | TC1 ไม่ Check-in 15 นาที = EXPIRED · TC4 ดูจำนวน No-show ของตัวเอง | noShowService | ✅ PASS |
| US10 | TC1 No-show ครั้งที่ 3 = แบน 30 วัน (22 ต.ค. → 21 พ.ย.) · TC2 จองระหว่างแบน = 403 · TC3 ครบกำหนดแล้วจองได้ · TC4 No-show 2 ครั้งยังไม่แบน | blacklistService, bookingsRoutes, noShowService | ✅ PASS |
| US12 | TC1 ปิดปรับปรุงแล้ว `GET /rooms` บอกว่าปิด · TC2 จองห้องที่ปิด = 409 · TC3 วันนั้นมีการจองค้าง = ปิดไม่ได้ · TC4 เพิ่มห้อง · TC5 แก้ความจุ · TC6 นักศึกษา = 403 · TC7 ข้อมูลห้องผิด = 400 | roomsAdmin | ✅ PASS |
| US13 | TC1 Admin ปลดแบนแล้วนักศึกษาจองได้ทันที · ไม่ใช่ admin = 403 · ไม่ login = 401 · ปลดซ้ำ/หมดอายุ = 409 | blacklistAdmin, blacklistService, noShowService | ✅ PASS |
| US14 | TC1 สาขาอื่น = 403 · TC2 นักศึกษา CS Login ได้ · TC3 admin Login ได้ | loginService | ✅ PASS |
| US15 | TC1–TC4 เลขทะเบียน/รหัสผ่านถูกหรือผิด | tuAuth | ✅ PASS |

## 3. ทดสอบด้วยมือบน Docker (ยืนยันผล Unit Test)

ทดสอบบน `docker compose up --build` จาก `develop` ล่าสุด (โหมดจำลอง ใช้บัญชีทดสอบใน `MOCK_USERS` ไม่ใช่บัญชีจริง)

| วันที่ | Test Case | ผล |
|---|---|---|
| 10 พ.ย. 2569 | US15 TC1–TC4, US14 TC1, US1 TC1 และไม่มีรหัสผ่านใน log ของ Backend (แคปหน้าจอในการ์ด Task82, Task63) | ✅ PASS |
| 15 พ.ย. 2569 | US14 TC1 (6809650070 สาขาคณิตศาสตร์ Login ไม่ได้) · TC2 (6809650010 Login ได้) | ✅ PASS |
| 15 พ.ย. 2569 | US10 TC4 → TC1 → TC2 → TC3 ด้วย 6809650002: No-show 2 ครั้งยังจองได้ → ครั้งที่ 3 ถูกแบน 2026-11-15 ถึง 2026-12-15 พร้อมอีเมลแจ้ง → จองไม่ได้ ขึ้น "ถูกระงับสิทธิ์…ถึงวันที่ 15 ธันวาคม 2569" → แบนหมดอายุแล้วจองได้ | ✅ PASS |
| 15 พ.ย. 2569 | US8 TC4 / US9 TC1: ไม่ Check-in → "หมดอายุ (Expired)" ไม่มีปุ่ม Check-in · US9 TC2–TC3: การจองที่ Check-in แล้ว/ยกเลิกแล้วไม่นับ No-show (0/3) | ✅ PASS |
| 15 พ.ย. 2569 | US5 TC3: ตั้ง `SMTP_HOST=smtp.invalid` → จองสำเร็จ และ `email_logs` เป็น FAILED (`getaddrinfo ENOTFOUND`) | ✅ PASS |
| 15 พ.ย. 2569 | US12 TC1: admin (6809650099) ปิดปรับปรุงห้อง 1 วัน → นักศึกษาจองห้องนั้นวันนั้นไม่ได้ (Task89) | ✅ PASS |

## 4. Bug ที่พบ (แจ้งใน Task77)

| Bug | พบจาก | แก้ใน | ทดสอบซ้ำ |
|---|---|---|---|
| US3 TC2 จองซ้อนเวลา ข้อความไม่ตรง Test Case (ต้องเป็น "ช่วงเวลานี้ถูกจองแล้ว") | `bookingsRoutes.test.js` | PR #28 | ✅ PASS |
| ระยะแบน US10: ข้อความกติกาใน user-stories ("นับรวมวันที่เกิด") ขัดกับ US10 TC1 (ถึง 21 พ.ย.) ทำให้โค้ดแบนสั้นไป 1 วัน | รีวิว PR #30 | เอกสารใน PR #35 · โค้ดใน PR #30 | ✅ PASS (`blacklistService.test.js` "US10 TC1 ตามเอกสาร") |
| Docker ไม่มีตาราง `blacklist` / `room_closure` ทำให้ US10, US12 ใช้ไม่ได้บน Docker | ทดสอบบน Docker | PR #30, #43 | ✅ PASS (Docker 15 พ.ย.) |

## 5. ยังไม่ครอบคลุม

| User Story | Test Case | เหตุผล | แผน |
|---|---|---|---|
| US8 | TC2–TC3 บนหน้าเว็บจริง (อยู่นอกระยะ, ไม่อนุญาตตำแหน่ง) | Unit Test ผ่านแล้ว แต่ทดสอบบน Docker ได้เฉพาะช่วง 09:00–15:15 | ทดสอบ 16 พ.ย. 2569 (Task73) |
| US13 | TC1 บนหน้าเว็บ (หน้า Blacklist ของ admin) | Unit Test ผ่านแล้ว รอ PR #49 (หน้าเว็บ) merge | ทดสอบบน Docker หลัง merge (Task89) |
