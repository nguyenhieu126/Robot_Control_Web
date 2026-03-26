# 🗄️ Robot Control System - Database Setup Guide

## 📋 Yêu cầu

- **PostgreSQL 12+**
- **Node.js 14+**
- **npm** hoặc **yarn**

---

## 🚀 Bước 1: Cài đặt PostgreSQL

### Windows
```bash
# Download từ https://www.postgresql.org/download/windows/
# Hoặc dùng Chocolatey
choco install postgresql

# Mặc định:
# - Port: 5432
# - User: postgres
# - Password: postgres (nhập khi cài)
```

### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

## 🔧 Bước 2: Tạo Database

### Phương pháp 1: Dùng Command Line

```bash
# Kết nối PostgreSQL
psql -U postgres

# Trong psql console, chạy:
CREATE DATABASE robot_control;
\q
```

### Phương pháp 2: Dùng pgAdmin
1. Mở pgAdmin
2. Right-click "Databases" → Create → Database
3. Name: `robot_control`
4. Save

---

## 📦 Bước 3: Cài đặt Backend Dependencies

```bash
cd backend
npm install
```

---

## 🗄️ Bước 4: Khởi tạo Schema Database

### Phương pháp 1: Tự động (npm script)

```bash
npm run db:init
```

### Phương pháp 2: Manual

```bash
# Windows
psql -h localhost -U postgres -d robot_control -f migrations/001_init_schema.sql
npm run db:seed:users

# macOS/Linux
psql -h localhost -U postgres -d robot_control -f migrations/001_init_schema.sql
npm run db:seed:users
```

### Phương pháp 3: Dùng psql console

```bash
psql -h localhost -U postgres -d robot_control
\i migrations/001_init_schema.sql
\dt  # Kiểm tra bảng
\q
npm run db:seed:users
```

Lưu ý: user mặc định được tạo trong code bằng bcrypt (`scripts/seed-admin.js`), không còn hard-code password hash trong file SQL migration.

---

## ✅ Bước 5: Kiểm tra Database

```bash
psql -h localhost -U postgres -d robot_control

# Kiểm tra bảng
\dt

# Kiểm tra users
SELECT * FROM users;

# Kiểm tra detections
SELECT * FROM detections;

# Kiểm tra abandoned_events
SELECT * FROM abandoned_events;

# Kiểm tra manual_commands
SELECT * FROM manual_commands;

# Kiểm tra robot_logs
SELECT * FROM robot_logs;

# Thoát
\q
```

---

## 🏃 Bước 6: Chạy Server

```bash
cd backend

# Development (tự reload)
npm run dev

# Production
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

---

## 🌐 Bước 7: Kiểm tra API

Mở browser hoặc Postman:

- **API Overview**: `http://localhost:5000/api`
- **Health Check**: `http://localhost:5000/api/health`
- **DB Health**: `http://localhost:5000/api/db-health`

---

## 📊 Cấu trúc Database

```
Database: robot_control
├── users (3 user mặc định, seed bằng bcrypt)
├── detections (3 detection mẫu)
├── abandoned_events (2 event mẫu)
├── manual_commands
└── robot_logs (4 log mẫu)
```

---

## 🔄 Reset Database

Nếu muốn reset toàn bộ (xóa tất cả dữ liệu):

```bash
npm run db:reset
```

---

## 🐛 Troubleshooting

### Lỗi: "Database 'robot_control' does not exist"
```bash
# Tạo database
psql -U postgres -c "CREATE DATABASE robot_control;"

# Hoặc reset
npm run db:reset
```

### Lỗi: "Connection refused"
- Kiểm tra PostgreSQL có đang chạy không: `psql -U postgres`
- Windows: Mở Services, tìm PostgreSQL, Start nó
- macOS: `brew services start postgresql@15`
- Linux: `sudo systemctl start postgresql`

### Lỗi: "password authentication failed"
- Kiểm tra `.env` file có config đúng không
- Hoặc thay đổi password PostgreSQL:
```bash
psql -U postgres
ALTER USER postgres WITH PASSWORD 'your_new_password';
\q
```

### Kiểm tra version PostgreSQL
```bash
psql --version
# hoặc
SELECT VERSION();
```

---

## 📝 Cấu hình Environment

File `.env` phải có:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=robot_control
DB_USER=postgres
DB_PASSWORD=postgres
PORT=5000
NODE_ENV=development
```

---

## 🎯 Tiếp theo

1. **Chạy Frontend**: `cd frontend && npm start`
2. **Test API**: Xem `DATABASE_TEST.md`
3. **Tích hợp MQTT**: Cấu hình `mqttService.js`

---

## 📚 Tài liệu thêm

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Express.js: https://expressjs.com/
- pg (Node.js PostgreSQL): https://node-postgres.com/

