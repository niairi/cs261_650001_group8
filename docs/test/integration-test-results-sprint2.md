# Test Report

## 1. Database Integration Test – Task 69

### ROOM – Latitude / Longitude

- **TASK69-DB-01:** PASS — ตรวจสอบว่า `ROOM` รองรับข้อมูล `latitude` และ `longitude` สำหรับการทำงานของ Check-in
- **TASK69-DB-02:** PASS — ตรวจสอบข้อมูล Latitude / Longitude ของ Room 101–103 โดยใช้พิกัด `14.0728612, 100.6082701`
- **TASK69-DB-03:** PASS — ตรวจสอบ Database Script ที่ใช้ `IF NOT EXISTS` เพื่อป้องกัน Error กรณี Column มีอยู่แล้ว

### BLACKLIST

- **TASK69-DB-04:** PASS — ตรวจสอบว่า Table `BLACKLIST` ถูกสร้างขึ้นและมีโครงสร้างตามที่กำหนด
- **TASK69-DB-05:** PASS — ตรวจสอบ `trigger_booking_id` และ Foreign Key ที่เชื่อมโยงกับ `booking(booking_id)`
- **TASK69-DB-06:** PASS — ตรวจสอบ `start_date`, `end_date` และ `reason`
- **TASK69-DB-07:** PASS — ตรวจสอบ Index `idx_blacklist_student`
- **TASK69-DB-08:** PASS — ตรวจสอบและ Query ข้อมูล Blacklist Test Data ได้สำเร็จ

### Database Regression

- **TASK69-DB-09:** PASS — ตรวจสอบว่า Room Data เดิมยังสามารถใช้งานได้หลังจากมีการเปลี่ยนแปลง Database
- **TASK69-DB-10:** PASS — ตรวจสอบว่า Booking Data เดิมยังสามารถใช้งานได้หลังจากมีการเปลี่ยนแปลง Database

---

## 2. Integration / System Test – Task 73

### US5 – Email Notification

- **US5-TC3:** Not Testable — ไม่สามารถทดสอบกรณี Email Server ไม่พร้อมใช้งานจนได้สถานะ `FAILED`
- **Email Log:** PASS — ระบบสามารถสร้าง Email Log ได้

### US6 – Edit Booking

- **US6-TC1:** PASS — สามารถแก้ไขช่วงเวลาของ Booking ได้สำเร็จ
- **US6-TC2:** PASS — ระบบป้องกันการแก้ไข Booking ไปยังช่วงเวลาที่ถูกจองแล้ว และแสดง `409 Conflict`
- **US6-TC3:** PASS — ระบบไม่อนุญาตให้แก้ไข Booking เกิน 3 ชั่วโมง
- **US6-TC4:** PASS — เมื่อเหลือเวลาน้อยกว่า 30 นาที ปุ่มแก้ไขไม่สามารถกดได้ และระบบแสดงข้อความแจ้งเตือน

### US7 – Admin Booking Management


- **US7-TC1:** PASS — สามารถแสดงรายการ Booking ทั้งหมดสำหรับผู้ดูแลระบบได้
- **US7-TC2:** PASS — สามารถค้นหา Booking ด้วยรหัสนักศึกษาได้
- **US7-TC3:** PASS — สามารถกรอง Booking ด้วย Room และวันที่ได้
- **US7-TC4:** PASS — นักศึกษาทั่วไปไม่สามารถเข้าถึง Admin API และระบบตอบกลับ HTTP 403 Forbidden พร้อมข้อความ “เฉพาะเจ้าหน้าที่เท่านั้น”
- **US7-TC5:** PASS — สามารถเข้าถึงและแสดงเมนูสำหรับผู้ดูแลระบบได้
- **US7-TC6:** PASS — สามารถแสดงรายงานสรุป Booking ของ Room A วันที่ 22/10/2026 ได้ตามข้อมูล 3 รายการ โดยมี 1 CONFIRMED, 1 CANCELLED และ 1 EXPIRED (No-show)

### US8 – Check-in

- **US8-TC1:** PASS — สามารถ Check-in ได้สำเร็จเมื่อผู้ใช้อยู่ภายในระยะที่กำหนด และ Booking เปลี่ยนสถานะเป็น `CONFIRMED`
- **US8-TC2:** PASS — ระบบ Reject Check-in เมื่อผู้ใช้อยู่นอกระยะที่กำหนด และ Booking ยังคงสถานะ `BOOKED`
- **US8-TC3:** PASS — เมื่อผู้ใช้ปฏิเสธ Location Permission ระบบไม่อนุญาตให้ Check-in และแจ้งให้ผู้ใช้อนุญาต Location ก่อน Check-in
- **US8-TC4:** PASS — เมื่อไม่ Check-in ภายในเวลาที่กำหนด ระบบเปลี่ยนสถานะ Booking เป็น `EXPIRED` และแสดงข้อความแจ้งว่าเลยเวลาที่สามารถ Check-in ได้

