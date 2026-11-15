# Integration Test Cases — TU CS Space

## 1. UI ↔ API

### INT-UI-01 — Login
- **Endpoint:** `POST /login`
- **Scenario:** ผู้ใช้กรอก Student ID และ Password ที่ถูกต้องผ่านหน้า Login
- **Expected Result:** UI ส่งข้อมูลไปยัง API และได้รับ Token พร้อมข้อมูลผู้ใช้ จากนั้นเข้าสู่หน้าจองห้อง

### INT-UI-02 — View Rooms
- **Endpoint:** `GET /rooms`
- **Scenario:** ผู้ใช้เข้าสู่หน้าจองห้อง
- **Expected Result:** UI เรียก API และแสดงรายการห้องที่สามารถใช้งานได้

### INT-UI-03 — View Booking Schedule
- **Endpoint:** `GET /booking?date=`
- **Scenario:** ผู้ใช้เลือกวันที่ต้องการดูตาราง
- **Expected Result:** UI ส่งวันที่ไปยัง API และแสดงตารางการจองของวันที่เลือก

### INT-UI-04 — Create Booking
- **Endpoint:** `POST /booking`
- **Scenario:** ผู้ใช้เลือกห้อง วันที่ เวลา และจำนวนคน แล้วกดยืนยันการจอง
- **Expected Result:** UI ส่งข้อมูลไปยัง API และแสดงผลการจองสำเร็จ

### INT-UI-05 — View My Bookings
- **Endpoint:** `GET /booking/me`
- **Scenario:** ผู้ใช้เปิดหน้าประวัติการจอง
- **Expected Result:** UI เรียก API และแสดงเฉพาะรายการจองของผู้ใช้ที่ Login

### INT-UI-06 — Cancel Booking
- **Endpoint:** `PATCH /booking/:id/cancel`
- **Scenario:** ผู้ใช้เลือกการจองของตนเองและยืนยันการยกเลิก
- **Expected Result:** UI ส่ง Request ไปยัง API และแสดงผลการยกเลิกสำเร็จ

### INT-UI-07 — Authentication Error
- **Endpoint:** Protected API
- **Scenario:** ผู้ใช้เรียก API โดยไม่มีหรือมี Token ที่ไม่ถูกต้อง
- **Expected Result:** API ส่ง HTTP 401 และ UI แจ้งให้ผู้ใช้ Login ใหม่

---

## 2. API ↔ Database

### INT-DB-01 — Save User After Login
- **API:** `POST /login`
- **Database:** `users`
- **Scenario:** Login สำเร็จ
- **Expected Result:** ข้อมูลผู้ใช้ถูกบันทึกหรืออัปเดตในตาราง `users`

### INT-DB-02 — Retrieve Rooms
- **API:** `GET /rooms`
- **Database:** `room`
- **Scenario:** UI ขอข้อมูลห้อง
- **Expected Result:** API อ่านข้อมูลจาก Database และส่งเฉพาะห้องที่เปิดใช้งานกลับไป

### INT-DB-03 — Retrieve Booking Schedule
- **API:** `GET /booking?date=`
- **Database:** `booking`
- **Scenario:** UI ขอข้อมูลการจองตามวันที่
- **Expected Result:** API อ่านข้อมูลการจองจาก Database และส่งข้อมูลของวันที่ที่ร้องขอกลับไป

### INT-DB-04 — Create Booking
- **API:** `POST /booking`
- **Database:** `booking`
- **Scenario:** ผู้ใช้จองห้องสำเร็จ
- **Expected Result:** API เพิ่มรายการใหม่ลงใน `booking` และมีข้อมูลผู้จอง ห้อง วันที่ เวลา และสถานะการจองถูกต้อง

### INT-DB-05 — Prevent Duplicate Booking
- **API:** `POST /booking`
- **Database:** `booking`
- **Scenario:** ผู้ใช้พยายามจองห้องในช่วงเวลาที่มีการจองอยู่แล้ว
- **Expected Result:** API ตรวจสอบข้อมูลใน Database และปฏิเสธการจองซ้อน

### INT-DB-06 — Retrieve My Bookings
- **API:** `GET /booking/me`
- **Database:** `booking`
- **Scenario:** ผู้ใช้เปิดประวัติการจอง
- **Expected Result:** API

---

## 3. Sprint 2 Integration Test Cases

ส่วนนี้เพิ่มเติมสำหรับ User Stories US6–US15 โดยเน้นการทดสอบการทำงานร่วมกันระหว่าง UI, API, Database และ Authentication

### 3.1 UI ↔ API — Sprint 2

### INT-S2-UI-01 — Edit Booking (US6)

- **Endpoint:** `PATCH /booking/:id`
- **Scenario:** ผู้ใช้แก้ไขวันหรือเวลาของรายการจองที่มีอยู่
- **Expected Result:** UI ส่งข้อมูลใหม่ไปยัง API และ API ส่งผลการแก้ไขกลับมา โดยข้อมูลการจองในหน้าจอถูกอัปเดตตามข้อมูลใหม่

