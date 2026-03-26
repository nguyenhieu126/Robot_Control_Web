# Docker Deployment Guide (Robot Control Web)

## 1. Mục tiêu
Tài liệu này gợi ý cách đóng gói và chạy toàn bộ hệ thống bằng Docker theo mô hình:
- PostgreSQL
- Backend Node.js (REST + WebSocket)
- Frontend React (serve bằng Nginx)

Phù hợp cho:
- Local dev/test nhanh
- Demo nội bộ
- Làm nền cho production

## 2. Kiến trúc khuyến nghị

Client Browser
-> Frontend container (Nginx, port 3000)
-> Backend container (Node.js, port 5000)
-> PostgreSQL container (port 5432, nội bộ)

Ghi chú:
- Backend đang dùng WebSocket ở /ws/robot và /ws/dashboard, nên reverse proxy phải hỗ trợ Upgrade header.
- Frontend cần trỏ API/WS về domain hoặc host backend thực tế.

## 3. Chuẩn bị file môi trường

Backend env (ví dụ backend/.env.docker):

```env
DB_HOST=db
DB_PORT=5432
DB_NAME=robot_control
DB_USER=postgres
DB_PASSWORD=postgres
PORT=5000
NODE_ENV=production
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=1d
BCRYPT_SALT_ROUNDS=10
GPS_ROBOT_ID=kali-vega-01
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@robot.local
ADMIN_PASSWORD=Admin@123
```

Frontend env build-time (ví dụ frontend/.env.production):

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_DASHBOARD=ws://localhost:5000/ws/dashboard
```

Nếu deploy nhiều máy/domain, thay localhost bằng domain thật.

## 4. Dockerfile mẫu

### 4.1 Backend Dockerfile (backend/Dockerfile)

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000
CMD ["node", "server.js"]
```

### 4.2 Frontend Dockerfile (frontend/Dockerfile)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 5. Docker Compose mẫu

Tạo file docker-compose.yml ở root repo:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: robot_db
    environment:
      POSTGRES_DB: robot_control
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d robot_control"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: robot_backend
    env_file:
      - ./backend/.env.docker
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "5000:5000"
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: robot_frontend
    depends_on:
      - backend
    ports:
      - "3000:80"
    restart: unless-stopped

volumes:
  pgdata:
```

## 6. Khởi tạo DB khi chạy lần đầu

Cách đơn giản:
1. Chạy stack trước: docker compose up -d --build
2. Chạy migrate + seed từ backend container:
   - docker compose exec backend node scripts/run-migrations.js
   - docker compose exec backend node scripts/seed-admin.js

Nếu bạn muốn tự động hóa hoàn toàn, có thể thêm init job hoặc entrypoint script.

## 7. Lệnh vận hành nhanh

Build và chạy:

```bash
docker compose up -d --build
```

Xem log:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

Dừng hệ thống:

```bash
docker compose down
```

Dừng và xóa volume DB:

```bash
docker compose down -v
```

## 8. Kiểm tra sau deploy

- Frontend: http://localhost:3000
- API health: http://localhost:5000/api/health
- DB health: http://localhost:5000/api/db-health
- WS robot info (HTTP check): http://localhost:5000/ws/robot
- WS dashboard info (HTTP check): http://localhost:5000/ws/dashboard

## 9. Khuyến nghị production

- Dùng secret manager hoặc biến môi trường ở CI/CD, không hard-code mật khẩu trong repo.
- Đặt JWT_SECRET mạnh và xoay vòng định kỳ.
- Chỉ expose cổng cần thiết; DB nên internal-only.
- Thêm reverse proxy TLS (Nginx/Traefik/Caddy) để dùng https và wss.
- Bật backup định kỳ cho volume PostgreSQL.
- Cấu hình restart policy và healthcheck cho mọi service.

## 10. Gợi ý cải tiến tiếp theo

- Thêm .dockerignore cho backend/frontend để giảm thời gian build.
- Tạo profile dev/prod riêng trong compose.
- Tự động migrate/seed bằng entrypoint script có retry DB.
- Thêm monitoring (Prometheus/Grafana) nếu chạy dài hạn.
