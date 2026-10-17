# Database Guide – Working Space Booking System

เนื้อหานี้ทำขึ้นเพื่ออธิบายโครงสร้าง Database คร่าว ๆ และแนวทางการทำงานที่เกี่ยวข้องกับ Database สำหรับ Backend Developer

---

## 1. โครงสร้าง Database

ระบบมี 2 ตารางหลัก ได้แก่ `ROOM` และ `BOOKING`

### 1.1 ROOM

ใช้สำหรับเก็บข้อมูลห้อง Working Space

| Column | รายละเอียด |
|---|---|
| `room_id` | รหัสห้อง (Primary Key) |
| `room_name` | ชื่อห้อง |
| `capacity` | จำนวนคนที่รองรับ |
| `location` | ตำแหน่งของห้อง |
| `is_active` | ระบุว่าห้องเปิดให้ใช้งานอยู่หรือไม่ |

### 1.2 BOOKING

ใช้สำหรับเก็บข้อมูลการจองห้อง

| Column | รายละเอียด |
|---|---|
| `booking_id` | รหัสการจอง (Primary Key) |
| `student_id` | รหัสนักศึกษา |
| `room_id` | รหัสห้องที่จอง (Foreign Key → ROOM) |
| `booking_date` | วันที่จอง |
| `start_time` | เวลาเริ่มต้น |
| `end_time` | เวลาสิ้นสุด |
| `status` | สถานะของ Booking |
| `created_at` | วันที่และเวลาที่สร้าง Booking |
| `confirmed_at` | วันที่และเวลาที่ Student ยืนยันการเข้าใช้งานภายในระยะ 5 เมตร |

### ความสัมพันธ์

ห้อง 1 ห้อง สามารถมี Booking ได้ 0 หรือหลายรายการ

```text
ROOM 1 ─────────< BOOKING
```

---

## 2. กฎของ Booking

### 2.1 เวลาเริ่มต้นที่สามารถเลือกได้

อ้างอิงจากการออกแบบหน้า UX/UI ระบบกำหนดเวลาเริ่มต้น (Start Time) ที่ผู้ใช้สามารถเลือกได้ทั้งหมด 8 เวลา:

- 09:00
- 10:00
- 11:00
- 12:00
- 13:00
- 14:00
- 15:00
- 16:00

แต่ละเวลาเป็น **เวลาเริ่มต้นของการจอง (`start_time`)**

ตัวอย่าง:

```text
เลือก 09:00
→ start_time = 09:00

เลือก 13:00
→ start_time = 13:00

เลือก 16:00
→ start_time = 16:00
```

Database จะเก็บทั้ง `start_time` และ `end_time` เพื่อระบุช่วงเวลาที่จองจริง

---

### 2.2 ระยะเวลาการจอง

Booking 1 รายการสามารถจองได้ **ไม่เกิน 3 ชั่วโมง**

ตัวอย่าง:

```text
09:00–10:00  ✓
09:00–11:00  ✓
09:00–12:00  ✓
09:00–13:00  ✗
```

ดังนั้น `start_time` และ `end_time` สามารถใช้ระบุระยะเวลาการจองได้

Database มีการตรวจสอบว่า:

```text
end_time > start_time
```

และระยะเวลาการจองต้องไม่เกิน 3 ชั่วโมง

---

## 3. การสร้าง Booking (US3)

เมื่อ Student ต้องการจองห้อง Backend ควรทำงานตามลำดับดังนี้

### Step 1: รับข้อมูลจาก Frontend

Backend รับข้อมูล:

```text
student_id
room_id
booking_date
start_time
end_time
```

### Step 2: ตรวจสอบห้อง

ตรวจสอบว่า `room_id` มีอยู่ใน `ROOM` หรือไม่

ถ้าไม่มี → ไม่อนุญาตให้สร้าง Booking

### Step 3: ตรวจสอบว่าห้องเปิดใช้งาน

ตรวจสอบ:

```text
is_active = TRUE
```

ถ้าห้องไม่ Active → ไม่อนุญาตให้จอง

### Step 4: ตรวจสอบเวลา

ตรวจสอบว่า:

```text
end_time > start_time
```

และระยะเวลาการจองต้องไม่เกิน 3 ชั่วโมง

นอกจากนี้ `start_time` ต้องเป็นหนึ่งในเวลาเริ่มต้นที่ระบบกำหนด:

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

### Step 5: ตรวจสอบเวลาทับซ้อน

