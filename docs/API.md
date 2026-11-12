# API Specification — TU CS Space

ระบบจองห้อง Co-Working Space ภาควิชาวิทยาการคอมพิวเตอร์ มธ. (Task15 · อัปเดต Sprint 2 ใน Task57)

> ส่วนที่มีป้าย **🆕 Sprint 2** คือ spec ที่ออกแบบใน Task57 ก่อนเขียนโค้ด ข้อความ error ทุกข้อตรงกับ Test Case ใน `docs/requirement/user-stories.md` (Task52)

| | |
|---|---|
| Base URL (เครื่องตัวเอง) | `http://localhost:3000` |
| รูปแบบข้อมูล | JSON (`Content-Type: application/json`) |
| เวลา | เวลาไทย (`TZ=Asia/Bangkok`) วันที่ `YYYY-MM-DD` เวลา `HH:MM` |
| Backend | Node.js 22 + Express 5 + PostgreSQL |
| อ้างอิงโค้ด | branch `develop` (`backend/src/routes/*`) |

## สรุป Endpoint

| Method | Path | ต้อง login | สิทธิ์ | User Story | หน้าที่ |
|---|---|---|---|---|---|
| GET | `/health` | ไม่ | - | - | เช็กว่า server ทำงานอยู่ |
| POST | `/login` | ไม่ | - | US1 | เข้าสู่ระบบด้วยบัญชี TU รับ token |
| GET | `/rooms` | ไม่ | - | US2 | รายการห้องที่เปิดใช้งาน |
| GET | `/booking?date=` | ไม่ | - | US2 | ช่วงเวลาที่ถูกจองของวันนั้น (ตาราง real-time) |
| POST | `/booking` | ใช่ | student, admin | US3, US5, US10 | จองห้อง + ส่งอีเมลยืนยัน (🆕 ตอบสถานะอีเมล, ปฏิเสธผู้ถูกระงับสิทธิ์) |
| GET | `/booking/me` | ใช่ | student, admin | US4 | ประวัติการจองของตัวเอง |
| PATCH | `/booking/:id/cancel` | ใช่ | เจ้าของการจอง | US4, US5 | ยกเลิกการจอง + ส่งอีเมลยืนยันการยกเลิก |
| PATCH | `/booking/:id` 🆕 | ใช่ | เจ้าของการจอง | US6 | แก้ไขห้อง/เวลาการจอง + ส่งอีเมลแจ้งการเปลี่ยนแปลง |
| POST | `/booking/:id/checkin` 🆕 | ใช่ | เจ้าของการจอง | US8 | ยืนยันการเข้าใช้งานด้วยตำแหน่ง GPS |
| GET | `/users/me/status` 🆕 | ใช่ | student, admin | US9, US10 | จำนวน No-show ในภาคการศึกษา และสถานะการถูกระงับสิทธิ์ |
| GET | `/admin/bookings` | ใช่ | admin | US7 | เจ้าหน้าที่ดูการจองทั้งหมด (🆕 กรองตามห้องและช่วงวันที่) |
| GET | `/admin/reports/summary` 🆕 | ใช่ | admin | US7 | รายงานสรุปจำนวนจอง/ยกเลิก/No-show ตามห้องและวัน |

งานอัตโนมัติ (ไม่ใช่ endpoint): **🆕 ตัวตรวจ No-show** รันทุก 1 นาที (US9, US10) ดูหัวข้อ "งานอัตโนมัติ: No-show และระงับสิทธิ์"

> หมายเหตุเลข User Story: เอกสารฉบับ Sprint 1 เขียนอีเมลเป็น US7 และ Admin เป็น US5 ตามเลขเดิม ฉบับนี้ใช้เลขปัจจุบัน คือ **อีเมล = US5, Admin = US7**

---

## การยืนยันตัวตน

Endpoint ที่ต้อง login ให้ส่ง token ที่ได้จาก `POST /login` ใน header:

```http
Authorization: Bearer <token>
```

token เป็น JWT ข้างในมีข้อมูล:

```json
{ "student_id": "6609651234", "email": "xxx@dome.tu.ac.th", "name": "ชื่อ นามสกุล", "role": "student" }
```

- `role` เป็น `admin` ถ้ารหัสอยู่ใน `ADMIN_IDS` ของ `.env` นอกนั้นเป็น `student`
- อายุ token 8 ชั่วโมง (`JWT_EXPIRES_IN`) หรือ 7 วันถ้าติ๊ก "จดจำการเข้าสู่ระบบ"
- `student_id` ของผู้จองดึงจาก token เสมอ ไม่รับจาก body เพื่อกันการจองในชื่อคนอื่น

| Status | error | เมื่อไหร่ |
|---|---|---|
| 401 | `กรุณาเข้าสู่ระบบ` | ไม่ได้ส่ง header หรือรูปแบบไม่ใช่ `Bearer <token>` |
| 401 | `Token ไม่ถูกต้องหรือหมดอายุ` | token ปลอม ถูกแก้ หรือหมดอายุ |
| 403 | `เฉพาะเจ้าหน้าที่เท่านั้น` | เรียก `/admin/*` โดย role ไม่ใช่ admin (US7 TC4) |

## รูปแบบ Error

ทุก endpoint ตอบ error รูปแบบเดียวกัน `details` มีเฉพาะบางกรณี

```json
{ "error": "ข้อความหลัก", "details": ["รายละเอียด 1", "รายละเอียด 2"] }
```

