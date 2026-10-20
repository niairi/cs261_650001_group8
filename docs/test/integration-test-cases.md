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