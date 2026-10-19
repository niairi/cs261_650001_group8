
# Database Guide – Working Space Booking System

เอกสารนี้อธิบายโครงสร้าง Database และแนวทางการทำงานที่เกี่ยวข้องกับ Database สำหรับ Backend Developer โดยเน้นให้เห็นว่าแต่ละข้อมูลใช้ทำอะไร และ Backend ควรนำข้อมูลไปตรวจสอบอย่างไร

---

## 1. โครงสร้าง Database

ระบบมี 4 ตารางหลัก

- `ROOM` → เก็บข้อมูลห้อง

- `BOOKING` → เก็บข้อมูลการจอง

- `USERS` → เก็บข้อมูลผู้ใช้งาน

- `EMAIL_LOGS` → เก็บประวัติการส่ง Email

---

### 1.1 ROOM

ใช้เก็บข้อมูลของแต่ละห้อง Working Space

| Column | รายละเอียด |

|---|---|

| `room_id` | รหัสประจำห้อง (Primary Key) |

| `room_name` | ชื่อห้อง |

| `capacity` | จำนวนคนที่ห้องรองรับได้ |

| `location` | ตำแหน่งของห้อง |

| `is_active` | ระบุว่าห้องเปิดให้ใช้งานอยู่หรือไม่ |

**ตัวอย่างข้อมูล**

| room_id | room_name | capacity | location | is_active |

|---:|---|---:|---|---|

| 101 | Room A | 4 | ชั้น 2 | TRUE |

| 102 | Room B | 6 | ชั้น 2 | TRUE |

| 103 | Room C | 8 | ชั้น 3 | TRUE |

ตัวอย่างการอ่านข้อมูล:

- `room_id = 101` คือ Room A

- Room A รองรับได้สูงสุด 4 คน

- `is_active = TRUE` หมายถึงห้องเปิดให้ใช้งานและสามารถนำไปใช้ในการจองได้

> `is_active` ใช้บอกว่าห้องเปิดใช้งานในระบบหรือไม่ ไม่ได้ใช้บอกว่าห้องว่างในช่วงเวลาหนึ่งหรือไม่

>

> Availability ของห้องจะคำนวณจากข้อมูลใน `BOOKING`

---

### 1.2 BOOKING

ใช้เก็บข้อมูลการจองแต่ละรายการ

| Column | รายละเอียด |

|---|---|

| `booking_id` | รหัสประจำรายการจอง (Primary Key) |

| `student_id` | รหัสผู้ใช้งานที่ทำการจอง (Foreign Key → `USERS`) |

| `room_id` | รหัสห้องที่จอง (Foreign Key → `ROOM`) |

| `booking_date` | วันที่ใช้ห้อง |

| `start_time` | เวลาเริ่มต้น |

| `end_time` | เวลาสิ้นสุด |

| `status` | สถานะของ Booking |

| `created_at` | วันที่และเวลาที่สร้าง Booking |

| `confirmed_at` | วันที่และเวลาที่ Student ยืนยันการเข้าใช้งานภายในระยะ 5 เมตร |

**ตัวอย่างข้อมูล**

| booking_id | student_id | room_id | booking_date | start_time | end_time | status |

|---:|---|---:|---|---|---|---|

| 1 | 650001 | 101 | 2026-10-20 | 09:00 | 11:00 | CONFIRMED |

| 2 | 650002 | 101 | 2026-10-20 | 13:00 | 15:00 | BOOKED |

| 3 | 650003 | 102 | 2026-10-20 | 10:00 | 12:00 | CANCELLED |

| 4 | 650004 | 103 | 2026-10-20 | 14:00 | 16:00 | EXPIRED |

ตัวอย่างการอ่านข้อมูล:

- `booking_id = 1` → Student `650001` จอง Room `101` เวลา 09:00–11:00 และยืนยันการเข้าใช้งานภายในระยะ 5 เมตรแล้ว

- `booking_id = 2` → Student `650002` จอง Room `101` เวลา 13:00–15:00 แต่ยังไม่ได้ยืนยันการเข้าใช้งาน

