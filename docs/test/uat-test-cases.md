# UAT Test Cases — TU CS Space

## 1. Purpose

เอกสารนี้ใช้สำหรับออกแบบ User Acceptance Test (UAT) สำหรับ Sprint 2

โดยเน้นการทดสอบการใช้งานระบบจากมุมมองของผู้ใช้จริง ตาม User Stories และ Test Cases ที่กำหนดไว้ใน Trello

UAT ครอบคลุม:

- US5 TC3
- US6 TC1–TC4
- US7 TC1–TC6
- US8 TC1–TC5
- US9 TC1–TC4
- US10 TC1–TC4
- US11 TC1
- US12 TC1–TC7
- US13 TC1–TC6
- US14 TC1–TC3
- US15 TC1–TC4
- UI v2

> หมายเหตุ: UAT เป็นการทดสอบจากมุมมองของผู้ใช้ จึงเน้นผลลัพธ์ที่ผู้ใช้สามารถตรวจสอบได้จากหน้าจอและการใช้งานระบบจริง โดยไม่เน้นรายละเอียดภายใน API หรือ Database

---

## 2. UAT Test Cases

### UAT-01 — Booking สำเร็จแม้ไม่สามารถส่ง Email ได้

**User Story:** US5 TC3

**Given:** เซิร์ฟเวอร์ Email ไม่สามารถใช้งานได้

**When:** ผู้ใช้ทำการจองห้องและยืนยันการจองสำเร็จ

**Then:**
- ระบบบันทึก Booking สำเร็จ
- ผู้ใช้ยังสามารถเห็นรายการ Booking ที่สร้างขึ้น
- ระบบบันทึกผลการส่ง Email เป็น Failed
- การจองไม่ถูกยกเลิกเนื่องจาก Email ส่งไม่สำเร็จ

---

### UAT-02 — แก้ไข Booking สำเร็จ

**User Story:** US6 TC1

**Given:** ผู้ใช้มี Booking ที่สามารถแก้ไขได้

**When:** ผู้ใช้แก้ไขวันหรือเวลาของ Booking และยืนยันการแก้ไข

**Then:**
- ระบบบันทึกข้อมูลใหม่สำเร็จ
- รายการ Booking แสดงวันและเวลาใหม่ถูกต้อง

---

### UAT-03 — แก้ไข Booking ที่เวลาชนกับรายการอื่น

**User Story:** US6 TC2

**Given:** มี Booking อื่นอยู่ในช่วงเวลาที่ผู้ใช้ต้องการแก้ไข

**When:** ผู้ใช้แก้ไข Booking ไปยังช่วงเวลาที่มีการจองแล้ว

**Then:**
- ระบบไม่อนุญาตให้แก้ไข
- ระบบแจ้งว่าช่วงเวลานั้นไม่สามารถจองได้
- Booking เดิมยังคงอยู่

---

### UAT-04 — แก้ไข Booking เกิน 3 ชั่วโมง

**User Story:** US6 TC3

**Given:** ผู้ใช้มี Booking ที่สามารถแก้ไขได้

**When:** ผู้ใช้แก้ไขช่วงเวลาให้มีระยะเวลาเกิน 3 ชั่วโมง

**Then:**
- ระบบไม่อนุญาตให้บันทึก
- ระบบแจ้งว่าระยะเวลาการจองเกินกำหนด

---

### UAT-05 — แก้ไข Booking ต่ำกว่า 30 นาที

**User Story:** US6 TC4

**Given:** ผู้ใช้มี Booking ที่สามารถแก้ไขได้

**When:** ผู้ใช้แก้ไข Booking ให้มีระยะเวลาต่ำกว่า 30 นาที

**Then:**
- ระบบไม่อนุญาตให้บันทึก
- ระบบแสดงข้อความแจ้งเตือนตามเงื่อนไขของระบบ

---

### UAT-06 — Admin ดูรายการ Booking ทั้งหมด

**User Story:** US7 TC1

**Given:** ผู้ใช้ Login ด้วยสิทธิ์ Admin

