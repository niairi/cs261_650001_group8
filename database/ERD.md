# Database ER Diagram

## Sprint 2 – US8, US9, US10

```mermaid
erDiagram

    USERS ||--o{ BOOKING : makes
    ROOM ||--o{ BOOKING : has
    BOOKING ||--o{ EMAIL_LOGS : generates

    USERS ||--o{ BLACKLIST : receives
    BOOKING ||--o| BLACKLIST : triggers

    USERS {
        varchar student_id PK
        varchar name_th
        varchar name_en
        varchar email
        varchar type
        varchar department
        varchar faculty
        varchar role
        timestamp created_at
        timestamp last_login_at
    }

    ROOM {
        bigint room_id PK
        varchar room_name
        integer capacity
        varchar location
        boolean is_active
        decimal latitude
        decimal longitude
    }

    BOOKING {
        bigint booking_id PK
        varchar student_id FK
        bigint room_id FK
        date booking_date
        time start_time
        time end_time
        integer people
        varchar purpose
        varchar status
        timestamp created_at
        timestamp confirmed_at
    }

    EMAIL_LOGS {
        bigint email_log_id PK
        bigint booking_id FK
        varchar to_email
        varchar email_type
        varchar status
        text error_message
        timestamp created_at
    }

    BLACKLIST {
        bigint blacklist_id PK
        varchar student_id FK
        bigint trigger_booking_id FK
        date start_date
        date end_date
        varchar reason
        timestamp created_at
    }
```

## Table Descriptions

### USERS

เก็บข้อมูลผู้ใช้งานระบบ

### ROOM

เก็บข้อมูลห้อง โดยเพิ่ม `latitude` และ `longitude` สำหรับตรวจสอบตำแหน่งขณะ Check-in (US8)

### BOOKING

เก็บข้อมูลการจอง โดยใช้ `confirmed_at` สำหรับบันทึกเวลาที่ Check-in สำเร็จ และ `status = 'EXPIRED'` สำหรับรายการ No-show (US8, US9)

### EMAIL_LOGS

เก็บประวัติการส่งอีเมลของระบบ เช่น อีเมลแจ้งเตือน Blacklist

### BLACKLIST

เก็บประวัติการระงับสิทธิ์การจองของผู้ใช้ โดยบันทึกผู้ใช้ Booking ที่เป็นต้นเหตุ วันที่เริ่ม–สิ้นสุด และเหตุผล (US10)

## Relationships

| Relationship | Description |
|---|---|
| USERS 1:N BOOKING | ผู้ใช้หนึ่งคนสามารถจองได้หลายครั้ง |
| ROOM 1:N BOOKING | ห้องหนึ่งห้องมีรายการจองได้หลายรายการ |
| BOOKING 1:N EMAIL_LOGS | รายการจองหนึ่งรายการมีประวัติการส่งอีเมลได้หลายรายการ |
| USERS 1:N BLACKLIST | ผู้ใช้หนึ่งคนมีประวัติ Blacklist ได้หลายรายการ |
```