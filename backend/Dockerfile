# Backend: Node.js + Express (Task10)
FROM node:20-alpine

WORKDIR /app

# ติดตั้ง dependency ก่อน ให้ Docker cache ชั้นนี้ไว้ ถ้า package.json ไม่เปลี่ยนจะ build เร็วขึ้น
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# คัดลอกโค้ด backend
COPY src ./src

ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/server.js"]