| Status | ความหมาย |
|---|---|
| 400 | ข้อมูลที่ส่งมาไม่ถูกต้อง หรือ body ไม่ใช่ JSON (`รูปแบบข้อมูลไม่ถูกต้อง (ต้องเป็น JSON)`) |
| 401 | ยังไม่ login / token ใช้ไม่ได้ / รหัสผ่านผิด |
| 403 | ไม่มีสิทธิ์ |
| 404 | ไม่พบข้อมูล หรือไม่มี endpoint นี้ (`ไม่พบ endpoint นี้`) |
| 409 | ข้อมูลชนกับสถานะปัจจุบัน เช่น เวลาทับ ยกเลิกซ้ำ |
| 502 | เชื่อมต่อ TU API ไม่ได้ |
| 500 | `เกิดข้อผิดพลาดในระบบ` (รายละเอียดดูใน log ของ server) |

---

## GET /health

```json
{ "ok": true }
```

---

## POST /login — เข้าสู่ระบบ (US1)

ตรวจรหัสผ่านกับ TU REST API (`/api/v1/auth/Ad/verify`) แล้วออก token ของระบบเรา
และบันทึกหรืออัปเดตผู้ใช้ลงตาราง `users` (ถ้าบันทึกไม่ได้ login ยังผ่าน)

**Request**

```json
{ "username": "6609651234", "password": "********", "remember": false }
```

| field | ชนิด | บังคับ | กฎ |
|---|---|---|---|
| `username` | string | ใช่ | เลขทะเบียนหรืออีเมล TU ไม่เกิน 100 ตัวอักษร |
| `password` | string | ใช่ | ไม่เกิน 100 ตัวอักษร |
| `remember` | boolean | ไม่ | `true` = token อยู่ได้ 7 วัน |