### INT-S2-UI-02 — Admin Booking Management (US7)

- **Endpoint:** Booking Management API
- **Scenario:** Admin เปิดหน้าจัดการ Booking และค้นหาหรือกรองรายการ Booking
- **Expected Result:** UI ส่งเงื่อนไขการค้นหาหรือกรองไปยัง API และแสดงรายการ Booking ที่ตรงกับเงื่อนไขที่ได้รับจาก API

### INT-S2-UI-03 — Check-in (US8)

- **Endpoint:** `POST /booking/:id/check-in`
- **Scenario:** ผู้ใช้กดยืนยันการเข้าใช้งานห้องขณะอยู่ภายในระยะ 5 เมตร
- **Expected Result:** UI ส่งตำแหน่งไปยัง API และ API ยืนยันการ Check-in สำเร็จ พร้อมเปลี่ยนสถานะ Booking เป็น `CONFIRMED`

### INT-S2-UI-04 — Check-in Outside Range (US8)

- **Endpoint:** `POST /booking/:id/check-in`
- **Scenario:** ผู้ใช้กดยืนยันการเข้าใช้งานขณะอยู่นอกระยะ 5 เมตร
- **Expected Result:** API ปฏิเสธการ Check-in และ UI แสดงข้อความแจ้งว่าผู้ใช้อยู่ไกลจากห้องเกินกำหนด

### INT-S2-UI-05 — No-show Status (US9)

- **Endpoint:** Booking/No-show API
- **Scenario:** Booking ถึงเวลาที่กำหนดแล้วแต่ผู้ใช้ไม่ได้ Check-in
- **Expected Result:** ระบบเปลี่ยนสถานะ Booking เป็น `EXPIRED` และ UI แสดงจำนวน No-show ของผู้ใช้ถูกต้อง

### INT-S2-UI-06 — Blacklist (US10)

- **Endpoint:** Blacklist API
- **Scenario:** ผู้ใช้มี No-show ครบ 3 ครั้งและพยายามจองห้อง
- **Expected Result:** API ตรวจสอบสถานะ Blacklist และ UI แจ้งว่าผู้ใช้ถูกระงับสิทธิ์การจอง

### INT-S2-UI-07 — Logout (US11)

- **Endpoint:** Logout / Authentication API
- **Scenario:** ผู้ใช้ Login อยู่และกด Logout
- **Expected Result:** Session/Token ถูกยกเลิกหรือถูกล้าง และผู้ใช้ไม่สามารถเข้าถึงหน้าที่ต้อง Login ได้

### INT-S2-UI-08 — Admin Room Management (US12)

- **Endpoint:** Room Management API
- **Scenario:** Admin เพิ่ม แก้ไข หรือปิดห้อง
- **Expected Result:** UI ส่ง Request ไปยัง API และแสดงข้อมูลห้องที่ถูกเพิ่มหรือแก้ไขตามผลลัพธ์จาก API

### INT-S2-UI-09 — Admin Blacklist Management (US13)

- **Endpoint:** Blacklist Management API
- **Scenario:** Admin ดูรายการ Blacklist หรือปลดระงับผู้ใช้
- **Expected Result:** UI แสดงข้อมูล Blacklist ตามผลลัพธ์จาก API และการปลดระงับมีผลกับการจองของผู้ใช้

### INT-S2-UI-10 — Faculty Validation Login (US14)

- **Endpoint:** `POST /login`
- **Scenario:** ผู้ใช้ Login โดยระบบตรวจสอบเงื่อนไข Faculty/สาขาตามที่กำหนด
- **Expected Result:** API ตรวจสอบข้อมูลของผู้ใช้และ UI แสดงผลการ Login ตามเงื่อนไขที่กำหนด โดยผู้ใช้ที่ไม่ผ่านเงื่อนไขถูกปฏิเสธการ Login

### INT-S2-UI-11 — Login Validation (US15)

- **Endpoint:** `POST /login`
- **Scenario:** ผู้ใช้กรอก Student ID และ Password โดยมีกรณีข้อมูลถูกต้องและไม่ถูกต้อง
- **Expected Result:** UI ส่งข้อมูลไปยัง API และ API อนุญาตหรือปฏิเสธการ Login ตามข้อมูลที่ได้รับ พร้อมส่งผลลัพธ์กลับมาแสดงบน UI

---

## 3.2 API ↔ Database — Sprint 2

### INT-S2-DB-01 — Update Booking (US6)

- **API:** `PATCH /booking/:id`
- **Database:** `booking`
- **Scenario:** ผู้ใช้แก้ไขวันหรือเวลาการจอง
- **Expected Result:** API ตรวจสอบเงื่อนไขการจองและอัปเดตข้อมูลใน `booking` ถูกต้อง

