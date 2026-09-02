# ---------- build หน้าเว็บ ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# ลงเฉพาะ dependency ที่ backend ใช้จริง — vite/typescript ใช้แค่ตอน build
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY server ./server

# ไฟล์ DB อยู่ที่นี่ ต้อง mount volume ทับ ไม่งั้นข้อมูลหายตอนสร้าง container ใหม่
ENV DATA_DIR=/data
ENV PORT=9787
RUN mkdir -p /data && chown -R node:node /data

USER node
EXPOSE 9787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||9787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.mjs"]
