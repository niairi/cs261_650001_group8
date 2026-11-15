# Unit Test Report : Sprint 2 (Task72)

ผลการรัน Unit Test ของ Backend หลัง merge งาน Sprint 2 เข้า `develop`

| รายการ | ค่า |
|---|---|
| วันที่รัน | 10 พ.ย. 2569 |
| Branch / Commit | `develop` @ `19ab1ed` (หลัง merge PR #22, #24, #25, #27, #28, #29) |
| คำสั่ง | `cd backend && npm install && npm test` (Node.js `node --test`) |
| ผล | **126 tests · pass 126 · fail 0** |
| หลักฐาน | `docs/test-evidence/sprint2-npm-test.png` |
| ผู้รัน | Chaweewan (BE1) |

## 1. สรุปตามไฟล์ทดสอบ

| ไฟล์ | ส่วนที่ทดสอบ | User Story | จำนวน | ผล |
|---|---|---|---|---|
| `tests/bookingsRoutes.test.js` | `routes/bookings.js` ผ่าน HTTP จริง (จอง, ดูตาราง, การจองของฉัน, ยกเลิก, แก้ไข) | US2, US3, US4, US6 | 20 | ✅ 20/20 |
| `tests/editBooking.test.js` | `bookingRules` + อีเมลแจ้งแก้ไข | US3, US4, US6 | 15 | ✅ 15/15 |
| `tests/adminService.test.js` | รายการจองและรายงานสรุปของเจ้าหน้าที่ | US7 | 16 | ✅ 16/16 |
| `tests/noShowService.test.js` | ตัวตรวจ No-show, นับ No-show, `GET /users/me/status` | US9, US10 (สถานะแบน) | 14 | ✅ 14/14 |
| `tests/loginService.test.js` | Login, role admin, ตรวจสาขา | US1, US14 | 16 | ✅ 16/16 |
| `tests/tuAuth.test.js` | ตรวจเลขทะเบียน/รหัสผ่าน (TU API และโหมดจำลอง) | US15 | 16 | ✅ 16/16 |
| `tests/emailService.test.js` | อีเมลยืนยัน/ยกเลิก, `email_logs`, `email_status` | US5 | 20 | ✅ 20/20 |
| `tests/startupCheck.test.js` | กล่องสรุปการตั้งค่าตอนเปิด Backend | US14, US15 | 7 | ✅ 7/7 |
| `tests/repositories.test.js` | `upsertUser`, `insertEmailLog` | US1, US5 | 2 | ✅ 2/2 |
| **รวม** | | | **126** | **✅ 126/126** |

## 2. Test Case ที่มี Unit Test ครอบคลุม

| User Story | Test Case | ไฟล์ทดสอบ | ผล |
|---|---|---|---|
| US3 | TC1 จองสำเร็จ · TC2 จองซ้อน "ช่วงเวลานี้ถูกจองแล้ว" · TC3 เกิน 3 ชม. · TC4 ล่วงหน้าเกิน 7 วัน · TC5 นอกเวลา 09:00–16:00 · TC6 วันที่ผ่านมาแล้ว | bookingsRoutes, editBooking | ✅ PASS |
| US4 | TC1 การจองของฉัน · TC2 ยกเลิกแล้วช่วงเวลาว่าง · TC4 เหลือไม่ถึง 30 นาที · TC5 ยกเลิกของคนอื่น | bookingsRoutes, editBooking | ✅ PASS |
| US5 | TC1 ส่งได้ = SENT · TC3 ส่งไม่ได้ = FAILED + `email_logs` | emailService | ✅ PASS |
| US6 | TC1 แก้ไขสำเร็จช่วงเดิมว่าง · TC2 ช่วงใหม่ไม่ว่าง · TC3 เกิน 3 ชม. · TC4 เหลือไม่ถึง 30 นาที | bookingsRoutes, editBooking | ✅ PASS |
| US7 | TC1 เรียงตามวัน/เวลา · TC2 ค้นหารหัส · TC3 กรองห้อง+วัน · TC4 นักศึกษา = 403 · TC6 รายงานสรุป | adminService | ✅ PASS |
| US9 | TC1 ไม่ Check-in 15 นาที = EXPIRED · TC4 ดูจำนวน No-show ของตัวเอง | noShowService | ✅ PASS |
| US14 | TC1 สาขาอื่น = 403 · TC2 นักศึกษา CS Login ได้ · TC3 admin Login ได้ | loginService | ✅ PASS |
| US15 | TC1–TC4 เลขทะเบียน/รหัสผ่านถูกหรือผิด | tuAuth | ✅ PASS |

ทดสอบด้วยมือบน Docker (10 พ.ย. 2569) เพิ่มเติม: US15 TC1–TC4, US14 TC1, US1 TC1 ผ่าน และไม่มีรหัสผ่านใน log ของ Backend (แคปหน้าจอแนบในการ์ด Task82, Task63)

## 3. Bug ที่พบ (แจ้งใน Task77)

| Bug | พบจาก | แก้ใน | ทดสอบซ้ำ |
|---|---|---|---|
| US3 TC2 จองซ้อนเวลา ข้อความไม่ตรง Test Case (ต้องเป็น "ช่วงเวลานี้ถูกจองแล้ว") | `bookingsRoutes.test.js` | PR #28 | ✅ PASS |
| ระยะแบน US10: ข้อความกติกาใน user-stories ("นับรวมวันที่เกิด") ขัดกับ US10 TC1 (ถึง 21 พ.ย.) ทำให้โค้ดใน PR #30 แบนสั้นไป 1 วัน | รีวิว PR #30 | แก้เอกสารใน PR นี้ · แก้โค้ดใน PR #30 | ⏳ รอ PR #30 |

## 4. ยังไม่ครอบคลุม (รอ merge)

| User Story | Test Case | อยู่ใน | สถานะ |
|---|---|---|---|
| US8 Check-in | TC1–TC5 (ระยะ 5 เมตร, ช่วงเวลา −10/+15 นาที) | PR #30 `tests/checkin.test.js` | ⏳ รอ merge แล้วรันซ้ำ |
| US10 Blacklist | TC1–TC4 (แบนครบ 3 ครั้ง, จองระหว่างแบน, พ้นกำหนด) | PR #30 `tests/blacklistService.test.js` | ⏳ รอ merge แล้วรันซ้ำ |
| US5 TC3 (หน้าเว็บ) | ข้อความ "จองสำเร็จ แต่ส่งอีเมลยืนยันไม่สำเร็จ" | Task70 frontend | ⏳ ทดสอบด้วยมือหลังหน้าเว็บเสร็จ |

หลัง PR #30 merge ให้รัน `npm test` ซ้ำ แล้วอัปเดตตารางข้อ 1 และข้อ 4 ในไฟล์นี้
