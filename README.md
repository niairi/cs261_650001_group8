# cs261_650001_group8 : TU CS Space

ระบบจองห้อง **CS Co-Working Space** ภาควิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยธรรมศาสตร์
โปรเจกต์วิชา CS261 Software Engineering · กลุ่ม 8 (ภาคพิเศษ) section 650001 · พัฒนาด้วยกระบวนการ Scrum

## ฟีเจอร์ Sprint 1 (Release 1)

| US | ฟีเจอร์ |
|---|---|
| US1 | Login ด้วย TU Account (TU REST API) |
| US2 | ตารางสถานะห้องว่าง/ไม่ว่าง แบบ Real-time (09:00–16:00 ตั้งแต่ Sprint 2) |
| US3 | จองห้องล่วงหน้า (ครั้งละไม่เกิน 3 ชม. ล่วงหน้าไม่เกิน 7 วัน) |
| US4 | ดูรายการจองของฉัน และยกเลิกการจอง |
| US5 | อีเมลยืนยันการจอง / การยกเลิก |

## ฟีเจอร์ Sprint 2 (Release 2)

| US | ฟีเจอร์ |
|---|---|
| US5 TC3 | แจ้งบนหน้าจอเมื่อส่งอีเมลไม่สำเร็จ |
| US6 | แก้ไขเวลาการจองที่จองไว้แล้ว |
| US7 | เจ้าหน้าที่ดูรายการและรายงานการจองทั้งหมด (หน้า `admin.html`) |
| US8 | Check-in เมื่ออยู่ในระยะ 5 เมตรจากห้อง |
| US9 | นับ No-show เมื่อไม่ Check-in ภายในเวลาที่กำหนด |
| US10 | Blacklist 30 วันเมื่อ No-show ครบ 3 ครั้ง |
| US11 | Logout |
| US12 | เจ้าหน้าที่ปิดปรับปรุงห้องรายวัน |
| US14 | ตรวจสาขาวิทยาการคอมพิวเตอร์ตอน Login |
| US15 | ตรวจเลขทะเบียนและรหัสผ่านตอน Login |

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
frontend/           หน้าเว็บ login.html, booking.html, booking-his.html, admin.html
database/           schema.sql, 002_users_and_email_logs.sql, seed.sql,
                    003_sprint2.sql, 003_sprint2_roomlocation_and_blacklist.sql,
                    004_room_closure.sql, ERD.md
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

### เครื่องที่เคยรัน Release 1 (v1.0) มาก่อน ⚠️

Sprint 2 เพิ่มตารางและคอลัมน์ใหม่ (Check-in, No-show, Blacklist, ปิดปรับปรุงห้อง) ไฟล์ SQL ใน `database/` จะถูกรัน **เฉพาะตอนสร้างฐานข้อมูลครั้งแรก** เท่านั้น เครื่องที่มีฐานข้อมูลเก่าอยู่ต้องล้างแล้วสร้างใหม่ 1 ครั้ง

```bash
git checkout develop
git pull origin develop
docker compose down -v
docker compose up --build
```

`down -v` จะลบข้อมูลในฐานข้อมูลของเครื่องนี้ทิ้ง แล้วสร้างใหม่จาก seed (ข้อมูลทดสอบกลับมาเอง)

ไฟล์ SQL ที่ Docker รันตามลำดับ

| ลำดับ | ไฟล์ | ใช้กับ |
|---|---|---|
| 01 | `schema.sql` | ตารางหลัก |
| 02 | `002_users_and_email_logs.sql` | ผู้ใช้ + ประวัติอีเมล (US5) |
| 03 | `seed.sql` | ข้อมูลทดสอบ |
| 04 | `003_sprint2.sql` | พิกัดห้อง (US8) |
| 05 | `003_sprint2_roomlocation_and_blacklist.sql` | พิกัดจริง + Blacklist (US8–US10) |
| 06 | `004_room_closure.sql` | ปิดปรับปรุงห้อง (US12) |

เช็คว่าตารางครบ: `docker compose exec db psql -U postgres -d room_booking -c "\dt"` ต้องเห็น `blacklist` และ `room_closure`

### โหมดจำลอง (ค่าเริ่มต้น)

