# API Specification — TU CS Space

ระบบจองห้อง Co-Working Space ภาควิชาวิทยาการคอมพิวเตอร์ มธ. (Task15)

| | |
|---|---|
| Base URL (เครื่องตัวเอง) | `http://localhost:3000` |
| รูปแบบข้อมูล | JSON (`Content-Type: application/json`) |
| เวลา | เวลาไทย (`TZ=Asia/Bangkok`) วันที่ `YYYY-MM-DD` เวลา `HH:MM` |
| Backend | Node.js 22 + Express 5 + PostgreSQL |
| อ้างอิงโค้ด | branch `feature/db-queries` (`backend/src/routes/*`) |

## สรุป Endpoint

| Method | Path | ต้อง login | สิทธิ์ | User Story | หน้าที่ |
|---|---|---|---|---|---|
| GET | `/health` | ไม่ | - | - | เช็กว่า server ทำงานอยู่ |
| POST | `/login` | ไม่ | - | US1 | เข้าสู่ระบบด้วยบัญชี TU รับ token |
| GET | `/rooms` | ไม่ | - | US2 | รายการห้องที่เปิดใช้งาน |
| GET | `/booking?date=` | ไม่ | - | US2 | ช่วงเวลาที่ถูกจองของวันนั้น (ตาราง real-time) |
| POST | `/booking` | ใช่ | student, admin | US3, US7 | จองห้อง + ส่งอีเมลยืนยัน |
| GET | `/booking/me` | ใช่ | student, admin | US4 | ประวัติการจองของตัวเอง |
| PATCH | `/booking/:id/cancel` | ใช่ | เจ้าของการจอง | US4, US7 | ยกเลิกการจอง + ส่งอีเมลยืนยันการยกเลิก |
| GET | `/admin/bookings` | ใช่ | admin | US5 | เจ้าหน้าที่ดูการจองทั้งหมด |

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
| 403 | `เฉพาะเจ้าหน้าที่เท่านั้น` | เรียก `/admin/*` โดย role ไม่ใช่ admin |

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

> โหมดจำลอง: ถ้า `TU_API_KEY` ว่าง ระบบรับรหัสผ่านอะไรก็ได้ ใช้ทดสอบเท่านั้น และปิดอัตโนมัติเมื่อ `NODE_ENV=production`

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
| 409 | `ช่วงเวลานี้มีผู้จองห้องนี้แล้ว` | - |

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

## PATCH /booking/:id/cancel — ยกเลิกการจอง (US4, US7)

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
| 400 | `ไม่สามารถยกเลิกการจองที่ถึงเวลาเริ่มแล้ว` |
| 401 | `กรุณาเข้าสู่ระบบ` / `Token ไม่ถูกต้องหรือหมดอายุ` |
| 403 | `ยกเลิกได้เฉพาะการจองของตัวเองเท่านั้น` |
| 404 | `ไม่พบการจองนี้` |
| 409 | `การจองนี้ถูกยกเลิกไปแล้ว` |
| 409 | `การจองนี้หมดอายุแล้ว` |

---

## GET /admin/bookings — เจ้าหน้าที่ดูการจองทั้งหมด (US5)

ต้อง login และ role เป็น `admin` ทุก query parameter ไม่บังคับ ใช้รวมกันได้

| parameter | กฎ | ตัวอย่าง |
|---|---|---|
| `student_id` | ไม่เกิน 50 ตัวอักษร | `6609651234` |
| `status` | `BOOKED`, `CONFIRMED`, `CANCELLED`, `EXPIRED` (ตัวพิมพ์เล็กได้) | `cancelled` |
| `date` | `YYYY-MM-DD` | `2026-10-20` |
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

## อีเมลอัตโนมัติ (US7)

| เหตุการณ์ | หัวเรื่อง | `email_logs.email_type` |
|---|---|---|
| จองสำเร็จ | `ยืนยันการจองห้อง <ห้อง> <วันที่> <เวลา>` | `BOOKING_CONFIRMED` |
| ยกเลิกสำเร็จ | `ยกเลิกการจองห้อง <ห้อง> <วันที่> <เวลา> เรียบร้อยแล้ว` | `BOOKING_CANCELLED` |

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
BOOKED ──(ยกเลิกก่อนเวลาเริ่ม)──▶ CANCELLED
   │
   ├──(ยืนยันการเข้าใช้)──▶ CONFIRMED     ← ยังไม่มี endpoint
   └──(ไม่ยืนยันตามเวลา)──▶ EXPIRED       ← ยังไม่มีระบบเปลี่ยนอัตโนมัติ
```

---

## เรื่องที่ทีมต้องตัดสินใจ

1. **ค่าใน `.env.example` ยังไม่ถูกใช้**: `FIRST_START_HOUR`, `LAST_START_HOUR`, `CLOSE_HOUR`, `MAX_HOURS_PER_BOOKING`, `BOOKING_DAYS_AHEAD` ไม่มีผลกับโค้ด เพราะ `bookings.js` เขียนค่า 09:00 / 17:00 / 3 ชั่วโมงไว้ตรง ๆ
2. **ยังไม่จำกัดวันล่วงหน้า**: ตอนนี้จองวันไหนในอนาคตก็ได้ ถ้ากติกาคือจองได้แค่วันนี้กับพรุ่งนี้ ต้องเพิ่มการตรวจใน `POST /booking`
3. **เวลาเริ่มล่าสุด**: หน้าเว็บเขียนว่าเปิด 09:00 - 16:00 แต่ backend ให้จองจบได้ถึง 17:00 (เริ่มได้ถึง 16:00)
4. **`people` และ `purpose` ไม่ได้บันทึกลง DB**: ตาราง `booking` ไม่มีคอลัมน์นี้ ถ้าต้องการให้เจ้าหน้าที่เห็น ต้องเพิ่มคอลัมน์
5. **Path ไม่ตรงกับ Trello**: Trello ใช้ `/api/...` แต่โค้ดจริงไม่มี `/api` นำหน้า
6. **ยังไม่มี endpoint** ยืนยันการเข้าใช้ห้อง (`CONFIRMED`) และระบบเปลี่ยนเป็น `EXPIRED`
7. **`database/seed.sql` ยังเป็นข้อมูลเก่า**: ใน repo ยังเป็น Room A/B/C จุ 4/6/8 คน ชั้น 2-3 แต่หน้าเว็บใช้ "ห้องที่ 1-3" จุ 8 คน ที่ LC4 ชั้น 1 ทีม Database ควรแก้ seed ให้ตรงกัน
