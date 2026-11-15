# Sprint 2 Test Report

## 1. Test Objective

รายงานฉบับนี้จัดทำขึ้นเพื่อสรุปผลการทดสอบของ Sprint 2 ในระดับ Unit Test, Integration Test, System Test และ UAT รวมถึงสรุปข้อจำกัดและ Bug ที่พบระหว่างการทดสอบ

---

## 2. Test Scope

การทดสอบครอบคลุมฟังก์ชันของ Sprint 2 ได้แก่

- US5 – Email Notification
- US6 – Edit Booking
- US7 – Admin Booking Management
- US8 – Check-in
- US9 – No-show
- US10 – Blacklist
- US11 – Logout / Access Control
- US12 – Room Closure
- US13 – ดู/ปลด Blacklist (Admin)
- US14 – Login Condition
- US15 – Login Validation
- UI v2
- Regression Test จาก Sprint 1
- Database changes จาก Task 69

---

## 3. Test Environment

- Frontend: `http://localhost:5500`
- Backend API: `http://localhost:3000`
- Database: PostgreSQL ผ่าน Docker
- Browser: Google Chrome
- Location Test: Chrome DevTools Location Simulation
- External TU API: Simulation / Mock Mode
- Email: ทดสอบ SMTP Failure Scenario ด้วย `SMTP_HOST=smtp.invalid`
- Test Account: Mock Test Account ที่กำหนดใน `MOCK_USERS`

---

## 4. Test Results

### 4.1 Unit Test

อ้างอิงผลการทดสอบจาก `docs/test/unit-test-sprint2.md` (Task 72) ซึ่งระบุว่า Unit Test ของ Sprint 2 ผ่านทั้งหมด **192/192 tests**

**Result: PASS – 192/192 tests**

---

### 4.2 Integration Test

#### UI ↔ API

มีการทดสอบการทำงานระหว่าง Frontend และ Backend ใน Flow ที่เกี่ยวข้องกับ Login, Booking, Edit Booking, Cancel Booking, Check-in และ Admin Management

ผลการทดสอบที่ดำเนินการแล้วพบว่าสามารถส่ง Request จาก UI ไปยัง API และได้รับ Response ตามเงื่อนไขที่กำหนดใน Test Case

**Result: PASS สำหรับ Flow ที่ดำเนินการทดสอบแล้ว**

#### API ↔ Database

มีการตรวจสอบข้อมูลที่เกิดจาก API กับ Database เช่น Booking, Booking Status, Check-in และ Email Logs รวมถึงตรวจสอบ Database Changes จาก Task 69

พบว่าข้อมูลที่เกิดจากการทดสอบถูกบันทึกและเปลี่ยนแปลงใน Database ตาม Flow ที่ทดสอบ

**Result: PASS สำหรับ Flow ที่ดำเนินการทดสอบแล้ว**

---

## 5. System Test

### US5 – Email Notification

#### US5 TC3 – Email Server Unavailable

ทดสอบโดยกำหนด `SMTP_HOST=smtp.invalid` เพื่อจำลองกรณี Email Server ไม่สามารถเชื่อมต่อได้

สามารถสร้าง Booking ได้สำเร็จ แต่ระบบไม่สามารถเชื่อมต่อ SMTP และบันทึก Email Log เป็น `FAILED` พร้อมข้อความ `getaddrinfo ENOTFOUND`

**Result: PASS**

---

### US6 – Edit Booking

| Test Case | Result | รายละเอียด |
|---|---|---|
| TC1 | PASS | สามารถแก้ไขเวลา Booking ได้สำเร็จ |
| TC2 | PASS | ระบบไม่อนุญาตให้แก้ไขเป็นช่วงเวลาที่ถูกจองแล้ว และแสดง 409 Conflict |
| TC3 | PASS | ระบบไม่อนุญาตให้แก้ไขเกิน 3 ชั่วโมง |
| TC4 | PASS | ระบบไม่อนุญาตให้แก้ไขเมื่อเหลือเวลาน้อยกว่า 30 นาที |

**Result: PASS – 4/4**

---

### US7 – Admin Booking Management