- `booking_id = 3` → Student `650003` จอง Room `102` แต่ยกเลิกก่อนยืนยัน

- `booking_id = 4` → Student `650004` จอง Room `103` แต่ไม่ได้ยืนยันภายในเวลาที่ระบบกำหนด

---

### 1.3 USERS

ใช้เก็บข้อมูลผู้ใช้งานที่ได้รับจาก TU Authentication API

| Column | รายละเอียด |

|---|---|

| `student_id` | รหัสผู้ใช้งาน (Primary Key) |

| `name_th` | ชื่อภาษาไทย |

| `name_en` | ชื่อภาษาอังกฤษ |

| `email` | Email ของผู้ใช้งาน |

| `type` | ประเภทผู้ใช้งาน เช่น `student` / `employee` |

| `department` | หน่วยงาน |

| `faculty` | คณะ |

| `role` | สิทธิ์ผู้ใช้งาน เช่น `student` / `admin` |

| `created_at` | วันที่และเวลาที่สร้างข้อมูล |

| `last_login_at` | วันที่และเวลาที่ Login ล่าสุด |

ข้อมูลใน `USERS` มาจากข้อมูลผู้ใช้งานที่ได้รับจาก TU Authentication API

ระบบไม่เก็บ Password ของ TU Account ใน Database ของระบบนี้

`student_id` ใช้เป็นตัวระบุผู้ใช้งาน และใช้เชื่อมโยงกับ `BOOKING`

---

### 1.4 EMAIL_LOGS

ใช้เก็บประวัติการส่ง Email ที่เกี่ยวข้องกับ Booking

| Column | รายละเอียด |

|---|---|

| `email_log_id` | รหัสประวัติการส่ง Email (Primary Key) |

| `booking_id` | รหัส Booking (Foreign Key → `BOOKING`) |

| `to_email` | Email ของผู้รับ |

| `email_type` | ประเภทของ Email เช่น `BOOKING_CONFIRMED` |

| `status` | สถานะการส่ง เช่น `SENT`, `FAILED`, `SKIPPED` |

| `error_message` | รายละเอียด Error กรณีส่งไม่สำเร็จ |

| `created_at` | วันที่และเวลาที่บันทึก Log |

`EMAIL_LOGS` ใช้สำหรับเก็บประวัติการส่ง Email เพื่อให้สามารถตรวจสอบย้อนหลังได้ว่าระบบพยายามส่ง Email ให้ Booking ใด และผลการส่งเป็นอย่างไร

---

## ความสัมพันธ์ระหว่าง ROOM และ BOOKING

ห้อง 1 ห้องสามารถมี Booking ได้ 0 หรือหลายรายการ

```text

ROOM 1 ─────────< BOOKING

```

เข้าใจง่าย ๆ คือ `room_id` ใน `BOOKING` ใช้บอกว่า Booking นั้นเป็นการจองห้องไหน

```text

ROOM

101 → Room A

102 → Room B

103 → Room C

        ↓

BOOKING

Booking 1 → room_id = 101 → Room A

Booking 2 → room_id = 101 → Room A

Booking 3 → room_id = 102 → Room B

Booking 4 → room_id = 103 → Room C

```

ดังนั้น Room A สามารถมีหลาย Booking ได้ แต่ Booking ที่อยู่ในช่วงเวลาเดียวกันจะไม่สามารถทับซ้อนกันได้

---

## 2. กฎของ Booking

### 2.1 เวลาเริ่มต้นที่สามารถเลือกได้

อ้างอิงจากการออกแบบหน้า UX/UI ระบบกำหนดเวลาเริ่มต้น (Start Time) ที่ผู้ใช้สามารถเลือกได้ 8 เวลา:

- 09:00

- 10:00

- 11:00

- 12:00

- 13:00

- 14:00

- 15:00

เวลาเหล่านี้เป็น **เวลาเริ่มต้นของการจอง (`start_time`)**