**When:** เปิดหน้าจัดการ Booking

**Then:** ระบบแสดงรายการ Booking ที่ Admin สามารถจัดการได้

---

### UAT-07 — Admin ค้นหา Booking ด้วย Student ID

**User Story:** US7 TC2

**Given:** Admin อยู่ในหน้าจัดการ Booking

**When:** ค้นหา Booking ด้วย Student ID

**Then:** ระบบแสดงเฉพาะรายการ Booking ที่ตรงกับ Student ID

---

### UAT-08 — Admin Filter Booking

**User Story:** US7 TC3

**Given:** Admin อยู่ในหน้าจัดการ Booking

**When:** เลือกเงื่อนไขการค้นหา เช่น ห้องหรือวันที่

**Then:** ระบบแสดงรายการ Booking ที่ตรงกับเงื่อนไข

---

### UAT-09 — Non-admin ไม่สามารถเข้าหน้าจัดการ Booking

**User Story:** US7 TC4

**Given:** ผู้ใช้ Login ด้วยสิทธิ์ทั่วไป

**When:** พยายามเข้าหน้าจัดการ Booking ของ Admin

**Then:** ระบบไม่อนุญาตให้เข้าถึงหน้าดังกล่าว

---

### UAT-10 — Admin เห็นเมนูจัดการ Booking

**User Story:** US7 TC5

**Given:** ผู้ใช้ Login ด้วยสิทธิ์ Admin

**When:** เข้าสู่ระบบ

**Then:** ระบบแสดงเมนูสำหรับจัดการ Booking

---

### UAT-11 — Admin ดู Summary Report

**User Story:** US7 TC6

**Given:** Admin อยู่ในหน้าจัดการ Booking

**When:** เปิดส่วน Summary Report

**Then:** ระบบแสดงข้อมูลสรุป Booking ตามข้อมูลที่มีอยู่ในระบบ

---

### UAT-12 — Check-in สำเร็จภายในระยะ 5 เมตร

**User Story:** US8 TC1

**Given:** ผู้ใช้มี Booking Room 101 และอยู่ภายในระยะ 5 เมตรจากห้อง

**When:** ผู้ใช้กดยืนยันการเข้าใช้งานในช่วงเวลาที่กำหนด

**Then:**
- ระบบยืนยันการ Check-in สำเร็จ
- สถานะ Booking เปลี่ยนเป็น `CONFIRMED`

---

### UAT-13 — Check-in นอกระยะ

**User Story:** US8 TC2

**Given:** ผู้ใช้อยู่ห่างจากห้องเกิน 5 เมตร

**When:** ผู้ใช้กดยืนยันการเข้าใช้งาน

**Then:**
- ระบบไม่อนุญาตให้ Check-in
- ระบบแจ้งว่าผู้อยูู่่นอกระยะที่กำหนด
- สถานะ Booking ยังคงเป็น `BOOKED`

---

### UAT-14 — ไม่อนุญาต Location

**User Story:** US8 TC3

**Given:** ผู้ใช้ปฏิเสธการอนุญาต Location

**When:** ผู้ใช้กดยืนยันการเข้าใช้งาน

**Then:** ระบบแจ้งให้ผู้ใช้อนุญาต Location ก่อนจึงจะสามารถ Check-in ได้

---

### UAT-15 — Check-in หลังหมดเวลา

**User Story:** US8 TC4

**Given:** Booking หมดเวลาที่กำหนดและผู้ใช้ไม่ได้ Check-in

**When:** ผู้ใช้พยายาม Check-in หลังหมดเวลา

**Then:**
- ระบบไม่อนุญาตให้ Check-in
- ระบบแจ้งว่าเลยเวลายืนยันการเข้าใช้งานแล้ว
- สถานะ Booking เป็น `EXPIRED`

---

### UAT-16 — Check-in ก่อนเวลา

**User Story:** US8 TC5

**Given:** ผู้ใช้มี Booking ที่ยังไม่ถึงเวลาที่สามารถ Check-in ได้