| Test Case | Result | รายละเอียด |
|---|---|---|
| TC1 | PASS | สามารถแสดงรายการ Booking ทั้งหมดสำหรับผู้ดูแลระบบได้ |
| TC2 | PASS | สามารถค้นหา Booking ด้วยรหัสนักศึกษาได้ |
| TC3 | PASS | สามารถกรอง Booking ด้วย Room และวันที่ได้ |
| TC4 | PASS | นักศึกษาทั่วไปไม่สามารถเข้าถึง Admin API และระบบตอบกลับ HTTP 403 Forbidden พร้อมข้อความ “เฉพาะเจ้าหน้าที่เท่านั้น” |
| TC5 | PASS | สามารถเข้าถึงและแสดงเมนูสำหรับผู้ดูแลระบบได้ |
| TC6 | PASS | สามารถแสดงรายงานสรุป Booking ของ Room A วันที่ 22/10/2026 ได้ โดยมี 1 CONFIRMED, 1 CANCELLED และ 1 EXPIRED (No-show) |

**Result: PASS – 6/6**

---

### US8 – Check-in

| Test Case | Result | รายละเอียด |
|---|---|---|
| TC1 | PASS | Check-in สำเร็จเมื่อผู้ใช้อยู่ภายในระยะที่กำหนด และ Booking เปลี่ยนสถานะเป็น `CONFIRMED` |
| TC2 | PENDING | รอทดสอบกรณี Check-in เมื่อผู้ใช้อยู่นอกระยะที่กำหนด |
| TC3 | PENDING | รอทดสอบกรณีผู้ใช้ปฏิเสธ Location Permission |
| TC4 | PASS | เมื่อไม่ Check-in ภายในเวลาที่กำหนด ระบบเปลี่ยนสถานะ Booking เป็น `EXPIRED` และไม่มีปุ่ม Check-in |

**Result: PENDING – 2 Test Cases remaining**

**หมายเหตุ:** การทดสอบ Location ใช้ Browser Location Simulation เนื่องจากไม่ได้ทดสอบจากสถานที่จริง

---

### US9 – No-show

ผลการทดสอบอ้างอิงจากการทดสอบของทีมโดยใช้ Mock Test Account แยกสำหรับการทดสอบ Flow ดังกล่าว

| Test Case | Result | รายละเอียด |
|---|---|---|
| TC1 | PASS | Booking ที่ไม่มีการ Check-in สามารถเข้าสู่สถานะ Expired / No-show ได้ |
| TC2 | PASS | Booking ที่ Check-in สำเร็จจะไม่ถูกนับเป็น No-show และแสดงจำนวน No-show เป็น 0/3 |
| TC3 | PASS | Cancelled Booking จะไม่ถูกนับเป็น No-show และแสดงจำนวน No-show เป็น 0/3 |

**Result: PASS – 3/3**

---

### US10 – Blacklist

ผลการทดสอบอ้างอิงจากการทดสอบของทีมโดยใช้ Mock Test Account แยกสำหรับการทดสอบ Flow ดังกล่าว

| Test Case | Result | รายละเอียด |
|---|---|---|
| TC1 | PASS | เมื่อ No-show ครบ 3 ครั้ง ระบบสามารถตรวจจับและระงับสิทธิ์การจองโดยอัตโนมัติ โดยกำหนด Blacklist ตั้งแต่ 15/11/2026 ถึง 15/12/2026 และส่ง Email แจ้งการระงับ |
| TC2 | PASS | ผู้ใช้ที่อยู่ใน Blacklist ไม่สามารถสร้าง Booking ได้ และระบบแสดงข้อความ “ถูกระงับสิทธิ์…ถึงวันที่ 15 ธันวาคม 2569” |
| TC3 | PASS | เมื่อ Blacklist หมดอายุ ผู้ใช้สามารถกลับมาจองห้องได้ตามปกติ |
| TC4 | PASS | ผู้ใช้ที่มี No-show 2 ครั้งยังสามารถสร้าง Booking ได้ และยังไม่ถูก Blacklist |

**Result: PASS – 4/4**

---

### US11 – Logout / Access Control

ทดสอบ Logout และทดลองเข้าหน้า Booking History โดยตรงหลังจาก Logout

