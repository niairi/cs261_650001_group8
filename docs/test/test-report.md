# Test Report

## 1. Integration Test

### UI ↔ API
- **INT-UI-04:** PASS — สามารถจองห้องผ่านระบบได้สำเร็จ
- **INT-UI-05:** PASS — สามารถแสดงรายการจองของผู้ใช้ได้
- **INT-UI-06:** PASS — สามารถยกเลิกการจองได้สำเร็จ
- **INT-UI-07:** PASS — ระบบป้องกันการเรียก API โดยไม่มี Authentication

### API ↔ Database
- **INT-DB-01:** PASS — ตรวจสอบข้อมูลผู้ใช้และการ Login ได้
- **INT-DB-02:** PASS — ตรวจสอบข้อมูลห้องในฐานข้อมูลได้
- **INT-DB-03:** PASS — ตรวจสอบข้อมูลตารางการจองได้
- **INT-DB-04:** PASS — ตรวจสอบการสร้างข้อมูลการจองได้
- **INT-DB-05:** PASS — ระบบป้องกันการจองห้องในช่วงเวลาซ้ำกัน
- **INT-DB-06:** PASS — สามารถเรียกดูรายการจองของผู้ใช้ได้
- **INT-DB-07:** PASS — สามารถยกเลิกการจองและเปลี่ยนสถานะได้
- **INT-DB-08:** PASS — ระบบป้องกันการยกเลิกการจองโดยไม่มี Authentication

### External Services
- **INT-EXT-01:** PASS — Login และการเชื่อมต่อ TU API ใน Simulation Mode ทำงานได้
- **INT-EXT-02:** Not Testable — ไม่สามารถทดสอบ Invalid Credentials กับ TU API จริง เนื่องจากระบบอยู่ใน Simulation Mode
- **INT-EXT-03:** Not Testable — ไม่สามารถทดสอบกรณี TU API ไม่พร้อมใช้งาน เนื่องจากระบบอยู่ใน Simulation Mode
- **INT-EXT-04:** Not Fully Testable — Email Log ถูกสร้าง แต่การส่ง Email ถูก SKIPPED เนื่องจากยังไม่ได้ตั้งค่า SMTP
- **INT-EXT-05:** Not Fully Testable — Email Log ถูกสร้าง แต่การส่ง Email ถูก SKIPPED เนื่องจากยังไม่ได้ตั้งค่า SMTP
- **INT-EXT-06:** PASS — ระบบสามารถบันทึก Email Log ได้

---

## 2. System Test

### SYS-01: Login → ดูตารางห้อง → จองห้อง → Email
- Login สำเร็จ
- สามารถดูตารางห้องได้
- สามารถจองห้องได้สำเร็จ
- มีการบันทึก Email Log แต่ยังไม่สามารถส่ง Email จริงได้ เนื่องจากไม่ได้ตั้งค่า SMTP

**ผลการทดสอบ: Completed**

### SYS-02: ดูรายการจอง → ยกเลิกการจอง → Email
- สามารถดูรายการจองได้
- สามารถยกเลิกการจองได้สำเร็จ
- มีการบันทึก Email Log แต่ยังไม่สามารถส่ง Email จริงได้ เนื่องจากไม่ได้ตั้งค่า SMTP

**ผลการทดสอบ: Completed**

---

## 3. Test Limitations

- TU API บางกรณียังไม่สามารถทดสอบกับระบบจริงได้ เนื่องจากระบบอยู่ใน **Simulation Mode**
- การส่ง Email จริงยังไม่สามารถทดสอบได้ เนื่องจากยังไม่ได้ตั้งค่า **SMTP**

---

## 4. Conclusion

ระบบสามารถทดสอบการทำงานหลักของ **Login, Room Schedule, Booking, Cancellation และ Database Integration** ได้สำเร็จ

ส่วนการเชื่อมต่อกับ TU API ในบางกรณีและการส่ง Email จริงยังไม่สามารถทดสอบได้ เนื่องจากข้อจำกัดด้าน Environment Configuration