ตัวอย่าง:

```text

ผู้ใช้เลือก 09:00

→ start_time = 09:00

ผู้ใช้เลือก 13:00

→ start_time = 13:00

```

Database จะเก็บทั้ง `start_time` และ `end_time` เพื่อระบุช่วงเวลาที่จองจริง

ตัวอย่าง:

```text

start_time = 09:00

end_time   = 11:00

หมายถึงจองเวลา 09:00–11:00

```

### 2.2 ระยะเวลาการจอง

Booking 1 รายการสามารถจองได้ **ไม่เกิน 3 ชั่วโมง**

ตัวอย่าง:

```text

09:00–10:00  ✓  1 ชั่วโมง

09:00–11:00  ✓  2 ชั่วโมง

09:00–12:00  ✓  3 ชั่วโมง

09:00–13:00  ✗  4 ชั่วโมง

```

Database ตรวจสอบว่า:

```text

end_time > start_time

```

และระยะเวลาระหว่าง `start_time` กับ `end_time` ต้องไม่เกิน 3 ชั่วโมง

---

## 3. การสร้าง Booking (US3)

เมื่อ Student ต้องการจองห้อง Backend ควรตรวจสอบข้อมูลตามลำดับดังนี้

### Step 1: รับข้อมูลจาก Frontend

Backend รับข้อมูล:

```text

student_id

room_id

booking_date

start_time

end_time

```

### Step 2: ตรวจสอบว่าผู้ใช้งานมีอยู่ใน USERS

ตรวจสอบว่า student_id ที่ส่งมามีอยู่ใน USERS หรือไม่

ถ้าไม่มีผู้ใช้งาน → ไม่อนุญาตให้สร้าง Booking
ถ้ามีผู้ใช้งาน → ตรวจสอบขั้นตอนต่อไป
### Step 3: ตรวจสอบว่าห้องมีอยู่ในระบบ

ตรวจสอบว่า `room_id` ที่ส่งมามีอยู่ใน `ROOM` หรือไม่

- ถ้าไม่มีห้อง → ไม่อนุญาตให้สร้าง Booking

- ถ้ามีห้อง → ตรวจสอบขั้นตอนต่อไป

### Step 4: ตรวจสอบว่าห้องเปิดใช้งาน

ตรวจสอบว่า:

```text

is_active = TRUE

```

ถ้า `is_active = FALSE` → ไม่อนุญาตให้จองห้องนั้น

### Step 5: ตรวจสอบเวลา

ตรวจสอบว่า:

```text

end_time > start_time

```

และระยะเวลาการจองต้องไม่เกิน 3 ชั่วโมง

นอกจากนี้ `start_time` ต้องเป็นหนึ่งในเวลาที่ระบบกำหนด:

```text

09:00

10:00

11:00

12:00

13:00

14:00

15:00

16:00

```

### Step 6: ตรวจสอบเวลาทับซ้อน

ตรวจสอบว่า Room เดียวกัน ในวันที่เดียวกัน มี Booking ที่สถานะเป็น `BOOKED` หรือ `CONFIRMED` และช่วงเวลาทับกับ Booking ใหม่หรือไม่

- ถ้ามีช่วงเวลาทับกัน → ไม่อนุญาตให้จอง

- ถ้าไม่มีช่วงเวลาทับกัน → สามารถสร้าง Booking ได้

ตัวอย่าง:

```text

Booking เดิม

09:00–11:00  BOOKED

Booking ใหม่

10:00–12:00

ช่วงเวลา 10:00–11:00 ทับกัน

→ ไม่อนุญาตให้จอง

```

แต่ถ้า:

```text

Booking เดิม

09:00–11:00  CONFIRMED

Booking ใหม่

11:00–13:00

ช่วงเวลาไม่ทับกัน

→ สามารถจองได้

```

### Step 7: สร้าง Booking

เมื่อผ่านการตรวจสอบทั้งหมด ให้สร้างข้อมูลใน `BOOKING` โดยกำหนด:

```text

status = BOOKED

```

`BOOKED` หมายถึง Student สร้าง Booking สำเร็จแล้ว แต่ยังไม่ได้ยืนยันการเข้าใช้งานภายในระยะ 5 เมตร

---

## 4. การยืนยันการเข้าใช้งานภายในระยะ 5 เมตร

หลังจากสร้าง Booking แล้ว Student ต้องไปยังห้องที่จองและอยู่ภายในระยะ 5 เมตรเพื่อยืนยันการเข้าใช้งาน

เมื่อการยืนยันสำเร็จ:

```text

status = CONFIRMED

confirmed_at = เวลาที่ทำการยืนยัน

```

เมื่อ Booking เป็น `CONFIRMED` แล้ว จะไม่สามารถยกเลิก Booking ได้

### กรณีไม่ยืนยันภายในเวลาที่กำหนด

หาก Student ไม่ยืนยันภายในเวลาที่ระบบกำหนด:

```text

status = EXPIRED

```

`EXPIRED` หมายถึง Booking หมดสิทธิ์ใช้งานห้อง และจะไม่ถือว่าเป็น Booking ที่ใช้งานอยู่

ดังนั้น `EXPIRED` จะไม่ Block Room Availability

> ระยะเวลาที่ใช้ตัดสินว่า Booking จะเปลี่ยนเป็น `EXPIRED` ยังไม่ได้ระบุเป็นตัวเลขในเอกสารนี้ Backend ควรใช้ค่าตาม Requirement ที่ทีมตกลงกัน

---

## 5. การตรวจสอบห้องว่าง (US2)

Frontend ต้องสามารถแสดงได้ว่าห้องในช่วงเวลาที่ผู้ใช้เลือกเป็น:

```text

AVAILABLE

```

หรือ

```text

UNAVAILABLE

```

ไม่จำเป็นต้องเพิ่ม `room_status` ในตาราง `ROOM`

Backend สามารถคำนวณ Availability จากข้อมูลใน `BOOKING`

### หลักการ

ถ้าพบ Booking ที่มีเงื่อนไขทั้งหมดต่อไปนี้:

```text

room_id เดียวกัน

booking_date เดียวกัน

status = BOOKED หรือ CONFIRMED

และช่วงเวลาทับซ้อนกัน

```

ให้ถือว่าช่วงเวลานั้น:

```text

UNAVAILABLE

```

ถ้าไม่พบ Booking ที่เข้าเงื่อนไขดังกล่าว:

```text

AVAILABLE

```

### กรณี Booking ถูกยกเลิกหรือหมดอายุ

`CANCELLED` และ `EXPIRED` ไม่ถือว่าเป็น Booking ที่ใช้งานอยู่

ดังนั้น Booking ที่เป็น `CANCELLED` หรือ `EXPIRED` จะไม่ Block Availability และช่วงเวลานั้นสามารถกลับมาให้ Student คนอื่นจองได้

ตัวอย่าง:

```text

Room 101

09:00–11:00  CANCELLED

→ AVAILABLE

11:00–13:00  BOOKED

→ UNAVAILABLE

13:00–15:00  EXPIRED

→ AVAILABLE

```

---

## 6. การยกเลิก Booking (US4)

เมื่อ Student ต้องการยกเลิก Booking Backend ต้องตรวจสอบ `status` ก่อน

### กรณีที่เป็น BOOKED

Student สามารถยกเลิกได้:

```text

BOOKED

   ↓

CANCELLED

```

ไม่ควรลบข้อมูล Booking ออกจาก Database เพราะต้องเก็บประวัติการจองไว้

ตัวอย่าง:

```sql

UPDATE booking

SET status = 'CANCELLED'

WHERE booking_id = ?;

```

หลังจากเปลี่ยนเป็น `CANCELLED` แล้ว Booking นี้จะไม่ถูกนำไปใช้ในการคำนวณว่า Room ไม่ว่าง

### กรณีที่เป็น CONFIRMED

ไม่อนุญาตให้ยกเลิก:

```text

CONFIRMED

   ↓

ไม่สามารถ CANCEL ได้

```

เพราะ `CONFIRMED` หมายถึง Student ได้ยืนยันการเข้าใช้งานภายในระยะ 5 เมตรแล้ว

### เหตุผลที่ไม่ลบข้อมูล Booking

- เก็บประวัติการจอง

- ให้เจ้าหน้าที่ดูข้อมูลย้อนหลังได้

- สามารถตรวจสอบ Booking ที่ถูกยกเลิกได้

---

## 7. การส่ง Email ยืนยันการจองสำเร็จ (US5)

หลังจาก Student สร้าง Booking สำเร็จ ระบบจะส่ง Email ยืนยันการจองไปยัง Email ของผู้ใช้งานโดยอัตโนมัติ

ข้อมูลสำคัญที่ใช้ใน Email ได้แก่

- Student ID
- Booking ID
- Room Name
- Location
- Booking Date
- Start Time
- End Time

### Flow ของ US5

```text
Student
   ↓
Create Booking
   ↓
Backend ตรวจสอบข้อมูลการจอง
   ↓
สร้างข้อมูลใน BOOKING
   ↓
ดึง Email จาก USERS
   ↓
ส่ง Confirmation Email
   ↓
บันทึกผลการส่ง Email ใน EMAIL_LOGS
```

เมื่อส่ง Email สำเร็จ ให้บันทึกผลใน `EMAIL_LOGS` ดังนี้:

```text
email_type = BOOKING_CONFIRMED
status = SENT
error_message = NULL
```

หากส่ง Email ไม่สำเร็จ:

```text
email_type = BOOKING_CONFIRMED
status = FAILED
error_message = รายละเอียดของ Error
```

Booking ที่สร้างสำเร็จยังคงอยู่ใน `BOOKING` แม้ว่าการส่ง Email จะไม่สำเร็จ เนื่องจาก Email เป็นการแจ้งเตือนหลังจากการสร้าง Booking

ข้อมูลผู้ใช้งานและ Email จะถูกเก็บไว้ใน `USERS` ซึ่งได้รับมาจาก TU Authentication API โดยระบบจะไม่เก็บ Password ของ TU Account ส่วน `EMAIL_LOGS` ใช้เก็บประวัติการส่ง Email เพื่อให้สามารถตรวจสอบย้อนหลังได้ว่า Email ของ Booking ใดถูกส่งไปยังผู้รับ และการส่งสำเร็จหรือไม่

## 8. สถานะของ Booking

ระบบมีสถานะ 4 ค่า:

| Status | ความหมาย | Block Availability? | ยกเลิกได้หรือไม่ |

|---|---|---|---|

| `BOOKED` | สร้าง Booking แล้ว แต่ยังไม่ Confirm | Yes | Yes |

| `CONFIRMED` | ยืนยันการเข้าใช้งานภายในระยะ 5 เมตรแล้ว | Yes | No |

| `CANCELLED` | ยกเลิกก่อน Confirm | No | No |

| `EXPIRED` | ไม่ได้ Confirm ภายในเวลาที่กำหนด | No | No |

### BOOKED

หมายถึง Student สร้าง Booking สำเร็จแล้ว แต่ยังไม่ได้ยืนยันการเข้าใช้งานภายในระยะ 5 เมตร

- Booking ยังมีผล

- ช่วงเวลานั้นยัง Block Room Availability

- สามารถยกเลิกได้

### CONFIRMED

หมายถึง Student อยู่ภายในระยะ 5 เมตรและยืนยันการเข้าใช้งานสำเร็จแล้ว

- Booking ยังคงมีผล

- ช่วงเวลานั้นยัง Block Room Availability

- ไม่สามารถยกเลิก Booking ได้

- `confirmed_at` จะเก็บเวลาที่ Confirm

### CANCELLED

หมายถึง Student ยกเลิก Booking ก่อนที่จะ Confirm

- ข้อมูลยังคงอยู่ใน Database