### INT-S2-DB-02 — Admin Booking Management (US7)

- **API:** Booking Management API
- **Database:** `booking`
- **Scenario:** Admin ค้นหาหรือกรองรายการ Booking
- **Expected Result:** API อ่านข้อมูลจาก `booking` ตามเงื่อนไขที่กำหนด และส่งรายการ Booking ที่ตรงกับเงื่อนไขกลับไป

### INT-S2-DB-03 — Check-in and Booking Status (US8)

- **API:** Check-in API
- **Database:** `booking`, `room`
- **Scenario:** ผู้ใช้ Check-in ภายในระยะที่กำหนด
- **Expected Result:** API ตรวจสอบพิกัดจาก `room.latitude` / `room.longitude` และอัปเดต `confirmed_at` พร้อมสถานะ Booking เป็น `CONFIRMED`

### INT-S2-DB-04 — Check-in Outside Allowed Range (US8)

- **API:** Check-in API
- **Database:** `room`, `booking`
- **Scenario:** ผู้ใช้ Check-in จากตำแหน่งที่อยู่ไกลเกิน 5 เมตร
- **Expected Result:** API ปฏิเสธการ Check-in และข้อมูล Booking ยังคงสถานะเดิม

### INT-S2-DB-05 — No-show Count (US9)

- **API:** No-show API / Booking API
- **Database:** `booking`
- **Scenario:** Booking หมดเวลาโดยไม่มีการ Check-in
- **Expected Result:** ระบบเปลี่ยน Booking เป็น `EXPIRED` และสามารถนับจำนวน No-show ของผู้ใช้ได้ถูกต้อง

### INT-S2-DB-06 — Create Blacklist (US10)

- **API:** Blacklist API
- **Database:** `blacklist`, `booking`, `users`
- **Scenario:** ผู้ใช้มี No-show ครบ 3 ครั้ง
- **Expected Result:** ระบบสร้างรายการใน `blacklist` พร้อม `student_id`, `trigger_booking_id`, `start_date`, `end_date` และ `reason` ถูกต้อง

### INT-S2-DB-07 — Check Active Blacklist Before Booking (US10)

- **API:** `POST /booking`
- **Database:** `blacklist`
- **Scenario:** ผู้ใช้ที่ยังอยู่ในช่วง Blacklist พยายามสร้าง Booking
- **Expected Result:** API ตรวจสอบ `start_date` และ `end_date` แล้วปฏิเสธการจอง

### INT-S2-DB-08 — Room Management (US12)

- **API:** Room Management API
- **Database:** `room`
- **Scenario:** Admin เพิ่ม แก้ไข หรือปิดห้อง
- **Expected Result:** ข้อมูลใน `room` ถูกเพิ่มหรือแก้ไขถูกต้อง และห้องที่ปิดไม่สามารถนำไปจองได้

### INT-S2-DB-09 — Remove Expired Blacklist (US13)

- **API:** Blacklist Management API
- **Database:** `blacklist`
- **Scenario:** Admin เปิดรายการ Blacklist
- **Expected Result:** API สามารถแยกรายการที่หมดอายุออกจากรายการที่ยังมีผล โดยอ้างอิง `end_date`

### INT-S2-DB-10 — Login and User Validation (US14–US15)

- **API:** `POST /login`
- **Database:** `users`
- **Scenario:** ผู้ใช้ Login ด้วย Student ID และ Password โดยระบบตรวจสอบข้อมูลผู้ใช้และเงื่อนไข Faculty/สาขา
- **Expected Result:** API ตรวจสอบข้อมูลใน `users` และอนุญาตเฉพาะผู้ใช้ที่มีข้อมูลถูกต้องและผ่านเงื่อนไขของระบบ

---

## 3.3 Integration Test Coverage Summary

| Test Area | User Stories | Integration Point |
|---|---|---|
| Booking Edit | US6 | UI → API → Database |
| Admin Booking Management | US7 | UI → API → Database |
| Check-in | US8 | UI → API → Room/Booking |
| No-show | US9 | API → Booking Database |
| Blacklist | US10 | API → Booking/Blacklist Database |
| Logout | US11 | UI → Authentication |
| Room Management | US12 | UI → API → Room Database |
| Blacklist Management | US13 | UI → API → Blacklist Database |
| Faculty Login | US14 | UI → Login API → Users |
| Login Validation | US15 | UI → Login API → Users |

**หมายเหตุ:** Integration Test Cases นี้เป็นการออกแบบ Test Case สำหรับ Task 71 เพื่อกำหนดจุดเชื่อมต่อที่ต้องทดสอบระหว่างแต่ละส่วนของระบบ โดยการ Execute Test จริงสามารถดำเนินการใน Task สำหรับ Integration Test Execution ภายหลัง