ระบบ Redirect กลับไปหน้า Login และไม่อนุญาตให้เข้าหน้า Protected Page โดยไม่ได้ Login

**Result: PASS**

---

### US12 – Room Closure

ทดสอบกรณี Admin ปิดปรับปรุง Room C ในวันที่ 18/11/2026

ระบบไม่อนุญาตให้นักศึกษาจอง Room C ในวันที่ปิดปรับปรุง

**Result: PASS**

---

### US13 – ดู/ปลด Blacklist (Admin)

| Test Case | Result | รายละเอียด |
|---|---|---|
| TC1 | PENDING | PR #49 Merge แล้ว และสามารถดำเนินการทดสอบได้ โดยรอผลการทดสอบเพื่ออัปเดตสถานะ |

**Result: PENDING**

---

### US14 – Login Condition

| Test Case | Result | รายละเอียด |
|---|---|---|
| TC1 | PASS | ผู้ใช้ `6809650070` ซึ่งอยู่สาขาคณิตศาสตร์ไม่สามารถ Login เข้าสู่ระบบได้ |
| TC2 | PASS | ผู้ใช้ `6809650010` ซึ่งอยู่สาขาวิทยาการคอมพิวเตอร์สามารถ Login เข้าสู่ระบบได้สำเร็จ |
| TC3 | PASS | สามารถ Login ด้วยสิทธิ์ Admin และเข้าถึงเมนูจัดการ Booking ได้ |

**Result: PASS – 3/3**

---

### US15 – Login Validation

| Test Case | Result | รายละเอียด |
|---|---|---|
| TC1 | PASS | Student ID ถูกต้องแต่ Password ผิด ระบบปฏิเสธการ Login |
| TC2 | PASS | Student ID ผิดแต่ Password ถูกต้อง ระบบปฏิเสธการ Login |
| TC3 | PASS | Student ID และ Password ผิด ระบบปฏิเสธการ Login |
| TC4 | PASS | Student ID และ Password ถูกต้อง สามารถ Login ได้สำเร็จ |

**Result: PASS – 4/4**

---

## 6. Regression Test

ระหว่าง Regression Test พบ Bug ในกรณี Edit Booking

ระบบกำหนดให้สามารถจองได้เฉพาะวันจันทร์–ศุกร์ แต่พบว่าสามารถแก้ไข Booking เดิมให้เป็นวันเสาร์–อาทิตย์และบันทึกสำเร็จได้

ตัวอย่าง:

- Booking เดิม: `16/11/2026`
- แก้ไขเป็น: `15/11/2026` (วันอาทิตย์)

ได้แจ้ง Issue นี้ไว้ใน **Task 77 – Bug Fixing / Regression Test** และทีมได้ดำเนินการแก้ไข Validation แล้ว พร้อมเพิ่ม Test Case สำหรับวันเสาร์–อาทิตย์และวันปกติ

**Result: Fixed / Regression PASS**

**Regression Test – Sprint 1**

ดำเนินการ Regression Test สำหรับฟังก์ชันจาก Sprint 1 ตามขอบเขตของ Task 75 ได้แก่

- US1 TC1–TC2
- US2 TC1–TC2
- US3 TC1–TC6
- US4 TC1–TC5
- US5 TC1–TC2

**Result: PASS**

---

## 7. UAT Summary

UAT ของ Sprint 2 ยังไม่ได้ดำเนินการโดยผู้ทดลองใช้จริงในขณะจัดทำรายงานฉบับนี้

ผลการทดสอบที่ระบุในรายงานส่วน System Test เป็นผลจากการทดสอบโดยทีมพัฒนาและทีมทดสอบ ซึ่งไม่ถือเป็น UAT

สำหรับ UAT จะดำเนินการตาม Task 74 และจะอัปเดตผลการทดสอบเพิ่มเติมเมื่อได้รับผลจากผู้ทดลองใช้จริง

---

## 8. Test Limitations

### 8.1 Location

ไม่สามารถทดสอบ Location-based Test ในสถานที่จริงได้ จึงใช้ Chrome DevTools Location Simulation สำหรับกรณีที่สามารถจำลองได้