**When:** ผู้ใช้พยายาม Check-in ก่อนเวลา

**Then:**
- ระบบไม่อนุญาตให้ Check-in
- ระบบแจ้งว่ายังไม่ถึงเวลาที่สามารถยืนยันการเข้าใช้งาน
- สถานะ Booking ยังคงเป็น `BOOKED`

---

### UAT-17 — ไม่ Check-in แล้ว Booking เป็น No-show

**User Story:** US9 TC1

**Given:** ผู้ใช้มี Booking แต่ไม่ได้ Check-in

**When:** ถึงเวลาที่ระบบกำหนดให้ Booking หมดอายุ

**Then:** Booking เปลี่ยนเป็น `EXPIRED` และถูกนับเป็น No-show

---

### UAT-18 — Check-in แล้วไม่ถูกนับเป็น No-show

**User Story:** US9 TC2

**Given:** ผู้ใช้มี Booking

**When:** ผู้ใช้ Check-in สำเร็จ

**Then:** Booking ไม่ถูกนับเป็น No-show

---

### UAT-19 — ยกเลิก Booking ตามเงื่อนไข

**User Story:** US9 TC3

**Given:** ผู้ใช้ยกเลิก Booking ตามเงื่อนไขที่ระบบกำหนด

**When:** การยกเลิก Booking สำเร็จ

**Then:** Booking ไม่ถูกนับเป็น No-show

---

### UAT-20 — ตรวจสอบจำนวน No-show

**User Story:** US9 TC4

**Given:** ผู้ใช้มีประวัติ No-show

**When:** ผู้ใช้หรือระบบตรวจสอบข้อมูล No-show

**Then:** ระบบแสดงจำนวน No-show ถูกต้อง

---

### UAT-21 — No-show ครบ 3 ครั้งแล้วถูก Blacklist

**User Story:** US10 TC1

**Given:** ผู้ใช้มี No-show ครบ 3 ครั้ง

**When:** ระบบตรวจสอบจำนวน No-show

**Then:** ผู้ใช้ถูก Blacklist ตามระยะเวลาที่กำหนด

---

### UAT-22 — ผู้ถูก Blacklist ไม่สามารถจองห้อง

**User Story:** US10 TC2

**Given:** ผู้ใช้ยังอยู่ในช่วง Blacklist

**When:** ผู้ใช้พยายามจองห้อง

**Then:**
- ระบบไม่อนุญาตให้สร้าง Booking
- ระบบแจ้งว่าผู้ใช้ถูกระงับสิทธิ์การจอง

---

### UAT-23 — พ้นระยะ Blacklist แล้วสามารถจองได้

**User Story:** US10 TC3

**Given:** ระยะเวลา Blacklist ของผู้ใช้สิ้นสุดแล้ว

**When:** ผู้ใช้ทำการจองห้อง

**Then:** ระบบอนุญาตให้สร้าง Booking ได้

---

### UAT-24 — No-show ยังไม่ครบ 3 ครั้ง

**User Story:** US10 TC4

**Given:** ผู้ใช้มี No-show เพียง 2 ครั้ง

**When:** ผู้ใช้ทำการจองห้อง

**Then:** ระบบยังอนุญาตให้จองได้

---

### UAT-25 — Logout

**User Story:** US11 TC1

**Given:** ผู้ใช้ Login อยู่ในระบบ

**When:** ผู้ใช้กด Logout

**Then:**
- ระบบออกจากระบบสำเร็จ
- ผู้ใช้ถูกนำกลับไปยังหน้า Login
- ผู้ใช้ไม่สามารถเข้าหน้าที่ต้อง Login ได้โดยตรง

---

### UAT-26 — จัดการสถานะห้อง

**User Story:** US12 TC1

**Given:** Admin อยู่ในหน้าจัดการห้อง

**When:** Admin ปรับสถานะห้องตามเงื่อนไขของระบบ

**Then:**
- ระบบแสดงสถานะห้องใหม่ถูกต้อง
- สถานะห้องแสดงถูกต้องบนหน้าจอจองห้อง