### US9 – No-show
- จากผลการทดสอบของทีม

- **US9-TC1:** PASS —  พบว่า Booking ที่ไม่มีการ Check-in สามารถเข้าสู่สถานะ Expired / No-show ได้
- **US9-TC2:** PASS —  พบว่า Booking ที่ Check-in สำเร็จจะไม่ถูกนับเป็น No-show
- **US9-TC3:** PASS — พบว่า Cancelled Booking จะไม่ถูกนับเป็น No-show

### US10 – Blacklist
- จากผลการทดสอบของทีม 

- **US10-TC1:** PASS — พบว่าเมื่อ No-show ครบ 3 ครั้ง ระบบสามารถตรวจจับและระงับสิทธิ์การจองโดยอัตโนมัติ และกำหนดระยะเวลา Blacklist 30 วัน
- **US10-TC2:** PASS — พบว่าผู้ใช้ที่อยู่ใน Blacklist ไม่สามารถสร้าง Booking ได้ และระบบแสดงข้อความแจ้งระยะเวลาการระงับ
- **US10-TC3:** PASS — พบว่าเมื่อ Blacklist หมดอายุ ผู้ใช้สามารถกลับมาจองห้องได้ตามปกติ
- **US10-TC4:** PASS — พบว่าผู้ใช้ที่มี No-show 2 ครั้งยังสามารถสร้าง Booking ได้ และยังไม่ถูก Blacklist

### US11 – Logout / Authentication

- **US11-TC1:** PASS — หลังจาก Logout ระบบนำผู้ใช้กลับไปยังหน้า Login และไม่อนุญาตให้เข้าถึง Protected Page โดยไม่มี Authentication



### US14 – User Authorization

- **US14-TC1:** PASS — ผู้ใช้ที่ไม่ผ่านเงื่อนไข Student / Faculty ไม่สามารถ Login เข้าสู่ระบบได้
- **US14-TC2:** PASS — ผู้ใช้ที่ผ่านเงื่อนไข Student / Faculty สามารถ Login เข้าสู่ระบบได้สำเร็จ
- **US14-TC3:** PASS — สามารถ Login ด้วยสิทธิ์ Admin และเข้าถึงเมนูจัดการ Booking ได้

### US15 – Login Validation

- **US15-TC1:** PASS — Student ID ถูกต้องแต่ Password ผิด ระบบปฏิเสธการ Login
- **US15-TC2:** PASS — Student ID ผิดแต่ Password ถูกต้อง ระบบปฏิเสธการ Login
- **US15-TC3:** PASS — Student ID และ Password ผิด ระบบปฏิเสธการ Login
- **US15-TC4:** PASS — Student ID และ Password ถูกต้อง สามารถ Login ได้สำเร็จ

---

## 3. UI / Regression Test

### UI v2

- **UI-01:** PASS — สามารถใช้งาน UI ที่เกี่ยวข้องกับ Sprint 2 และเชื่อมต่อกับ Backend API ได้
- **UI-02:** PASS — สามารถใช้งาน Login, Booking, Edit Booking, Cancel Booking, Booking History, Check-in และ Admin Booking Management ในส่วนที่ได้ Execute แล้ว

### Regression Test

- **REG-01:** PASS — ตรวจสอบ Room Data เดิมหลังจากมีการเปลี่ยนแปลง Database แล้ว ข้อมูลยังสามารถใช้งานได้
- **REG-02:** PASS — ตรวจสอบ Booking Data เดิมหลังจากมีการเปลี่ยนแปลง Database แล้ว ข้อมูลยังสามารถใช้งานได้
- **REG-03:** PASS — ตรวจสอบการทำงานหลักของ Booking ที่เกี่ยวข้องกับ Sprint 2 แล้วยังสามารถใช้งานได้

### Bug ที่พบ

- **BUG-01:** พบปัญหาใน Edit Booking — ระบบกำหนดให้ Booking สามารถจองได้เฉพาะวันจันทร์–ศุกร์ แต่สามารถแก้ไขวันที่ของ Booking ไปเป็นวันเสาร์–อาทิตย์และบันทึกได้สำเร็จ
- ตัวอย่างที่พบ: แก้ไขวันที่จาก `16/11/2026` เป็น `15/11/2026`
- **สาเหตุที่คาดว่าเกี่ยวข้อง:** Validation ในส่วนของ Edit Booking อาจไม่ได้ตรวจสอบเงื่อนไขวันจันทร์–ศุกร์เหมือนกับขั้นตอนการสร้าง Booking
- ประเด็นนี้ได้รายงานไว้สำหรับ **Task 77 – Bug Fixing / Regression Test**

