# Hướng dẫn chạy project robot control web

## Mô tả ngắn

Project này gồm 2 phần chính:

- backend Node.js + Express + PostgreSQL + WebSocket
- frontend React để điều khiển và theo dõi robot

Ngoài ra backend có các API để nhận dữ liệu từ hệ thống IoT/Jetson (cảnh báo vật thể bị bỏ quên, GPS batch, camera stream).

## Yêu cầu môi trường

- Windows, macOS hoặc Linux
- Node.js 18 trở lên
- npm 9 trở lên
- PostgreSQL 12 trở lên

## Cài đặt lần đầu

### 1) Tải mã nguồn

```bash
git clone https://github.com/nguyenhieu126/Robot_Control_Web.git
cd Robot_Control_Web
```

### 2) Cấu hình biến môi trường

Backend:

```bash
cd backend
copy .env.example .env
```

Frontend:

```bash
cd ..\frontend
copy .env.example .env
```

Lưu ý:

- cần cấu hình đúng `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` trong `backend/.env`
- cần đặt `JWT_SECRET` đủ mạnh trước khi chạy thật

### 3) Cài thư viện

```bash
cd backend
npm install

cd ..\frontend
npm install
```

## Cách chạy project

### Cách 1: chạy nhanh bằng start.bat (Windows)

Tại thư mục gốc project:

```bat
start.bat
```

Script này sẽ:

- tự cài `node_modules` nếu chưa có
- mở backend ở `http://localhost:5000`
- mở frontend ở `http://localhost:3000`

### Cách 2: chạy thủ công

Mở 2 terminal riêng:

Terminal 1 (backend):

```bash
cd backend
npm run dev
```

Terminal 2 (frontend):

```bash
cd frontend
npm start
```

## Khởi tạo database

Từ thư mục `backend`:

```bash
npm run db:init
```

Lệnh này sẽ tự động:

- tạo database theo `DB_NAME` (nếu chưa tồn tại)
- chạy toàn bộ file migration trong `backend/migrations`
- seed tài khoản mặc định

Các lệnh liên quan:

```bash
npm run db:migrate
npm run db:seed:admin
npm run db:reset
```

## Tài khoản mặc định sau khi seed

Nếu bạn chưa đổi trong `.env`, các tài khoản mặc định là:

- admin: `admin` / `Admin@123`
- operator: `operator` / `Operator@123`
- security: `security` / `Security@123`

Bạn có thể đăng nhập bằng username hoặc email qua API `POST /api/auth/login`.

## Endpoint kiểm tra nhanh

- API overview: `http://localhost:5000/api`
- server health: `http://localhost:5000/api/health`
- database health: `http://localhost:5000/api/db-health`
- websocket robot: `ws://localhost:5000/ws/robot`
- websocket dashboard: `ws://localhost:5000/ws/dashboard`

## Liên kết phần IoT của dự án

Repo phần IoT:

- https://github.com/kenzoknz/pbl5_iot

Cách ghép với backend hiện tại:

- backend nhận cảnh báo từ Jetson/IoT qua `POST /api/ingest/abandoned-alert` (multipart/form-data, có ảnh)
- backend nhận GPS batch qua `POST /api/gps/batch`
- backend đẩy trạng thái và lệnh realtime qua WebSocket

Luồng tích hợp đề xuất:

1. hệ thống IoT phát hiện sự kiện
2. gửi dữ liệu sự kiện và ảnh về backend
3. backend lưu dữ liệu vào PostgreSQL
4. frontend nhận dữ liệu realtime từ backend để hiển thị

## Chạy test cơ bản

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm test
```