---

### UAT-27 — US12 TC2

**User Story:** US12 TC2

**Given:** ผู้ใช้หรือ Admin อยู่ในหน้าจัดการห้องตามสิทธิ์ที่กำหนด

**When:** ดำเนินการตามเงื่อนไขของ TC2

**Then:** ระบบแสดงผลการดำเนินการของ TC2 ถูกต้องตามที่กำหนด

---

### UAT-28 — US12 TC3

**User Story:** US12 TC3

**Given:** ผู้ใช้หรือ Admin อยู่ในหน้าจัดการห้องตามสิทธิ์ที่กำหนด

**When:** ดำเนินการตามเงื่อนไขของ TC3

**Then:** ระบบแสดงผลการดำเนินการของ TC3 ถูกต้องตามที่กำหนด

---

### UAT-29 — US12 TC4

**User Story:** US12 TC4

**Given:** ผู้ใช้หรือ Admin อยู่ในหน้าจัดการห้องตามสิทธิ์ที่กำหนด

**When:** ดำเนินการตามเงื่อนไขของ TC4

**Then:** ระบบแสดงผลการดำเนินการของ TC4 ถูกต้องตามที่กำหนด

---

### UAT-30 — US12 TC5

**User Story:** US12 TC5

**Given:** ผู้ใช้หรือ Admin อยู่ในหน้าจัดการห้องตามสิทธิ์ที่กำหนด

**When:** ดำเนินการตามเงื่อนไขของ TC5

**Then:** ระบบแสดงผลการดำเนินการของ TC5 ถูกต้องตามที่กำหนด

---

### UAT-31 — US12 TC6

**User Story:** US12 TC6

**Given:** ผู้ใช้หรือ Admin อยู่ในหน้าจัดการห้องตามสิทธิ์ที่กำหนด

**When:** ดำเนินการตามเงื่อนไขของ TC6

**Then:** ระบบแสดงผลการดำเนินการของ TC6 ถูกต้องตามที่กำหนด

---

### UAT-32 — US12 TC7

**User Story:** US12 TC7

**Given:** ผู้ใช้หรือ Admin อยู่ในหน้าจัดการห้องตามสิทธิ์ที่กำหนด

**When:** ดำเนินการตามเงื่อนไขของ TC7

**Then:** ระบบแสดงผลการดำเนินการของ TC7 ถูกต้องตามที่กำหนด

---

### UAT-33 — Admin ยกเลิก Blacklist

**User Story:** US13 TC1

**Given:** มีผู้ใช้อยู่ใน Blacklist

**When:** Admin เลือกยกเลิก Blacklist

**Then:** ระบบยกเลิกสถานะ Blacklist และผู้ใช้สามารถกลับมาใช้งานตามเงื่อนไขของระบบได้

---

### UAT-34 — Admin ดูรายการ Blacklist

**User Story:** US13 TC2

**Given:** Admin Login สำเร็จ

**When:** เปิดหน้าจัดการ Blacklist

**Then:** ระบบแสดงรายการผู้ใช้ที่อยู่ใน Blacklist พร้อมข้อมูลที่เกี่ยวข้อง

---

### UAT-35 — Non-admin ไม่สามารถจัดการ Blacklist

**User Story:** US13 TC3

**Given:** ผู้ใช้ Login ด้วยสิทธิ์ทั่วไป

**When:** พยายามเข้าหน้าจัดการ Blacklist

**Then:** ระบบไม่อนุญาตให้เข้าถึงหรือแก้ไขข้อมูล Blacklist

---

### UAT-36 — ตรวจสอบจำนวน No-show หลังยกเลิก Blacklist

**User Story:** US13 TC4

**Given:** ผู้ใช้ถูกยกเลิก Blacklist

**When:** ตรวจสอบข้อมูลผู้ใช้

**Then:** ระบบแสดงข้อมูล No-show ตามประวัติที่มีอยู่จริง

---