ถ้าไม่สร้างไฟล์ `.env` ระบบจะรันแบบจำลอง ใช้ทดสอบระหว่างพัฒนา
- **Login:** ใช้ได้เฉพาะบัญชีทดสอบใน `MOCK_USERS` ค่าเริ่มต้นคือรหัส `6809650010` รหัสผ่าน `test1234` · รหัสผ่านหรือเลขทะเบียนผิดจะเข้าไม่ได้ (US15)
- เพิ่มบัญชีทดสอบได้ใน `.env` เช่น `MOCK_USERS=6809650010:test1234,6609000001:test1234:คณิตศาสตร์` (ส่วนที่ 3 คือสาขา ใช้ทดสอบ US14) · ห้ามใช้รหัสผ่านจริงของมหาวิทยาลัย
- **เดโมจริงให้ใส่ `TU_API_KEY`** ระบบจะตรวจกับ TU และไม่ใช้บัญชีทดสอบ
- **อีเมล:** ไม่ส่งจริง แต่แสดงเนื้อหาใน log ของ `backend-1` ใน Terminal
- **หน้าเจ้าหน้าที่ (US7, US12):** ใส่รหัสที่ใช้ทดสอบใน `ADMIN_IDS` ของ `.env` เช่น `ADMIN_IDS=6809650010` แล้ว `docker compose up --build` ใหม่

### ใช้ TU API และส่งอีเมลจริง

```bash
cp .env.docker.example .env
```
แล้วใส่ `TU_API_KEY`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` ในไฟล์ `.env`
⚠️ ห้าม commit ไฟล์ `.env` (มีอยู่ใน `.gitignore` แล้ว)

### ไฟล์ .env แบบเข้ารหัส (เครื่องเดโม / เครื่องเพื่อน)

ทีมเก็บค่าใน `.env` (root, ใช้กับ docker compose) และ `backend/.env` (ใช้กับ `npm start`) ไว้ใน repo แบบเข้ารหัสที่ `secrets/env.enc`
เครื่องไหนก็ได้ที่ clone repo แล้ว ถอดรหัสครั้งเดียวก็ได้ `.env` ครบ ไม่ต้องพิมพ์ใหม่ · รหัสผ่านขอจาก PO ทางแชทส่วนตัว

**ถอดรหัส** (ทำที่โฟลเดอร์โปรเจกต์ แล้วพิมพ์รหัสผ่าน ตัวอักษรจะไม่แสดงบนจอ)

```bash
git pull
node scripts/env-secret.js decrypt
docker compose up --build
```

เครื่องที่ไม่มี Node.js ใช้ Docker แทนได้

```bash
# macOS / Linux
docker run --rm -it -v "$PWD":/app -w /app node:22-alpine node scripts/env-secret.js decrypt
# Windows PowerShell
docker run --rm -it -v "${PWD}:/app" -w /app node:22-alpine node scripts/env-secret.js decrypt
```

- ถ้าในเครื่องมี `.env` อยู่แล้วและค่าไม่เหมือนกัน ไฟล์เดิมจะถูกสำรองเป็น `.env.bak-วันที่-เวลา` ก่อนเขียนทับ
- ดูว่าในไฟล์มีตัวแปรอะไรบ้าง (แสดงแค่ชื่อ ไม่แสดงค่า): `node scripts/env-secret.js list`
- `backend/.env` ในไฟล์เข้ารหัสใช้ `DATABASE_URL` ของเครื่องคนเข้ารหัส ถ้ารันแบบไม่ใช้ Docker อาจต้องแก้บรรทัดนี้ให้ตรงกับเครื่อง

**อัปเดตค่า** (เช่นได้ `TU_API_KEY` ใหม่) แก้ `.env` ในเครื่องตัวเองให้ถูกก่อน แล้ว

```bash
node scripts/env-secret.js encrypt
git add secrets/env.enc
git commit -m "chore: อัปเดต .env ที่เข้ารหัส"
```

แล้วเปิด PR ตามปกติ · ตั้งรหัสผ่านอย่างน้อย 12 ตัวอักษร ส่งรหัสผ่านทางแชทส่วนตัวเท่านั้น ห้ามส่งในกลุ่มหรือใส่ใน repo · ถ้ารหัสผ่านหลุด ให้เปลี่ยน `TU_API_KEY` / `SMTP_PASS` แล้ว encrypt ใหม่ด้วยรหัสผ่านใหม่

## วิธีรันแบบไม่ใช้ Docker (สำหรับพัฒนา)

1. สร้างฐานข้อมูล PostgreSQL ชื่อ `room_booking` แล้วรันไฟล์ใน `database/` ตามลำดับในตารางด้านบน (01 → 06)
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