- ไม่ถือว่าห้องถูกจองในช่วงเวลานั้น

- ไม่ Block Room Availability

- เจ้าหน้าที่สามารถดูข้อมูลย้อนหลังได้

### EXPIRED

หมายถึง Student ไม่ได้ยืนยันการเข้าใช้งานภายในเวลาที่ระบบกำหนด

- ข้อมูลยังคงอยู่ใน Database

- ไม่ถือว่าห้องถูกจองในช่วงเวลานั้น

- ไม่ Block Room Availability

- เจ้าหน้าที่สามารถดูข้อมูลย้อนหลังได้

---

## 9. สิ่งที่ต้องระวัง

### 9.1 การยกเลิก Booking

Student สามารถยกเลิกได้เฉพาะ Booking ที่ยังเป็น `BOOKED`

```text

BOOKED

   ↓

CANCELLED

```

ถ้า Booking เป็น:

```text

CONFIRMED

```

แล้ว → ไม่สามารถยกเลิกได้

---

### 9.2 การตรวจสอบว่าห้องว่างหรือไม่

เมื่อ Backend ตรวจสอบว่าห้องว่างหรือไม่ ให้พิจารณาเฉพาะ Booking ที่มีสถานะ:

```text

BOOKED

หรือ

CONFIRMED

```

เพราะทั้งสองสถานะถือว่าช่วงเวลานั้นถูกจองอยู่

ส่วน Booking ที่มีสถานะ:

```text

CANCELLED

EXPIRED

```

ไม่ต้องนำมาพิจารณาว่าห้องไม่ว่าง

ตัวอย่าง:

```text

Room 101

09:00–11:00  BOOKED

→ UNAVAILABLE

```

```text

Room 101

09:00–11:00  CONFIRMED

→ UNAVAILABLE

```

```text

Room 101

09:00–11:00  CANCELLED

→ AVAILABLE

```

---

### 9.3 การป้องกันการจองเวลาทับกัน

ก่อนสร้าง Booking ใหม่ Backend ต้องตรวจสอบก่อนว่า Room เดียวกัน ในวันเดียวกัน มี Booking ที่เป็น `BOOKED` หรือ `CONFIRMED` และมีช่วงเวลาทับกับ Booking ใหม่หรือไม่

ตัวอย่าง:

```text

Booking เดิม

09:00–11:00  BOOKED

Booking ใหม่

10:00–12:00

```

ช่วงเวลา 10:00–11:00 ทับกัน

```text

→ ไม่อนุญาตให้สร้าง Booking ใหม่

```

แต่ถ้า:

```text

Booking เดิม

09:00–11:00  CONFIRMED

Booking ใหม่

11:00–13:00

```

ช่วงเวลาไม่ทับกัน

```text

→ สามารถจองได้

```

---

### 9.4 ไม่ต้องสร้าง Room Status สำหรับ AVAILABLE / UNAVAILABLE

ไม่จำเป็นต้องเพิ่ม Column ใน `ROOM` เพื่อเก็บค่า:

```text

AVAILABLE

UNAVAILABLE

```

เพราะสถานะว่างหรือไม่ว่างของห้องเปลี่ยนแปลงตามวันที่และเวลาที่ผู้ใช้เลือก

Backend สามารถตรวจสอบจากข้อมูลใน `BOOKING` ได้

ตัวอย่าง:

```text

Room 101

09:00–11:00 → BOOKED     → UNAVAILABLE

11:00–13:00 → ไม่มี Booking ที่ Block ห้อง → AVAILABLE

13:00–16:00 → CONFIRMED → UNAVAILABLE

```

ดังนั้น:

```text

ROOM

→ เก็บข้อมูลของห้อง

BOOKING

→ เก็บข้อมูลการจอง

Backend

→ ใช้ข้อมูล BOOKING เพื่อคำนวณว่าเวลาที่ต้องการ

   AVAILABLE หรือ UNAVAILABLE

```

---

## 10. สรุป Flow การทำงาน

