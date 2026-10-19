# เอกสาร Design : Sprint 1

ทุกรูปมีไฟล์ต้นฉบับ `.puml` (PlantUML) อยู่ข้างกัน แก้แล้ว render ใหม่ได้ด้วย PlantUML

## Architecture

| แผนภาพ | ไฟล์ | อธิบาย |
|---|---|---|
| Deployment Diagram | [deployment.png](deployment.png) | Browser → Frontend (Nginx :5500) → Backend (Node.js Express :3000) → PostgreSQL (:5432 ใน Docker) และบริการภายนอก TU REST API / SMTP |
| Class Diagram | [class-diagram.png](class-diagram.png) | โครงสร้าง Backend แบ่งชั้น routes → middleware / services → repositories → Db |
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

## เอกสารอื่นที่เกี่ยวข้อง

- API Specification: [`docs/API.md`](../API.md)
- Test Cases: [`docs/TEST_CASES.md`](../TEST_CASES.md) และ Postman Collection
- User Stories: [`docs/requirement/user-stories.md`](../requirement/user-stories.md)
- กฎการจองและสถานะ: `database/database-guide.md`
