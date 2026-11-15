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

- **US7-TC1:** PASS — สามารถค้นหา Booking ด้วย Student ID ได้
- **US7-TC2:** PASS — สามารถค้นหา Booking ด้วย Room ได้
- **US7-TC3:** PASS — สามารถค้นหา Booking ด้วยวันที่ได้
- **US7-TC4:** PASS — สามารถค้นหา Booking ด้วย Student ID และ Room ร่วมกันได้
- **US7-TC5:** PASS — สามารถแสดงข้อมูล Booking ตามเงื่อนไขที่ค้นหาได้
- **US7-TC6:** PASS — สามารถใช้งาน Report / Filter สำหรับรายการ Booking ได้

**หมายเหตุ:** US7 TC3 มีความแตกต่างระหว่างวันที่ในตัวอย่าง Test Case กับ Seed Data โดย Test Case ระบุวันที่ 22/10/2026 ขณะที่ Seed Data มีข้อมูลวันที่ 20/10/2026 จึงไม่ได้แก้ไข Seed Data โดยไม่ได้รับการยืนยันจากทีม

### US8 – Check-in

- **US8-TC1:** PASS — สามารถ Check-in ได้สำเร็จเมื่อผู้ใช้อยู่ภายในระยะที่กำหนด และ Booking เปลี่ยนสถานะเป็น `CONFIRMED`
- **US8-TC2:** PENDING — ระบบสามารถ Reject Check-in เมื่ออยู่นอกระยะที่กำหนดได้ แต่ยังไม่ได้ยืนยันว่า Booking ยังคงสถานะ `BOOKED` หลังจาก Reject
- **US8-TC3:** PENDING — ยังไม่ได้ทดสอบกรณีผู้ใช้ปฏิเสธ Location Permission
- **US8-TC4:** PENDING — ยังไม่ได้ทดสอบกรณีไม่ Check-in ภายในเวลาที่กำหนดจน Booking เปลี่ยนเป็น `EXPIRED`

### US9 – No-show

- **US9-TC1:** PASS — Booking ที่ไม่มีการ Check-in สามารถเข้าสู่สถานะ Expired / No-show ได้
- **US9-TC2:** PENDING — ยังไม่ได้ทดสอบว่า Booking ที่ Check-in สำเร็จจะไม่ถูกนับเป็น No-show
- **US9-TC3:** PENDING — ยังไม่ได้ทดสอบว่า Cancelled Booking จะไม่ถูกนับเป็น No-show

### US10 – Blacklist

- **US10-TC1:** PENDING — ยังไม่ได้ทดสอบกรณี No-show ครบ 3 ครั้งและการเข้าสู่ Blacklist
- **US10-TC2:** PENDING — ยังไม่ได้ทดสอบกรณีผู้ใช้ที่อยู่ใน Blacklist ไม่สามารถจองห้องได้
- **US10-TC3:** PENDING — ยังไม่ได้ทดสอบกรณี Blacklist หมดอายุแล้วสามารถกลับมาจองได้
- **US10-TC4:** PENDING — ยังไม่ได้ทดสอบกรณีมี No-show 2 ครั้งและยังสามารถจองได้

### US11 – Logout / Authentication

- **US11-TC1:** PASS — หลังจาก Logout ระบบนำผู้ใช้กลับไปยังหน้า Login และไม่อนุญาตให้เข้าถึง Protected Page โดยไม่มี Authentication

### US14 – User Authorization

- **US14-TC1:** PENDING — ยังไม่ได้ทดสอบกรณีผู้ใช้ไม่ผ่านเงื่อนไขที่กำหนด
- **US14-TC2:** PENDING — ยังไม่ได้ยืนยันผลการ Login ของผู้ใช้ที่ผ่านเงื่อนไข Student / Faculty ตาม Test Case
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

บาง Test Case จำเป็นต้องทดสอบโดยใช้ Location จริงและต้องอยู่ภายในสถานที่ตามเงื่อนไขที่กำหนด โดยเฉพาะ Test Case ที่เกี่ยวข้องกับการ Check-in และการตรวจสอบระยะห่างจากห้อง