### UAT-37 — ยกเลิก Blacklist ของผู้ใช้ที่ไม่ได้ถูก Blacklist

**User Story:** US13 TC5

**Given:** ผู้ใช้ไม่ได้อยู่ใน Blacklist

**When:** Admin พยายามยกเลิก Blacklist

**Then:** ระบบไม่สร้างผลกระทบที่ไม่ถูกต้องกับข้อมูลของผู้ใช้

---

### UAT-38 — บันทึกผู้ที่ยกเลิก Blacklist

**User Story:** US13 TC6

**Given:** Admin ยกเลิก Blacklist ของผู้ใช้

**When:** การดำเนินการสำเร็จ

**Then:** ระบบบันทึกข้อมูลผู้ที่ดำเนินการยกเลิก Blacklist

---

### UAT-39 — Login ของผู้ใช้ต่างสาขาไม่ผ่าน

**User Story:** US14 TC1

**Given:** ผู้ใช้มีข้อมูลสาขาที่ไม่อยู่ในเงื่อนไขที่ระบบอนุญาต

**When:** ผู้ใช้ Login

**Then:** ระบบปฏิเสธการ Login

---

### UAT-40 — Login ของนักศึกษา Computer Science

**User Story:** US14 TC2

**Given:** ผู้ใช้เป็นนักศึกษา Computer Science และข้อมูล Login ถูกต้อง

**When:** ผู้ใช้ Login

**Then:** ระบบอนุญาตให้ Login สำเร็จ

---

### UAT-41 — Login ของ Admin

**User Story:** US14 TC3

**Given:** ผู้ใช้เป็น Admin ที่มีสิทธิ์ตามที่ระบบกำหนด

**When:** ผู้ใช้ Login

**Then:** ระบบอนุญาตให้ Login และแสดงสิทธิ์ของ Admin ถูกต้อง

---

### UAT-42 — Student ID ถูกต้อง แต่ Password ผิด

**User Story:** US15 TC1

**Given:** Student ID ถูกต้อง แต่ Password ไม่ถูกต้อง

**When:** ผู้ใช้ Login

**Then:** ระบบปฏิเสธการ Login และแสดงข้อความแจ้งเตือน

---

### UAT-43 — Student ID ผิด แต่ Password ถูกต้อง

**User Story:** US15 TC2

**Given:** Student ID ไม่ถูกต้อง แต่ Password ถูกต้อง

**When:** ผู้ใช้ Login

**Then:** ระบบปฏิเสธการ Login

---

### UAT-44 — Student ID และ Password ผิด

**User Story:** US15 TC3

**Given:** Student ID และ Password ไม่ถูกต้อง

**When:** ผู้ใช้ Login

**Then:** ระบบปฏิเสธการ Login

---

### UAT-45 — Student ID และ Password ถูกต้อง

**User Story:** US15 TC4

**Given:** Student ID และ Password ถูกต้อง และผู้ใช้ผ่านเงื่อนไขของระบบ

**When:** ผู้ใช้ Login

**Then:** ระบบอนุญาตให้ Login และเข้าสู่หน้าหลักของระบบสำเร็จ

---

## 3. UI v2 Acceptance Test

### UAT-46 — ตรวจสอบการใช้งาน UI v2

**Given:** ระบบแสดง UI v2 ตามแบบ Figma v2

**When:** ผู้ใช้ดำเนินการ Login, ดูห้อง, จองห้อง, ตรวจสอบ Booking และดำเนินการตาม Flow ที่เกี่ยวข้อง

**Then:**
- ผู้ใช้สามารถดำเนินการตาม Flow ได้ครบถ้วน
- ข้อมูลที่แสดงบน UI สอดคล้องกับผลลัพธ์ของระบบ
- ปุ่มและข้อความสำคัญสามารถใช้งานได้
- สถานะ Booking และข้อความแจ้งเตือนแสดงถูกต้อง

---

> **หมายเหตุ:** เอกสารนี้เป็น UAT Test Case Design สำหรับ Task 71 ยังไม่มีการ Execute Test จริง