**200 OK**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "student_id": "6609651234", "email": "xxx@dome.tu.ac.th", "name": "ชื่อ นามสกุล", "role": "student" }
}
```

frontend เก็บ `token` และ `user` ไว้ใน `localStorage` ชื่อ `token` และ `user`

**Error**

| Status | error |
|---|---|
| 400 | `ข้อมูลเข้าสู่ระบบไม่ถูกต้อง` + details (`กรุณากรอกเลขทะเบียนนักศึกษาหรืออีเมล`, `กรุณากรอกรหัสผ่าน`, `ข้อมูลยาวเกินไป`) |
| 401 | `เลขทะเบียนนักศึกษาหรือรหัสผ่านไม่ถูกต้อง` |
| 502 | `ไม่สามารถเชื่อมต่อระบบของมหาวิทยาลัยได้ กรุณาลองใหม่อีกครั้ง` (TU API ล่ม หรือ Application-Key ใช้ไม่ได้) |

> โหมดจำลอง: ถ้า `TU_API_KEY` ว่าง ระบบรับเฉพาะบัญชีทดสอบใน `MOCK_USERS` (รูปแบบ `รหัส:รหัสผ่าน[:สาขา]` คั่นด้วย `,`) เลขทะเบียนหรือรหัสผ่านไม่ตรงได้ 401 (US15) · ไม่ตั้ง `MOCK_USERS` = Login ไม่ได้ทุกบัญชี · ปิดอัตโนมัติเมื่อ `NODE_ENV=production`

---

### 🆕 Sprint 2: การตรวจเพิ่มตอน Login

| Status | error | เมื่อไหร่ | Test Case |
|---|---|---|---|
| 401 | `เลขทะเบียนนักศึกษาหรือรหัสผ่านไม่ถูกต้อง` | เลขทะเบียนหรือรหัสผ่านผิด ใช้ข้อความเดียวกันทุกกรณี (ไม่บอกว่าผิดช่องไหน) | US15 TC1–TC3 |
| 403 | `ระบบนี้สำหรับนักศึกษาสาขาวิทยาการคอมพิวเตอร์เท่านั้น` | รหัสผ่านถูก แต่ `department` จาก TU API ไม่ใช่สาขา CS และรหัสไม่อยู่ใน `ADMIN_IDS` | US14 TC1 |

- ลำดับการตรวจ: ตรวจรหัสผ่านก่อน → ถ้าผ่านจึงตรวจสาขา (คนที่รหัสผิดจะได้ 401 เสมอ ไม่รู้ว่าบัญชีนี้สาขาอะไร)
- เจ้าหน้าที่ใน `ADMIN_IDS` ไม่ต้องตรวจสาขา (US14 TC3)
- ชื่อสาขาที่ยอมรับตั้งใน `.env` `ALLOWED_DEPARTMENTS` (คั่นด้วย `,`) ⚠️ **ต้องยืนยันค่าจริงจาก TU API ก่อน** (Task52 / Task63)
- โหมดจำลอง (ไม่มี `TU_API_KEY`) รับเฉพาะบัญชีใน `MOCK_USERS` รูปแบบ `รหัส:รหัสผ่าน[:สาขา]` (Task82)
- ไม่บันทึกผู้ที่ถูกปฏิเสธลงตาราง `users` และไม่ออก token

---

## GET /rooms — รายการห้อง (US2)

คืนเฉพาะห้องที่ `is_active = TRUE` เรียงตาม `room_id` (ตัวอย่างด้านล่าง ค่าจริงมาจากตาราง `room`)

**200 OK**

```json
[
  { "room_id": 101, "room_name": "ห้องที่ 1", "capacity": 8, "location": "LC4 ชั้น 1" },
  { "room_id": 102, "room_name": "ห้องที่ 2", "capacity": 8, "location": "LC4 ชั้น 1" },
  { "room_id": 103, "room_name": "ห้องที่ 3", "capacity": 8, "location": "LC4 ชั้น 1" }
]
```

---

## GET /booking?date=YYYY-MM-DD — ช่วงเวลาที่ถูกจอง (US2)

ใช้วาดตาราง real-time และตารางรายสัปดาห์ คืนเฉพาะการจองสถานะ `BOOKED` และ `CONFIRMED`
ไม่แสดงว่าใครเป็นคนจอง frontend เรียกซ้ำทุก 30 วินาที

**200 OK**

```json
[
  { "room_id": 101, "start_time": "10:00", "end_time": "12:00", "status": "BOOKED" },
  { "room_id": 102, "start_time": "13:00", "end_time": "14:00", "status": "CONFIRMED" }
]
```

ช่องเวลา `slot` ของห้องถือว่าไม่ว่างถ้ามีรายการที่ `start_time <= slot < end_time`

**Error**

| Status | error |
|---|---|
| 400 | `ต้องระบุ date ในรูปแบบ YYYY-MM-DD` |

---

## POST /booking — จองห้อง (US3, US7)

**Request** (ต้อง login)

```json
{ "room_id": 101, "people": 4, "booking_date": "2026-10-20", "start_time": "13:00", "end_time": "15:00" }
```

| field | ชนิด | บังคับ | กฎ |
|---|---|---|---|
| `room_id` | integer | ใช่ | ต้องมีในตาราง `room` และ `is_active = TRUE` |
| `people` | integer | ใช่ | ตั้งแต่ 1 และไม่เกิน `capacity` ของห้อง (ไม่ได้บันทึกลง DB) |
| `booking_date` | string | ใช่ | `YYYY-MM-DD` และเป็นวันที่มีอยู่จริง |
| `start_time` | string | ใช่ | เต็มชั่วโมง `HH:00` ไม่ก่อน 09:00 และต้องยังไม่ถึงเวลานั้น |
| `end_time` | string | ใช่ | เต็มชั่วโมง หลัง `start_time` ไม่เกิน 17:00 และรวมไม่เกิน 3 ชั่วโมง |

ขั้นตอนใน backend (ทำใน transaction เดียว):

1. ตรวจข้อมูลตามตาราง
2. `SELECT ... FROM room ... FOR UPDATE` ล็อกห้องไว้ กันสองคนจองช่วงเดียวกันพร้อมกัน
3. เช็กว่าไม่มีการจอง `BOOKED` / `CONFIRMED` ที่เวลาทับ (`start < end_ใหม่ AND end > start_ใหม่`) เวลาติดกันพอดีจองได้
4. `INSERT` สถานะ `BOOKED` แล้ว `COMMIT`
5. ส่งอีเมลยืนยันไปที่ `email` ใน token และบันทึกผลลง `email_logs` (`BOOKING_CONFIRMED`) ถ้าส่งไม่สำเร็จ การจองยังสำเร็จ

**201 Created**

```json
{
  "booking_id": 15,
  "student_id": "6609651234",
  "room_id": 101,
  "room_name": "ห้องที่ 1",
  "booking_date": "2026-10-20",
  "start_time": "13:00",
  "end_time": "15:00",
  "status": "BOOKED",
  "created_at": "2026-10-19T06:12:45.000Z"
}
```

**Error**

| Status | error | ตัวอย่าง details |
|---|---|---|
| 400 | `ข้อมูลการจองไม่ถูกต้อง` | `room_id ต้องเป็นตัวเลข`, `จำนวนผู้เข้าใช้ต้องเป็นจำนวนเต็มตั้งแต่ 1 คนขึ้นไป`, `วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD`, `เวลาเริ่มต้องเป็นเวลาเต็มชั่วโมง เช่น 09:00`, `จองได้เฉพาะช่วง 09:00 - 17:00 น.`, `เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น`, `จองได้ครั้งละไม่เกิน 3 ชั่วโมง`, `ไม่สามารถจองเวลาที่ผ่านมาแล้ว` |
| 400 | `ห้องนี้รองรับได้สูงสุด 8 คน` | - |
| 401 | `กรุณาเข้าสู่ระบบ` / `Token ไม่ถูกต้องหรือหมดอายุ` | - |
| 404 | `ไม่พบห้องนี้ หรือห้องปิดใช้งาน` | - |
| 409 | `ช่วงเวลานี้ถูกจองแล้ว` | - |

---

### 🆕 Sprint 2: สถานะอีเมลใน response (US5 TC3 · Task70)

`POST /booking` **รอผลการส่งอีเมลยืนยัน** (ไม่เกิน 10 วินาที) แล้วตอบสถานะกลับมาในฟิลด์ `email_status` เพื่อให้หน้าเว็บแจ้งผู้ใช้
การจองถูก `COMMIT` ก่อนส่งอีเมลเสมอ ถ้าส่งไม่ได้ การจองยังสำเร็จ (201)

```json
{ "booking_id": 15, "status": "BOOKED", "...": "...", "email_status": "FAILED" }
```

| `email_status` | ความหมาย | หน้าเว็บแสดง |
|---|---|---|
| `SENT` | ส่งสำเร็จ | "จองสำเร็จ" ตามปกติ (US5 TC1) |
| `FAILED` | SMTP ส่งไม่สำเร็จ หรือเกิน 10 วินาที | **"จองสำเร็จ แต่ส่งอีเมลยืนยันไม่สำเร็จ"** (US5 TC3) |
| `SKIPPED` | ไม่ได้ตั้ง SMTP หรือไม่มีอีเมลผู้รับ | "จองสำเร็จ" ตามปกติ (ใช้ตอนพัฒนา) |

### 🆕 Sprint 2: ผู้ถูกระงับสิทธิ์จองไม่ได้ (US10 TC2)

| Status | error | เมื่อไหร่ |
|---|---|---|
| 403 | `คุณถูกระงับสิทธิ์การจองถึงวันที่ 21 พ.ย. 2569` | ผู้ใช้อยู่ใน `blacklist` และวันนี้ยังไม่เกิน `end_date` (วันที่ในข้อความเป็นวันสิ้นสุดจริง รูปแบบไทย) |

- ตรวจทั้ง `POST /booking` (จองใหม่) และ `PATCH /booking/:id` (แก้ไข) เพื่อกันการย้ายการจองเดิมไปช่วงใหม่ระหว่างถูกระงับ
- การจองที่จองไว้ก่อนถูกระงับยังอยู่ ไม่ถูกยกเลิกอัตโนมัติ (ยกเลิกเองได้ตามปกติ)
- ผู้ที่ No-show 2 ครั้งยังจองได้ (US10 TC4) · พ้นวันสิ้นสุดแล้วจองได้ตามปกติ (US10 TC3)

### 🆕 Sprint 2: เวลาทำการ 09:00–16:00

ตามมติประชุม Sprint 2 (Task64): เวลาเริ่ม 09:00–15:00 และเวลาสิ้นสุดไม่เกิน 16:00 · ข้อความ error เปลี่ยนเป็น `จองได้เฉพาะช่วง 09:00 - 16:00 น.` (ใช้กับ `POST /booking` และ `PATCH /booking/:id`)

---

## GET /booking/me — ประวัติการจองของตัวเอง (US4)

คืนการจองทุกสถานะของผู้ใช้ที่ login อยู่ เรียงจากวันล่าสุด

**200 OK**

```json
[
  {
    "booking_id": 15,
    "room_id": 101,
    "room_name": "ห้องที่ 1",
    "booking_date": "2026-10-20",
    "start_time": "13:00",
    "end_time": "15:00",
    "status": "BOOKED",
    "created_at": "2026-10-19T06:12:45.000Z"
  }
]
```

หน้าประวัติการจองจัดกลุ่มสถานะแบบนี้:

| แท็บ | เงื่อนไข |
|---|---|
| กำลังจะมาถึง (Upcoming) | `BOOKED` / `CONFIRMED` และยังไม่ถึงเวลาเริ่ม (มีปุ่มยกเลิก) |
| เสร็จสิ้น (Completed) | `EXPIRED` หรือถึงเวลาเริ่มแล้ว |
| ยกเลิกแล้ว (Cancelled) | `CANCELLED` |

---

## PATCH /booking/:id/cancel — ยกเลิกการจอง (US4, US5)

ไม่ต้องมี body เปลี่ยนสถานะเป็น `CANCELLED` แทนการลบ เพื่อเก็บประวัติไว้
ช่วงเวลานั้นจะกลับมาว่างให้คนอื่นจองได้ทันที

ขั้นตอนใน backend (transaction เดียว):

1. `SELECT ... FOR UPDATE` ล็อกแถวการจอง กันการยกเลิกซ้อนกัน
2. ตรวจว่าเป็นเจ้าของ ยังไม่ถูกยกเลิก ไม่หมดอายุ และยังไม่ถึงเวลาเริ่ม
3. `UPDATE ... SET status = 'CANCELLED'` แล้ว `COMMIT`
4. ส่งอีเมลยืนยันการยกเลิก และบันทึกผลลง `email_logs` (`BOOKING_CANCELLED`) ถ้าส่งไม่สำเร็จ การยกเลิกยังสำเร็จ

**200 OK**

```json
{
  "message": "ยกเลิกการจองสำเร็จ",
  "booking": {
    "booking_id": 15,
    "student_id": "6609651234",
    "room_id": 101,
    "room_name": "ห้องที่ 1",
    "booking_date": "2026-10-20",
    "start_time": "13:00",
    "end_time": "15:00",
    "status": "CANCELLED"
  }
}
```

**Error**

| Status | error |
|---|---|
| 400 | `รหัสการจองไม่ถูกต้อง` (`:id` ไม่ใช่จำนวนเต็มบวก) |
| 400 | `ยกเลิกได้ก่อนเวลาเริ่มอย่างน้อย 30 นาที` (US4 TC4) |
| 401 | `กรุณาเข้าสู่ระบบ` / `Token ไม่ถูกต้องหรือหมดอายุ` |
| 403 | `ยกเลิกได้เฉพาะการจองของตัวเองเท่านั้น` |
| 404 | `ไม่พบการจองนี้` |
| 409 | `การจองนี้ถูกยกเลิกไปแล้ว` |
| 409 | `การจองนี้หมดอายุแล้ว` |

---

## 🆕 PATCH /booking/:id — แก้ไขการจอง (US6)

> โค้ดอยู่ใน PR #20 (Task64) — spec นี้เขียนตามโค้ดที่รีวิวแล้ว

ส่งเฉพาะค่าที่ต้องการเปลี่ยน ค่าที่ไม่ส่งใช้ของเดิม แล้วตรวจกฎเดียวกับ `POST /booking` ทั้งหมด (ว่าง, 09:00–16:00, ไม่เกิน 3 ชม., ไม่เกิน 7 วัน, ไม่ใช่เวลาที่ผ่านแล้ว, ไม่เกินความจุห้อง)

```http
PATCH /booking/15
Authorization: Bearer <token>
Content-Type: application/json