US8 TC1 และ TC4 สามารถ Execute และผ่านตาม Expected Result แล้ว ส่วน US8 TC2–TC3 ยังคงรอการ Execute เพิ่มเติม

### 8.2 Test Account

การทดสอบ No-show และ Blacklist สำหรับ US9 และ US10 อ้างอิงผลการทดสอบของทีมโดยใช้ Mock Test Account แยกสำหรับการทดสอบ Flow ดังกล่าว

บัญชีทดสอบถูกกำหนดไว้ใน `MOCK_USERS` ของ `.env` และไม่ใช่บัญชีจริงของนักศึกษา

จากผลการทดสอบของทีม สามารถยืนยันการทำงานของ No-show และ Blacklist ตาม Test Case ที่ดำเนินการแล้วได้

### 8.3 Email

สามารถทดสอบกรณี SMTP Server ไม่สามารถเชื่อมต่อได้โดยใช้ `SMTP_HOST=smtp.invalid`

ระบบสามารถสร้าง Booking ได้ แต่ Email Log ถูกบันทึกเป็น `FAILED` พร้อม `getaddrinfo ENOTFOUND`

อย่างไรก็ตาม ยังไม่ได้ทดสอบการส่ง Email ผ่าน SMTP Server จริง

### 8.4 TU API

เมื่อวันที่ 10/11/2026 ได้ทดสอบการทำงานร่วมกับ TU API จริงบน Docker สำหรับ US15 TC1–TC4, US14 TC1 และ US1 TC1

ผลการทดสอบอ้างอิงหลักฐานจาก Task 82 และ Task 63

อย่างไรก็ตาม Environment ปัจจุบันยังมีบางกรณีที่ใช้ Simulation / Mock Mode จึงยังไม่สามารถยืนยันการทำงานกับ TU API จริงได้ครบทุกสถานการณ์

---

## 9. Bugs / Issues Found

### BUG-01 – Edit Booking สามารถเลือกวันเสาร์–อาทิตย์ได้

พบว่า Edit Booking สามารถเปลี่ยนวันที่เป็นวันเสาร์หรือวันอาทิตย์และบันทึกได้สำเร็จ ทั้งที่ระบบกำหนดให้ Booking ได้เฉพาะวันจันทร์–ศุกร์

**Task:** Task 77

**Status:** Fixed / Regression Tested

หลังจากทีมแก้ไข Validation แล้ว ได้เพิ่ม Test Case สำหรับวันเสาร์–อาทิตย์และวันปกติ และ `npm test` ผ่าน **192/192 tests**

---

## 10. Conclusion

การทดสอบ Sprint 2 ได้ดำเนินการทั้งในส่วนของ Unit Test, Integration Test และ System Test ตาม Test Case ที่สามารถดำเนินการได้ใน Environment ปัจจุบัน

ผลการทดสอบของ Test Case ที่ Execute แล้วเป็นไปตาม Expected Result และถูกบันทึกเป็น PASS

ปัจจุบันยังมี Test Case ที่รอผลการทดสอบเพิ่มเติม ได้แก่ **US8 TC2–TC3 และ US13 TC1** จึงยังไม่ถือว่าการทดสอบ Sprint 2 เสร็จสมบูรณ์ทั้งหมด

US9 และ US10 สามารถยืนยันผลการทำงานตาม Test Case ที่ดำเนินการแล้วจากผลการทดสอบของทีมโดยใช้ Mock Test Account แยกสำหรับการทดสอบ Flow ดังกล่าว

ยังมีข้อจำกัดในส่วนของการทดสอบ Location จริง, SMTP Server จริง และ TU API จริง ซึ่งยังไม่สามารถยืนยันผลจากระบบจริงได้ครบทุกสถานการณ์

นอกจากนี้ BUG-01 ในส่วนของ Edit Booking ได้รับการแก้ไขแล้ว และมีการเพิ่ม Test Case สำหรับตรวจสอบเงื่อนไขวันจันทร์–ศุกร์และวันเสาร์–อาทิตย์ โดยผลการทดสอบ `npm test` ผ่าน **192/192 tests**