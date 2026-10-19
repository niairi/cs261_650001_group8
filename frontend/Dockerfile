# Frontend: HTML/CSS/JS ปล่อยด้วย Nginx (Task10)
FROM nginx:1.27-alpine

# ใช้ config ของเราแทนค่าเริ่มต้น
COPY nginx.conf /etc/nginx/conf.d/default.conf

# คัดลอกไฟล์หน้าเว็บ
COPY . /usr/share/nginx/html

EXPOSE 80