### ดูห้องว่าง (US2)

```text

Student

   ↓

เลือกวันที่ + เวลา

   ↓

Frontend

   ↓

Backend

   ↓

ตรวจ ROOM + BOOKING

   ↓

ตรวจ BOOKED / CONFIRMED Booking

   ↓

คำนวณ Availability

   ↓

แสดง AVAILABLE / UNAVAILABLE

```

### จองห้อง (US3)

```text

Student

   ↓

เลือก Room + Date + Start Time + Duration

   ↓

Frontend

   ↓

Backend

   ↓

ตรวจว่ามี Room หรือไม่

   ↓

ตรวจว่า Room เปิดใช้งานหรือไม่

   ↓

ตรวจ Start Time

   ↓

ตรวจระยะเวลาไม่เกิน 3 ชั่วโมง

   ↓

ตรวจ Booking ที่เวลาทับกัน

   ↓

ผ่านทุกเงื่อนไข

   ↓

สร้าง Booking

   ↓

status = BOOKED

   ↓

Student ไปที่ห้อง

   ↓

ตรวจสอบระยะห่าง ≤ 5 เมตร

   ↓

Confirm

   ↓

status = CONFIRMED

confirmed_at = เวลาที่ Confirm

```

### ส่ง Email ยืนยันการจอง (US5)


```
Student
   ↓
สร้าง Booking สำเร็จ
   ↓
Backend
   ↓
ดึง Email จาก USERS
   ↓
ส่ง Confirmation Email
   ↓
บันทึกผลการส่งใน EMAIL_LOGS

```
### ยกเลิก Booking (US4)

```text

Student

   ↓

Cancel Booking

   ↓

Backend

   ↓

ตรวจ status

   ↓

ถ้า BOOKED

   ↓

CANCELLED

ถ้า CONFIRMED

   ↓

ไม่อนุญาตให้ Cancel

```

### Booking หมดอายุ

```text

BOOKED

   ↓

ไม่ Confirm ภายในเวลาที่กำหนด

   ↓

EXPIRED

   ↓

ไม่ Block Availability

```

### ส่ง Email ยืนยันการจอง (US5)


```
Student
   ↓
สร้าง Booking สำเร็จ
   ↓
Backend
   ↓
ดึง Email จาก USERS
   ↓
ส่ง Confirmation Email
   ↓
บันทึกผลการส่งใน EMAIL_LOGS


```

## สรุปสำหรับ Backend

สิ่งสำคัญที่ Backend ต้องใช้จาก Database มีดังนี้:

1. `ROOM` ใช้ตรวจว่าห้องมีอยู่และเปิดใช้งานหรือไม่

2. `BOOKING` ใช้เก็บรายละเอียดการจองและสถานะของ Booking

3. `BOOKED` และ `CONFIRMED` ต้องถูกนำไปใช้ในการตรวจสอบ Room Availability

4. `CANCELLED` และ `EXPIRED` ไม่ Block Room Availability

5. ก่อนสร้าง Booking ต้องตรวจสอบเวลาทับซ้อน

6. Booking ใหม่เริ่มต้นด้วย `status = BOOKED`

7. เมื่อ Student ยืนยันการเข้าใช้งานภายในระยะ 5 เมตร ให้เปลี่ยนเป็น `CONFIRMED` และบันทึก `confirmed_at`

8. เมื่อเป็น `CONFIRMED` แล้ว ไม่สามารถยกเลิกได้

9. ถ้าไม่ Confirm ภายในเวลาที่กำหนด ให้เปลี่ยนเป็น `EXPIRED`

10. ไม่ควรลบ Booking ที่ยกเลิก เพราะต้องเก็บประวัติไว้สำหรับการตรวจสอบย้อนหลัง

11. USERS ใช้เก็บข้อมูลผู้ใช้งานและ Email ที่ได้รับจาก TU Authentication API

12. EMAIL_LOGS ใช้บันทึกผลการส่ง Email ยืนยันการจองของ US5

⋮⋮⋮⋮