# เอกสาร Design : Sprint 1 + Sprint 2

ทุกรูปมีไฟล์ต้นฉบับ `.puml` (PlantUML) อยู่ข้างกัน แก้แล้ว render ใหม่ได้ด้วย PlantUML

## Architecture

| แผนภาพ | ไฟล์ | อธิบาย |
|---|---|---|
| Deployment Diagram | [deployment.png](deployment.png) | Browser → Frontend (Nginx :5500) → Backend (Node.js Express :3000) → PostgreSQL (:5432 ใน Docker) และบริการภายนอก TU REST API / SMTP |
| Class Diagram | [class-diagram.png](class-diagram.png) | โครงสร้าง Backend แบ่งชั้น routes → middleware / services → repositories → Db (สีเขียว = เพิ่มใน Sprint 2: BookingRules, Check-in, No-show, Blacklist, Scheduler) |
| DTO Class | [dto-class.png](dto-class.png) | รูปแบบ JSON ที่รับ/ส่งระหว่าง Frontend กับ Backend |
| ER Diagram | [er.png](er.png) | ตาราง room, booking, users, email_logs (ดูรายละเอียดคอลัมน์ใน `database/ERD.md`) |

## Sequence Diagram (System Flow) ต่อ User Story

| US | ไฟล์ | Endpoint ที่เกี่ยวข้อง |
|---|---|---|
| US1 Login | [sequence/US1-login.png](sequence/US1-login.png) | `POST /login` |
| US2 ดูตาราง Real-time | [sequence/US2-view-table.png](sequence/US2-view-table.png) | `GET /rooms`, `GET /booking?date=` |
| US3 จองห้อง | [sequence/US3-booking.png](sequence/US3-booking.png) | `POST /booking` |
| US4 การจองของฉัน / ยกเลิก | [sequence/US4-cancel.png](sequence/US4-cancel.png) | `GET /booking/me`, `PATCH /booking/:id/cancel` |
| US5 อีเมลแจ้งเตือน | [sequence/US5-email.png](sequence/US5-email.png) | เรียกจาก `POST /booking` และ `PATCH /booking/:id/cancel` |

## Data Flow Diagram (Sprint 2)

| แผนภาพ | ไฟล์ | อธิบาย |
|---|---|---|
| DFD Level 0 (Context) | [dfd-level0.png](dfd-level0.png) | ระบบทั้งระบบเป็น 1 process กับ external entity: นักศึกษา, เจ้าหน้าที่, TU REST API, SMTP |
| DFD Level 1 | [dfd-level1.png](dfd-level1.png) | แตกเป็น 7 process (ยืนยันตัวตน, ดูตาราง, จัดการการจอง, Check-in, No-show/Blacklist, อีเมล, รายงาน) และ data store D1–D5 |

## Sequence Diagram : Sprint 2

| US | ไฟล์ | Endpoint ที่เกี่ยวข้อง |
|---|---|---|
| US6 แก้ไขเวลาการจอง | [sequence/US6-edit-booking.png](sequence/US6-edit-booking.png) | `PATCH /booking/:id` (วาดตามโค้ดใน branch `feature/US6-edit-booking`) |
| US7 Admin ดูรายการและรายงาน | [sequence/US7-admin-report.png](sequence/US7-admin-report.png) | `GET /admin/bookings`, `GET /admin/reports/summary` |
| US8 Check-in ระยะ 5 เมตร | [sequence/US8-checkin.png](sequence/US8-checkin.png) | `POST /booking/:id/checkin` (PR #23) |
| US9–US10 No-show และ Blacklist | [sequence/US9-US10-noshow-blacklist.png](sequence/US9-US10-noshow-blacklist.png) | `startNoShowScheduler` ทุก 1 นาที, `GET /users/me/status`, `POST /booking` (Blacklist: PR #30) |

> US6, US7, US9 วาดตามโค้ดใน develop (9 พ.ย. 2569) · US8 และ US10 วาดตาม PR #23 และ #30 ที่รอ merge
> Sequence US2 และ US3 ของ Sprint 1 อัปเดตเวลาทำการเป็น 09:00–16:00 แล้ว
> เวลาทำการ 09:00–16:00 ตามมติประชุม 27 ต.ค. 2569

## เอกสารอื่นที่เกี่ยวข้อง

- API Specification: [`docs/API.md`](../API.md)
- Test Cases: [`docs/TEST_CASES.md`](../TEST_CASES.md) และ Postman Collection
- User Stories: [`docs/requirement/user-stories.md`](../requirement/user-stories.md)
- กฎการจองและสถานะ: `database/database-guide.md`