ตรวจสอบว่า Room เดียวกัน ในวันที่เดียวกัน มี `BOOKED` หรือ `CONFIRMED` Booking ที่ช่วงเวลาทับกับ Booking ใหม่หรือไม่

ถ้ามี → ไม่อนุญาตให้จอง

ถ้าไม่มี → สามารถสร้าง Booking ได้

### Step 6: สร้าง Booking

เมื่อผ่านการตรวจสอบทั้งหมด ให้สร้างข้อมูลใน `BOOKING`

โดยกำหนด:

```text
status = BOOKED
```

หมายความว่า Student จองห้องสำเร็จแล้ว แต่ยังไม่ได้ยืนยันการเข้าใช้งานภายในระยะ 5 เมตร

---

## 4. การยืนยันการเข้าใช้งานภายในระยะ 5 เมตร

หลังจากสร้าง Booking แล้ว Student ต้องไปยังห้องที่จองและอยู่ภายในระยะ 5 เมตรเพื่อยืนยันการเข้าใช้งาน

เมื่อการยืนยันสำเร็จ:

```text
status = CONFIRMED
confirmed_at = เวลาที่ทำการยืนยัน
```

เมื่อ Booking เป็น `CONFIRMED` แล้ว จะไม่สามารถยกเลิก Booking ได้

หาก Student ไม่ยืนยันภายในเวลาที่ระบบกำหนด:

```text
status = EXPIRED
```

`EXPIRED` Booking จะไม่ถือว่าเป็นการจองที่ใช้งานอยู่ และไม่ Block Room Availability

---

## 5. การตรวจสอบห้องว่าง (US2)

Frontend ต้องสามารถแสดงได้ว่าห้องใด:

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

ถ้าพบ Booking ที่มี:

```text
room_id เดียวกัน
booking_date เดียวกัน
status = BOOKED หรือ CONFIRMED
และช่วงเวลาทับซ้อนกัน
```

ให้ถือว่าห้องนั้น:

```text
UNAVAILABLE
```

ถ้าไม่พบ Booking ที่เข้าเงื่อนไขดังกล่าว:

```text
AVAILABLE
```

### กรณี Booking ถูกยกเลิกหรือหมดอายุ

`CANCELLED` และ `EXPIRED` Booking จะไม่ถือว่าเป็น Booking ที่ใช้งานอยู่

ดังนั้นหลังจาก Booking ถูก `CANCELLED` หรือ `EXPIRED` แล้ว ช่วงเวลานั้นสามารถกลับมาแสดงเป็น:

```text
AVAILABLE
```

เพื่อให้ Student คนอื่นสามารถจองต่อได้

---

## 6. การยกเลิก Booking (US4)

เมื่อ Student ต้องการยกเลิก Booking:

### กรณีที่ยังเป็น `BOOKED`

สามารถยกเลิกได้:

```text
BOOKED
   ↓
CANCELLED
```

ไม่ควรลบข้อมูล Booking ออกจาก Database

ตัวอย่าง:

```sql
UPDATE booking
SET status = 'CANCELLED'
WHERE booking_id = ?;
```

### กรณีที่เป็น `CONFIRMED`

ไม่อนุญาตให้ยกเลิก:

```text
CONFIRMED
   ↓
ไม่สามารถ CANCEL ได้ (เพราะ confirmed คือ การยืนยันการเข้าใช้งานภายในระยะ 5 เมตร)
```

เหตุผลที่ไม่ลบข้อมูล:

- เก็บประวัติการจอง
- เจ้าหน้าที่สามารถดูข้อมูลย้อนหลังได้
- สามารถตรวจสอบข้อมูลการจองที่ถูกยกเลิกได้

หลังจากเปลี่ยนเป็น `CANCELLED` แล้ว Booking นี้ต้องไม่ถูกนำไปใช้ในการคำนวณว่า Room ไม่ว่าง

---

## 7. การแสดงข้อมูลสำหรับเจ้าหน้าที่ (US5)

เจ้าหน้าที่สามารถดูข้อมูล Booking ได้ทั้ง:

- Booking ที่ยังไม่เกิดขึ้น
- Booking ที่เกิดขึ้นแล้ว
- Booking ที่ถูกยกเลิก
- Booking ที่หมดอายุ
- Booking ที่ได้รับการยืนยันแล้ว

ข้อมูลที่ควรแสดง เช่น:

```text
booking_id
student_id
room_name
booking_date
start_time
end_time
status
created_at
confirmed_at
```

### การค้นหาด้วย Student ID

เมื่อ Admin ค้นหาด้วย Student ID ให้ใช้:

```text
BOOKING.student_id
```

