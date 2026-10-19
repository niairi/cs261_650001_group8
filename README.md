# cs261_650001_group8 : TU CS Space

ระบบจองห้อง **CS Co-Working Space** ภาควิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยธรรมศาสตร์
โปรเจกต์วิชา CS261 Software Engineering · กลุ่ม 8 (ภาคพิเศษ) section 650001 · พัฒนาด้วยกระบวนการ Scrum

## ฟีเจอร์ Sprint 1 (Release 1)

| US | ฟีเจอร์ |
|---|---|
| US1 | Login ด้วย TU Account (TU REST API) |
| US2 | ตารางสถานะห้องว่าง/ไม่ว่าง แบบ Real-time (09:00–17:00) |
| US3 | จองห้องล่วงหน้า (ครั้งละไม่เกิน 3 ชม. ล่วงหน้าไม่เกิน 7 วัน) |
| US4 | ดูรายการจองของฉัน และยกเลิกการจอง |
| US5 | อีเมลยืนยันการจอง / การยกเลิก |

## เทคโนโลยี

| ส่วน | ใช้ |
|---|---|
| Frontend | HTML, CSS, JavaScript (เสิร์ฟด้วย Nginx) |
| Backend | Node.js + Express 5, pg, jsonwebtoken, nodemailer |
| Database | PostgreSQL 16 |
| Infrastructure | Docker, docker compose |

## โครงสร้างโปรเจกต์

```
backend/            Node.js Express API (src/routes, services, repositories, middleware)
frontend/           หน้าเว็บ login.html, booking.html, booking-his.html
database/           schema.sql, 002_users_and_email_logs.sql, seed.sql, ERD.md
docs/
  requirement/      User Stories, Use Case, Activity Diagram
  design/           Deployment, Class, DTO, ER, Sequence Diagram (DESIGN.md)
  API.md            API Specification
  TEST_CASES.md     Test Cases + Postman Collection
docker-compose.yml  รวม frontend + backend + db
```

## วิธีรันด้วย Docker (แนะนำ)

ต้องติดตั้ง [Docker Desktop](https://www.docker.com/products/docker-desktop/) และเปิดไว้ (Windows ต้องมี WSL2)

```bash
git clone https://github.com/niairi/cs261_650001_group8.git
cd cs261_650001_group8
docker compose up --build
```

เปิดเบราว์เซอร์ที่ **http://localhost:5500**

| Service | URL / Port |
|---|---|
| Frontend (Nginx) | http://localhost:5500 |
| Backend API | http://localhost:3000 (เช็คด้วย `/health`) |
| PostgreSQL | localhost:**5433** (user/pass `postgres` / `postgres`, db `room_booking`) |

ปิดระบบ: กด `Ctrl+C` แล้ว `docker compose down`
ล้างฐานข้อมูลแล้วสร้างใหม่จาก seed: `docker compose down -v` แล้วรันใหม่

### โหมดจำลอง (ค่าเริ่มต้น)

ถ้าไม่สร้างไฟล์ `.env` ระบบจะรันแบบจำลอง เหมาะกับการเดโม
- **Login:** ใส่รหัสนักศึกษาและรหัสผ่านอะไรก็ได้
- **อีเมล:** ไม่ส่งจริง แต่แสดงเนื้อหาใน log ของ `backend-1` ใน Terminal

### ใช้ TU API และส่งอีเมลจริง

```bash
cp .env.docker.example .env
```
แล้วใส่ `TU_API_KEY`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` ในไฟล์ `.env`
⚠️ ห้าม commit ไฟล์ `.env` (มีอยู่ใน `.gitignore` แล้ว)

## วิธีรันแบบไม่ใช้ Docker (สำหรับพัฒนา)

1. สร้างฐานข้อมูล PostgreSQL ชื่อ `room_booking` แล้วรันตามลำดับ `schema.sql` → `002_users_and_email_logs.sql` → `seed.sql`
2. Backend
   ```bash
   cd backend
   cp .env.example .env      # แก้ DATABASE_URL ให้ตรงกับเครื่อง
   npm install
   npm run dev               # http://localhost:3000
   npm test                  # Unit Test (node --test)
   ```
3. Frontend: เปิดโฟลเดอร์ `frontend/` ด้วย Live Server ของ VS Code (port 5500)

## Git Workflow

```
main      ← โค้ดที่ release แล้ว (ติด tag v1.0, v2.0, ...)
  └─ develop   ← รวมงานของทุกคนก่อน release
       ├─ feature/<ชื่องาน>   เช่น feature/US1-login, feature/docker
       └─ docs/<ชื่องาน>      เช่น docs/design
```

ขั้นตอนทำงาน
1. อัปเดต develop ล่าสุด: `git checkout develop` → `git pull origin develop`
2. แตก branch ใหม่: `git checkout -b feature/<ชื่องาน>`
3. commit ถี่ๆ ทีละเรื่อง ใช้รูปแบบ `ประเภท(TaskN): รายละเอียด` เช่น
   `feat(Task10): เพิ่ม Dockerfile ของ backend` · `fix(...)` · `docs(...)` · `chore(...)` · `test(...)`
4. push: `git push -u origin feature/<ชื่องาน>`
5. เปิด **Pull Request เข้า `develop`** (ไม่ใช่ `main`) แล้วให้เพื่อนอย่างน้อย 1 คน Review + Approve
6. แก้ตาม comment แล้ว push เพิ่มใน branch เดิม PR จะอัปเดตเอง
7. merge แล้วลบ branch
8. ตอน release: PR `develop → main` แล้วติด tag เช่น `v1.0`

กติกา
- ❌ ห้าม push ตรงเข้า `main` หรือ `develop`
- ❌ ห้าม `git push --force`
- ❌ ห้าม commit ไฟล์ `.env` หรือรหัสผ่าน / API key
- ✅ ถ้า conflict: `git pull origin develop` เข้า branch ตัวเองแล้วแก้ ระวังอย่าลบงานของคนอื่น

## ทีม

| บทบาท | หน้าที่ |
|---|---|
| Product Owner | เรียงลำดับ Product Backlog และยืนยัน Test Case |
| Scrum Master + DevOps | ดูแล Scrum, Trello, Git workflow, Docker |
| Backend (2 คน) | Node.js Express API |
| Frontend (2 คน) | HTML / CSS / JavaScript |
| Database | PostgreSQL schema และ seed |

Trello: Requirement_G8 และ Sprint Planning_G8