เนื่องจากการทดสอบในรอบนี้ไม่ได้ดำเนินการจากสถานที่จริง จึงไม่สามารถ Execute Test Case ที่ต้องใช้ Location จริงได้ครบทุกกรณี

อย่างไรก็ตาม สามารถทดสอบ Location-based Check-in บางกรณีผ่าน Browser Location Simulation ได้ และ **US8 TC1 สามารถทดสอบได้สำเร็จ** โดยจำลองพิกัดให้อยู่ในตำแหน่งเดียวกับ Room

### 4.2 Test Account / Mock Account

พบประเด็นเกี่ยวกับ Test Account ที่ใช้สำหรับการทดสอบ โดย **Mock Test Account ใช้ Student ID เดียวกับ Student ID จริงของนักศึกษา**

ในระหว่างการทดสอบพบว่า Student ID ดังกล่าวเกิด No-show จากการทดสอบแล้ว 1 ครั้ง จึงหยุดการทดสอบ No-show / Blacklist เพิ่มเติม เพื่อป้องกันไม่ให้เกิด No-show ครบ 3 ครั้งและทำให้ Student ID ดังกล่าวถูก Blacklist

**เดี๋ยวจะมีการหารือกับ PO** เกี่ยวกับแนวทางการจัดการ Test Account เนื่องจากมีความกังวลว่า หาก Mock Account และ Real Student ID ใช้รหัสเดียวกัน และระบบถูกนำไปใช้งานจริง ข้อมูลที่เกิดจากการทดสอบอาจส่งผลต่อสถานะของผู้ใช้งานจริงได้

ดังนั้น Test Case ที่ต้องสร้าง No-show เพิ่มเติมหรือทดสอบ Blacklist จึงถูกกำหนดเป็น **PENDING** ไว้ก่อน จนกว่าจะมี Test Account หรือแนวทางที่เหมาะสมสำหรับการทดสอบ

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
- ไม่มีการระบุ PASS สำหรับ Test Case ที่ยังไม่ได้ Execute จริง
- Test Case ที่เกี่ยวข้องกับ No-show / Blacklist ถูกหยุดไว้ชั่วคราวเพื่อป้องกันผลกระทบต่อ Student ID จริงที่ใช้เป็น Mock Test Account

---

## 6. Conclusion

การทดสอบ Sprint 2 สามารถตรวจสอบการทำงานหลักของระบบในส่วนของ **Database Integration, Login, Booking, Edit Booking, Cancellation, Admin Booking Management, Check-in และ Authentication** ได้ในระดับที่สามารถ Execute ได้ใน Environment ปัจจุบัน

สำหรับ Test Case ที่ยังไม่สามารถดำเนินการได้ครบ สาเหตุหลักมาจากข้อจำกัดด้าน **Location, Test Account, Email Configuration และ TU API Simulation Mode**

โดยเฉพาะ Test Case ที่เกี่ยวข้องกับ **No-show และ Blacklist** ได้หยุดการทดสอบเพิ่มเติมไว้ก่อน เนื่องจากพบว่า Mock Test Account ใช้ Student ID เดียวกับ Student ID จริงของนักศึกษา และมีการเกิด No-show จากการทดสอบแล้ว จึงจำเป็นต้องป้องกันไม่ให้เกิด Blacklist กับผู้ใช้งานจริงโดยไม่ตั้งใจ

**เดี๋ยวจะมีการหารือกับ PO** เพื่อหาแนวทางในการจัดการ Test Account และการทดสอบในส่วนนี้ต่อไป

นอกจากนี้พบ Bug ในส่วนของ **Edit Booking ที่สามารถเปลี่ยนวันที่เป็นวันเสาร์–อาทิตย์ได้** ซึ่งได้รายงานไว้สำหรับการตรวจสอบใน **Task 77**