เป็นเงื่อนไขในการค้นหา

---

## 8. สถานะของ Booking

ระบบมีสถานะ 4 ค่า:

### BOOKED

หมายถึง Student สร้าง Booking สำเร็จแล้ว แต่ยังไม่ได้ยืนยันการเข้าใช้งานภายในระยะ 5 เมตร

Booking ที่เป็น `BOOKED` ยังคง Block ช่วงเวลาของห้องนั้นอยู่

### CONFIRMED

หมายถึง Student อยู่ภายในระยะ 5 เมตรและยืนยันการเข้าใช้งานสำเร็จแล้ว

เมื่อเป็น `CONFIRMED` แล้ว:

- Booking ยังคงมีผล
- Room ช่วงเวลานั้นยังไม่ว่าง
- ไม่สามารถยกเลิก Booking ได้
- `confirmed_at` จะถูกบันทึกเวลาที่ Confirm

### CANCELLED

หมายถึง Student ยกเลิก Booking ก่อนที่จะ Confirm

- ข้อมูลยังคงอยู่ใน Database
- ไม่ถือว่าห้องถูกจอง
- ไม่ Block Room Availability
- Admin ยังสามารถดูข้อมูลย้อนหลังได้

### EXPIRED

หมายถึง Student ไม่ได้ยืนยันการเข้าใช้งานภายในเวลาที่ระบบกำหนด

- ข้อมูลยังคงอยู่ใน Database
- ไม่ถือว่าห้องถูกจอง
- ไม่ Block Room Availability
- Admin สามารถดูข้อมูลย้อนหลังได้

---

## 9. สิ่งที่ต้องระวัง

### 9.1 การยกเลิก Booking

Student สามารถยกเลิกได้เฉพาะ Booking ที่ยังเป็น `BOOKED`

```text
BOOKED
   ↓
CANCELLED
```

แต่ถ้า Booking เป็น:

```text
CONFIRMED
```

แล้ว → ไม่สามารถยกเลิกได้

---

### 9.2 การตรวจสอบว่าห้องว่างหรือไม่

เมื่อ Backend ตรวจสอบว่าห้องว่างหรือไม่ ให้พิจารณา Booking ที่มีสถานะ:

```text
BOOKED
หรือ
CONFIRMED
```

เนื่องจากทั้งสองสถานะถือว่าช่วงเวลานั้นถูกจองอยู่

ส่วน Booking ที่มีสถานะ:

```text
CANCELLED
EXPIRED
```

ไม่ต้องนำมาพิจารณาว่าห้องไม่ว่าง

ตัวอย่าง:

```text
Room 1
09:00–11:00  BOOKED
```

→ ช่วงเวลา 09:00–11:00 **ไม่ว่าง**

และ:

```text
Room 1
09:00–11:00  CONFIRMED
```

→ ช่วงเวลา 09:00–11:00 **ไม่ว่าง**

แต่ถ้า:

```text
Room 1
09:00–11:00  CANCELLED
```

→ ช่วงเวลา 09:00–11:00 **ยังสามารถจองได้**

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

→ **ไม่อนุญาตให้สร้าง Booking ใหม่**

แต่ถ้า:

```text
Booking เดิม
09:00–11:00  CONFIRMED

Booking ใหม่
11:00–13:00
```

ช่วงเวลาไม่ทับกัน

→ **สามารถจองได้**

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
Room 1

09:00–11:00 → BOOKED → UNAVAILABLE
11:00–13:00 → ไม่มี BOOKED/CONFIRMED → AVAILABLE
13:00–16:00 → CONFIRMED → UNAVAILABLE
```

ดังนั้น:

```text
ROOM
→ เก็บข้อมูลของห้อง

BOOKING
→ เก็บข้อมูลการจอง

Backend
→ ใช้ข้อมูล Booking เพื่อคำนวณว่าเวลาที่ต้องการ AVAILABLE หรือ UNAVAILABLE
```

---

## 10. สรุป Flow การทำงาน

### ดูห้องว่าง (US2)

```text
Student
   ↓
เลือกวันที่ + เวลาเริ่มต้น
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
ตรวจ Room
   ↓
ตรวจ Start Time
   ↓
ตรวจระยะเวลา
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

### ยกเลิก (US4)

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

### เจ้าหน้าที่ดูข้อมูล (US5)

```text
Admin
   ↓
Backend
   ↓
Query BOOKING
   ↓
แสดงข้อมูล Booking
ทั้ง BOOKED / CONFIRMED / CANCELLED / EXPIRED
```