{ "start_time": "13:00", "end_time": "15:00" }
```

| ฟิลด์ (ไม่บังคับทุกตัว) | กฎ |
|---|---|
| `room_id` | ห้องที่เปิดใช้งาน |
| `booking_date` | `YYYY-MM-DD` |
| `start_time`, `end_time` | `HH:00` |
| `people` | 1 ถึงความจุห้อง |
| `purpose` | ไม่เกิน 255 ตัวอักษร |

ขั้นตอนใน backend (transaction เดียว): ล็อกการจอง → ตรวจเจ้าของ/สถานะ/30 นาที → ตรวจกฎ → ล็อกห้องใหม่ → ตรวจชน (ไม่นับการจองของตัวเอง) → `UPDATE` → `COMMIT` → ส่งอีเมล `BOOKING_UPDATED`
ช่วงเวลาเดิมว่างทันทีหลัง `COMMIT` (US6 TC1) · ถ้าไม่ผ่านข้อใด การจองเดิมไม่เปลี่ยน (US6 TC2)

**200 OK**

```json
{
  "message": "แก้ไขการจองสำเร็จ",
  "booking": { "booking_id": 15, "room_id": 101, "room_name": "Room A", "booking_date": "2026-10-22", "start_time": "13:00", "end_time": "15:00", "people": 3, "purpose": "Group Study", "status": "BOOKED" },
  "previous": { "room_id": 101, "room_name": "Room A", "booking_date": "2026-10-22", "start_time": "10:00", "end_time": "12:00" }
}
```

**Error**

| Status | error | Test Case |
|---|---|---|
| 400 | `ข้อมูลการจองไม่ถูกต้อง` + details เช่น `จองได้ครั้งละไม่เกิน 3 ชั่วโมง`, `จองได้เฉพาะช่วง 09:00 - 16:00 น.` | US6 TC3 |
| 400 | `แก้ไขได้ก่อนเวลาเริ่มอย่างน้อย 30 นาที` | US6 TC4 |
| 400 | `ไม่มีข้อมูลการจองที่เปลี่ยนแปลง` | ส่งค่าเดิมทั้งหมด |
| 400 | `รหัสการจองไม่ถูกต้อง` | |
| 403 | `แก้ไขได้เฉพาะการจองของตัวเองเท่านั้น` | |
| 403 | `คุณถูกระงับสิทธิ์การจองถึงวันที่ ...` | US10 |
| 404 | `ไม่พบการจองนี้` / `ไม่พบห้องนี้ หรือห้องปิดใช้งาน` | |
| 409 | `ช่วงเวลานี้ถูกจองแล้ว` | US6 TC2 |
| 409 | `การจองนี้ถูกยกเลิกไปแล้ว` / `การจองนี้หมดอายุแล้ว` | |

---

## 🆕 POST /booking/:id/checkin — ยืนยันการเข้าใช้งาน (US8)

หน้าเว็บขอตำแหน่งด้วย Geolocation API ของเบราว์เซอร์ แล้วส่งพิกัดมา **backend เป็นผู้คำนวณระยะ** (ไม่เชื่อค่าระยะจากหน้าเว็บ)

```http
POST /booking/15/checkin
Authorization: Bearer <token>
Content-Type: application/json