---

## 4. Test Limitations

### 4.1 Location-based Test

บาง Test Case จำเป็นต้องใช้ Location เพื่อทดสอบเงื่อนไข Check-in เช่น การตรวจสอบระยะห่างจากห้อง และ Location Permission
ในการทดสอบรอบนี้ ได้ใช้ Browser Location Simulation เพื่อจำลองพิกัดสำหรับการทดสอบ และสามารถ Execute US8-TC1 ถึง US8-TC4 ได้ครบตาม Expected Result
อย่างไรก็ตาม การทดสอบในครั้งนี้เป็นการจำลอง Location ผ่าน Browser และไม่ได้ทดสอบด้วย Location จริงจากสถานที่ใช้งานจริง

### 4.2 Test Account / Mock Account

การทดสอบ No-show และ Blacklist สำหรับ US9 และ US10 อ้างอิงผลการทดสอบของทีมโดยใช้ Mock Test Account แยกสำหรับการทดสอบ Flow ดังกล่าว  

จากผลการทดสอบของทีม สามารถยืนยันการทำงานของ No-show และ Blacklist ตาม Test Case ได้ครบถ้วน โดยผลการทดสอบถูกบันทึกเป็น PASS ในส่วนของ US9 และ US10  

สำหรับการทดสอบใน Environment จริง ยังคงควรแยก Test Account ออกจาก Student ID จริงของนักศึกษา เพื่อป้องกันผลกระทบต่อข้อมูลผู้ใช้งานจริง


### 4.3 Email Configuration

ไม่สามารถทดสอบการส่ง Email จริงได้ เนื่องจาก Environment ปัจจุบันยังไม่ได้ตั้งค่า SMTP

ระบบสามารถสร้าง Email Log ได้ แต่สถานะการส่ง Email ถูกบันทึกเป็น `SKIPPED` พร้อม `error_message = smtp-not-configured`

### 4.4 TU API

การทดสอบบางกรณีของ TU API ยังไม่สามารถดำเนินการกับระบบจริงได้ เนื่องจาก Environment ปัจจุบันใช้ **Simulation Mode**

ดังนั้นกรณี Invalid Credentials และกรณี TU API ไม่พร้อมใช้งานจึงยังไม่สามารถยืนยันผลจากระบบจริงได้

---

## 5. Summary

- **Task 69:** PASS — ตรวจสอบ Database Integration สำหรับ ROOM, BLACKLIST และ Regression ของ ROOM / BOOKING
- **Task 73:** ดำเนินการ Execute และบันทึกผล Sprint 2 Test Case ที่สามารถทดสอบได้ใน Environment ปัจจุบัน
- Test Case ที่ Execute แล้วและเป็นไปตาม Expected Result ระบุเป็น **PASS**
- Test Case ที่ไม่สามารถทดสอบได้เนื่องจากข้อจำกัดของ Environment ระบุเป็น **Not Testable**
- Test Case ที่ยังไม่ได้ Execute ระบุเป็น **PENDING**
- ผลการทดสอบ **US9 และ US10** อ้างอิงจากการทดสอบของทีมด้วย Mock Test Account และผลการทดสอบเป็นไปตาม Expected Result

---

## 6. Conclusion

การทดสอบ Sprint 2 สามารถตรวจสอบการทำงานหลักของระบบในส่วนของ **Database Integration, Login, Booking, Edit Booking, Cancellation, Admin Booking Management, Check-in และ Authentication** ได้ตาม Test Case ที่สามารถ Execute ใน Environment ปัจจุบัน

สำหรับข้อจำกัดที่ยังมีอยู่ ได้แก่ **Location จริง, Email Configuration และ TU API Simulation Mode** ซึ่งอาจทำให้บางกรณีไม่สามารถยืนยันผลจากระบบจริงได้ครบทุกสถานการณ์

สำหรับ **No-show และ Blacklist** ผลการทดสอบอ้างอิงจากการทดสอบของทีมโดยใช้ Mock Test Account แยกสำหรับการทดสอบ Flow ดังกล่าว และผลการทดสอบเป็นไปตาม Expected Result

นอกจากนี้พบ Bug ในส่วนของ **Edit Booking ที่สามารถเปลี่ยนวันที่เป็นวันเสาร์–อาทิตย์ได้** ซึ่งได้รายงานไว้สำหรับการตรวจสอบใน **Task 77 – Bug Fixing / Regression Test**