{ "latitude": 14.0722, "longitude": 100.6050, "accuracy": 8 }
```

| ฟิลด์ | กฎ |
|---|---|
| `latitude` | ตัวเลข -90 ถึง 90 (บังคับ) |
| `longitude` | ตัวเลข -180 ถึง 180 (บังคับ) |
| `accuracy` | ความคลาดเคลื่อนเป็นเมตรจาก GPS (ไม่บังคับ เก็บไว้ดูย้อนหลัง ไม่ใช้ตัดสิน) |

กฎ (ตามกติกากลางที่ PO ยืนยัน):
- ระยะเส้นตรง (สูตร Haversine) จากพิกัดห้อง (`room.latitude`, `room.longitude`) ต้อง **ไม่เกิน 5 เมตร** (`CHECKIN_RADIUS_M=5`)
- กดได้ตั้งแต่ **10 นาทีก่อน** ถึง **15 นาทีหลัง** เวลาเริ่ม เช่น จอง 10:00 → 09:50–10:15
- สถานะต้องเป็น `BOOKED` · สำเร็จแล้วเปลี่ยนเป็น `CONFIRMED` และบันทึก `confirmed_at`
- การจองที่ `CONFIRMED` แล้วยกเลิกและแก้ไขไม่ได้

**200 OK**

```json
{ "message": "ยืนยันการเข้าใช้งานสำเร็จ", "booking": { "booking_id": 15, "status": "CONFIRMED", "confirmed_at": "2026-10-22T03:05:00.000Z" }, "distance_m": 3.2 }
```

**Error**

| Status | error | Test Case |
|---|---|---|
| 400 | `คุณอยู่นอกระยะ 5 เมตรจากห้องที่จอง` + `details: ["ระยะประมาณ 50 เมตร"]` | US8 TC2 |
| 400 | `กรุณาอนุญาตการเข้าถึงตำแหน่งเพื่อยืนยันการเข้าใช้งาน` (ไม่ส่งพิกัด หรือพิกัดไม่ถูกต้อง) | US8 TC3 (หน้าเว็บแสดงข้อความเดียวกันเองเมื่อผู้ใช้กดปฏิเสธ โดยไม่ต้องยิง API) |
| 400 | `ยืนยันการเข้าใช้งานได้ตั้งแต่ 09:50` (เวลา = เวลาเริ่ม − 10 นาที) | US8 TC5 |
| 409 | `เลยเวลายืนยันการเข้าใช้งานแล้ว` (เลย 15 นาที หรือสถานะเป็น `EXPIRED`) | US8 TC4 |
| 409 | `ยืนยันการเข้าใช้งานไปแล้ว` (สถานะเป็น `CONFIRMED`) | |
| 409 | `การจองนี้ถูกยกเลิกไปแล้ว` | |
| 403 | `ยืนยันได้เฉพาะการจองของตัวเองเท่านั้น` | |
| 404 | `ไม่พบการจองนี้` | |
| 500 | `ยังไม่ได้ตั้งพิกัดของห้องนี้` (ห้องไม่มี latitude/longitude) | |

---

## 🆕 GET /users/me/status — จำนวน No-show และสถานะระงับสิทธิ์ (US9, US10)

ใช้แสดงในหน้า "การจองของฉัน" (US9 TC4) และใช้ซ่อนปุ่มจองเมื่อถูกระงับสิทธิ์

```http
GET /users/me/status
Authorization: Bearer <token>
```

**200 OK**

```json
{
  "student_id": "6809650010",
  "semester": { "start": "2026-08-10", "end": "2026-12-11" },
  "no_show_count": 1,
  "no_show_limit": 3,
  "banned": false,
  "banned_until": null
}
```

- `no_show_count` นับการจองของผู้ใช้ที่เป็น `EXPIRED` และไม่มี `confirmed_at` โดย `booking_date` อยู่ในภาคการศึกษาปัจจุบัน (`SEMESTER_START`–`SEMESTER_END` ใน `.env`)
- ถูกระงับสิทธิ์: `"banned": true, "banned_until": "2026-11-21"` (ระงับถึงสิ้นวันนั้น)
- หน้าเว็บแสดง `No-show ภาคการศึกษานี้: 1 / 3 ครั้ง` (US9 TC4)

| Status | error |
|---|---|
| 401 | `กรุณาเข้าสู่ระบบ` |

---

## GET /admin/bookings — เจ้าหน้าที่ดูการจองทั้งหมด (US7)

ต้อง login และ role เป็น `admin` ทุก query parameter ไม่บังคับ ใช้รวมกันได้

| parameter | กฎ | ตัวอย่าง |
|---|---|---|
| `student_id` | ไม่เกิน 50 ตัวอักษร | `6609651234` |
| `status` | `BOOKED`, `CONFIRMED`, `CANCELLED`, `EXPIRED` (ตัวพิมพ์เล็กได้) | `cancelled` |
| `date` | `YYYY-MM-DD` | `2026-10-20` |
| `room_id` 🆕 | จำนวนเต็มบวก (US7 TC3) | `101` |
| `date_from`, `date_to` 🆕 | `YYYY-MM-DD` ใช้แทน `date` เมื่อดูเป็นช่วง | `2026-10-20` |
| `order` 🆕 | `asc` (เก่า→ใหม่) หรือ `desc` (ใหม่→เก่า) ค่าเริ่มต้น `desc` | `asc` |
| `limit` | 1 - 1000 ค่าเริ่มต้น 200 | `50` |

```http
GET /admin/bookings?date=2026-10-20&status=BOOKED
Authorization: Bearer <token ของ admin>
```

**200 OK**

```json
{
  "count": 1,
  "bookings": [
    {
      "booking_id": 15,
      "student_id": "6609651234",
      "room_id": 101,
      "room_name": "ห้องที่ 1",
      "booking_date": "2026-10-20",
      "start_time": "13:00",
      "end_time": "15:00",
      "people": 3,
      "purpose": "Group Study",
      "status": "BOOKED",
      "created_at": "2026-10-19T06:12:45.000Z",
      "confirmed_at": null
    }
  ]
}
```

**Error**

| Status | error |
|---|---|
| 400 | `เงื่อนไขการค้นหาไม่ถูกต้อง` + details (`status ต้องเป็น BOOKED, CONFIRMED, CANCELLED, EXPIRED`, `date ต้องอยู่ในรูปแบบ YYYY-MM-DD`, `limit ต้องเป็นตัวเลข 1-1000`, `student_id ยาวเกินไป`) |
| 401 | `กรุณาเข้าสู่ระบบ` |
| 403 | `เฉพาะเจ้าหน้าที่เท่านั้น` |

---

### 🆕 Sprint 2 (US7)
- เพิ่ม `room_id`, `date_from`, `date_to`, `order` และคืน `people`, `purpose` ในแต่ละรายการ
- details ของ error เพิ่ม: `room_id ต้องเป็นตัวเลข`, `date_from ต้องไม่หลัง date_to`
- นักศึกษาเรียก `/admin/*` ได้ 403 `เฉพาะเจ้าหน้าที่เท่านั้น` หน้าเว็บพากลับหน้าหลัก (US7 TC4)
- เมนู "จัดการการจอง" แสดงเมื่อ `user.role === "admin"` จาก response ของ `POST /login` (US7 TC5)

---

## 🆕 GET /admin/reports/summary — รายงานสรุป (US7 TC6)

ต้อง login และ role เป็น `admin` นับจากตาราง `booking` จัดกลุ่มตามวันและห้อง

| parameter | กฎ | ค่าเริ่มต้น |
|---|---|---|
| `date_from` | `YYYY-MM-DD` | 6 วันก่อนวันนี้ |
| `date_to` | `YYYY-MM-DD` ไม่ก่อน `date_from` และช่วงไม่เกิน 93 วัน | วันนี้ |
| `room_id` | จำนวนเต็มบวก (ไม่ส่ง = ทุกห้อง) | - |

```http
GET /admin/reports/summary?date_from=2026-10-22&date_to=2026-10-22&room_id=101
Authorization: Bearer <token ของ admin>
```

**200 OK**

```json
{
  "date_from": "2026-10-22",
  "date_to": "2026-10-22",
  "rows": [
    { "booking_date": "2026-10-22", "room_id": 101, "room_name": "Room A", "total": 3, "booked": 0, "confirmed": 1, "cancelled": 1, "no_show": 1 }
  ],
  "totals": { "total": 3, "booked": 0, "confirmed": 1, "cancelled": 1, "no_show": 1 }
}
```

- `total` = การจองทั้งหมดที่สร้าง (ทุกสถานะ) · `no_show` = `EXPIRED` ที่ไม่มี `confirmed_at`
- วัน/ห้องที่ไม่มีการจองไม่แสดงในรายการ

| Status | error |
|---|---|
| 400 | `เงื่อนไขการค้นหาไม่ถูกต้อง` + details (`date_from ต้องอยู่ในรูปแบบ YYYY-MM-DD`, `date_from ต้องไม่หลัง date_to`, `ช่วงวันที่ต้องไม่เกิน 93 วัน`, `room_id ต้องเป็นตัวเลข`) |
| 401 | `กรุณาเข้าสู่ระบบ` |
| 403 | `เฉพาะเจ้าหน้าที่เท่านั้น` |
---

## 🆕 GET /admin/blacklist — รายชื่อผู้ถูกระงับสิทธิ์ (US13 · Task87)

ต้อง login และ role เป็น `admin` แสดงเฉพาะรายการที่ยังมีผล (`end_date` ไม่ก่อนวันนี้ และยังไม่ถูกปลด) เรียงตามวันสิ้นสุด

```http
GET /admin/blacklist
Authorization: Bearer <token ของ admin>
```

**200 OK**

```json
{
  "rows": [
    {
      "blacklist_id": 1,
      "student_id": "6809650010",
      "name": "นักศึกษาทดสอบ",
      "start_date": "2026-11-11",
      "end_date": "2026-12-11",
      "reason": "No-show ครบ 3 ครั้ง"
    }
  ],
  "count": 1
}
```

| Status | กรณี |
|---|---|
| 401 | ไม่ได้ login |
| 403 | ไม่ใช่ admin |

---

## 🆕 POST /admin/blacklist/:id/lift — ปลดระงับสิทธิ์ก่อนกำหนด (US13 · Task87)

ต้อง login และ role เป็น `admin` ไม่ต้องมี body บันทึกผู้ปลด (`lifted_by`) และเวลา (`lifted_at`) ลงตาราง `blacklist` นักศึกษาจองได้ทันทีหลังปลด

```http
POST /admin/blacklist/1/lift
Authorization: Bearer <token ของ admin>
```

**200 OK**

```json
{
  "blacklist_id": 1,
  "student_id": "6809650010",
  "start_date": "2026-11-11",
  "end_date": "2026-12-11",
  "reason": "No-show ครบ 3 ครั้ง",
  "lifted_at": "2026-11-12T03:15:00.000Z",
  "lifted_by": "admin01"
}
```

| Status | กรณี |
|---|---|
| 400 | `:id` ไม่ใช่ตัวเลขที่ถูกต้อง |
| 401 | ไม่ได้ login |
| 403 | ไม่ใช่ admin |
| 404 | ไม่พบรายการระงับสิทธิ์นี้ |
| 409 | รายการนี้ถูกปลดแล้วหรือหมดอายุแล้ว |
---

## 🆕 งานอัตโนมัติ: No-show และระงับสิทธิ์ (US9, US10)

ไม่ใช่ endpoint เป็นตัวตั้งเวลาใน backend (`noShowService.js` · Task67) เริ่มทำงานพร้อม server

| ค่าใน `.env` | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `NO_SHOW_CHECK_INTERVAL_MS` | `60000` | ตรวจทุก 1 นาที (`0` = ปิด ใช้ตอน test) |
| `NO_SHOW_GRACE_MIN` | `15` | ไม่ Check-in ภายในกี่นาทีหลังเวลาเริ่ม |
| `NO_SHOW_LIMIT` | `3` | ครบกี่ครั้งในภาคการศึกษาจึงระงับสิทธิ์ |
| `BAN_DAYS` | `30` | ระงับกี่วัน (`end_date` = วันที่ครบ + 30 วัน) |
| `SEMESTER_START`, `SEMESTER_END` | - | ช่วงภาคการศึกษาปัจจุบัน `YYYY-MM-DD` |

ทุกครั้งที่รัน (transaction เดียว):
1. หาการจอง `BOOKED` ที่ `booking_date + start_time + 15 นาที` ≤ ตอนนี้ แล้วเปลี่ยนเป็น `EXPIRED` (US9 TC1) · การจองที่ `CONFIRMED` หรือ `CANCELLED` ไม่ถูกแตะ (US9 TC2, TC3)
2. **คืนช่วงเวลาที่เหลือ** โดยไม่ต้องแก้ข้อมูลเพิ่ม: ตารางสถานะ (`GET /booking?date=`) และการตรวจจองชน นับเฉพาะ `BOOKED`/`CONFIRMED` พอเปลี่ยนเป็น `EXPIRED` ช่วงที่เหลือจึงว่างทันที และยังเก็บเวลาเดิมไว้เป็นประวัติ เช่น จอง 10:00–12:00 ตรวจเจอ 10:15 → ช่วง 11:00–12:00 จองได้ (เวลาที่ผ่านไปแล้วจองไม่ได้อยู่แล้ว) (US9 TC1) · *ปรับจาก spec เดิมที่แก้ `end_time` ใน Task67*
3. นับ No-show ของผู้ใช้คนนั้นในภาคการศึกษา ถ้าถึง `NO_SHOW_LIMIT` และยังไม่ถูกระงับ → เพิ่มแถวใน `blacklist` (`end_date` = วันนี้ + 30 วัน เช่น ครบวันที่ 22 ต.ค. → ระงับถึงสิ้นวันที่ 21 พ.ย.) และส่งอีเมล `ACCOUNT_SUSPENDED` (US10 TC1)

ตารางใหม่ (ไฟล์ migration `database/003_sprint2.sql`):

```sql
ALTER TABLE room ADD COLUMN latitude DOUBLE PRECISION, ADD COLUMN longitude DOUBLE PRECISION;   -- US8
CREATE TABLE blacklist (                                                                       -- US10
    blacklist_id BIGSERIAL PRIMARY KEY,
    student_id   VARCHAR(50) NOT NULL REFERENCES users(student_id),
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL CHECK (end_date >= start_date),
    reason       VARCHAR(255) NOT NULL DEFAULT 'No-show ครบ 3 ครั้งในภาคการศึกษา',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE booking DROP CONSTRAINT IF EXISTS booking_end_time_check;                           -- เวลาปิด 16:00 (Task64)
ALTER TABLE booking ADD CONSTRAINT booking_end_time_check CHECK (end_time <= TIME '16:00');
```

> ชื่อ constraint เดิมให้ตรวจด้วย `\d booking` ใน psql ก่อนรัน · การจองเดิมที่จบหลัง 16:00 ต้องจัดการก่อนเพิ่ม CHECK

---

## อีเมลอัตโนมัติ (US5)

| เหตุการณ์ | หัวเรื่อง | `email_logs.email_type` |
|---|---|---|
| จองสำเร็จ | `ยืนยันการจองห้อง <ห้อง> <วันที่> <เวลา>` | `BOOKING_CONFIRMED` |
| ยกเลิกสำเร็จ | `ยกเลิกการจองห้อง <ห้อง> <วันที่> <เวลา> เรียบร้อยแล้ว` | `BOOKING_CANCELLED` |
| 🆕 แก้ไขการจอง (US6) | `[CS Co-Working] แก้ไขการจอง <ห้อง (รหัส)> <วันที่> <เวลา>` | `BOOKING_UPDATED` |
| 🆕 ถูกระงับสิทธิ์ (US10) | `[CS Co-Working] ระงับสิทธิ์การจองถึงวันที่ <วันที่>` | `ACCOUNT_SUSPENDED` |

ผลการส่งบันทึกใน `email_logs.status`:

| status | ความหมาย |
|---|---|
| `SENT` | ส่งสำเร็จ |
| `FAILED` | SMTP ส่งไม่สำเร็จ (`error_message` มีสาเหตุ) |
| `SKIPPED` | ไม่ได้ส่ง: `no-recipient` (token ไม่มีอีเมล) หรือ `smtp-not-configured` (ยังไม่ตั้ง `SMTP_HOST` ระบบแสดงเนื้อหาใน terminal แทน) |

## CORS

อนุญาตเฉพาะ origin ที่อยู่ใน `CORS_ORIGIN` (คั่นด้วย `,`) เช่น Live Server `http://127.0.0.1:5500`
Method ที่อนุญาต: `GET, POST, PATCH, OPTIONS` Header: `Content-Type, Authorization`

## สถานะการจอง

```
BOOKED ──(ยกเลิกก่อนเวลาเริ่ม ≥ 30 นาที · US4)──▶ CANCELLED
   │  └─(แก้ไขก่อนเวลาเริ่ม ≥ 30 นาที · US6 สถานะยังเป็น BOOKED)
   ├──(Check-in ภายใน 5 ม. ช่วง -10 ถึง +15 นาที · US8)──▶ CONFIRMED
   └──(ไม่ Check-in ภายใน 15 นาที · ตัวตรวจ No-show US9)──▶ EXPIRED ──▶ (ครบ 3 ครั้ง · US10) blacklist 30 วัน
```

🆕 Sprint 2: Logout (US11) ไม่มี endpoint เพราะ token เป็น JWT ที่ server ไม่ได้เก็บ หน้าเว็บลบ token และข้อมูลผู้ใช้ออกจาก `localStorage` แล้วพากลับหน้า Login

---

## เรื่องที่ทีมต้องตัดสินใจ (อัปเดต Sprint 2)

เรื่องจาก Sprint 1 ที่ปิดแล้ว: จำกัดจองล่วงหน้า 7 วัน ✓ · `people`/`purpose` บันทึกลง DB แล้ว ✓ · เวลาทำการตกลงเป็น 09:00–16:00 ✓ (Task64)

ยังค้าง:
1. **ชื่อสาขาจาก TU API (US14):** ต้องยืนยันค่า `department` จริงก่อนตั้ง `ALLOWED_DEPARTMENTS`
2. **พิกัดห้องจริง (US8):** ต้องวัดพิกัด Room A–C ที่ LC4 ชั้น 1 ใส่ใน seed · GPS ในอาคารอาจคลาดเคลื่อนเกิน 5 เมตร ต้องทดสอบที่ห้องจริง
3. **วันเริ่ม–สิ้นสุดภาคการศึกษา (US9, US10):** ตั้งค่า `SEMESTER_START`, `SEMESTER_END`
4. **ค่าใน `.env.example` บางตัวยังไม่ถูกใช้:** `FIRST_START_HOUR`, `LAST_START_HOUR`, `CLOSE_HOUR`, `MAX_HOURS_PER_BOOKING` โค้ดใช้ค่าคงที่ใน `bookingRules.js`
5. **Path ไม่ตรงกับ Trello:** Trello ใช้ `/api/...` แต่โค้ดจริงไม่มี `/api` นำหน้า (spec นี้ยึดโค้ดจริง)
