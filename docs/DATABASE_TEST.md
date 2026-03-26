# 🗄️ Robot Control Database Test Guide

## 📚 Mục lục
1. [Quick Start](#quick-start)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Test Cases](#test-cases)
5. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Start

### 1. Kiểm tra yêu cầu
```bash
# Node.js version
node --version  # 14+

# PostgreSQL version
psql --version  # 12+
```

### 2. Setup Database
```bash
# Tạo database
createdb robot_control

# Hoặc từ folder backend
npm run db:init
```

### 3. Chạy Server
```bash
cd backend
npm install
npm run dev  # Chế độ development
```

### 4. Test Database
- Mở `database-tester.html` trong browser
- Hoặc truy cập: `http://localhost:5000/api`

---

## 🗄️ Database Schema

### Bảng 1: users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Dữ liệu mẫu:**
```
ID | Username | Role      | Created_at
1  | admin    | admin     | 2024-01-01
2  | operator | operator  | 2024-01-01
3  | security | security  | 2024-01-01
```

---

### Bảng 2: detections
```sql
CREATE TABLE detections (
    id SERIAL PRIMARY KEY,
    object_type VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL,
    image_path TEXT NOT NULL,
    location_x FLOAT NOT NULL,
    location_y FLOAT NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Ý nghĩa trường:**
- `object_type`: Loại vật thể (bag, backpack, suitcase)
- `confidence`: Độ tin cậy (0-1)
- `location_x, location_y`: Tọa độ vật thể trên camera
- `detected_at`: Thời gian phát hiện

**Ví dụ dữ liệu:**
```json
{
    "id": 1,
    "object_type": "backpack",
    "confidence": 0.95,
    "image_path": "/images/frame_001.jpg",
    "location_x": 150.5,
    "location_y": 200.3,
    "detected_at": "2024-01-15T10:30:00Z"
}
```

---

### Bảng 3: abandoned_events
```sql
CREATE TABLE abandoned_events (
    id SERIAL PRIMARY KEY,
    detection_id INT REFERENCES detections(id),
    status VARCHAR(20) NOT NULL,
    confirmed_by INT REFERENCES users(id),
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    duration INT NOT NULL,
    snapshot_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    note TEXT
);
```

**Status values:**
- `pending`: Vừa phát hiện, chờ xác nhận
- `confirmed`: Security xác nhận
- `false_alarm`: Cảnh báo giả
- `resolved`: Đã xử lý

**Ví dụ dữ liệu:**
```json
{
    "id": 1,
    "detection_id": 1,
    "status": "confirmed",
    "confirmed_by": 3,
    "first_seen": "2024-01-15T10:30:00Z",
    "last_seen": "2024-01-15T10:35:00Z",
    "duration": 300,
    "snapshot_path": "/snapshots/event_001.jpg",
    "note": "Backpack found near entrance"
}
```

---

### Bảng 4: manual_commands
```sql
CREATE TABLE manual_commands (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    command VARCHAR(50) NOT NULL,
    parameters TEXT,
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP
);
```

**Command types:**
- `MOVE_FORWARD`: Di chuyển về phía trước
- `MOVE_BACKWARD`: Lùi lại
- `TURN_LEFT`: Quay trái
- `TURN_RIGHT`: Quay phải
- `STOP`: Dừng
- `GO_TO_POINT`: Đi tới điểm
- `EMERGENCY_STOP`: Dừng khẩn cấp

**Ví dụ dữ liệu:**
```json
{
    "id": 1,
    "user_id": 2,
    "command": "GO_TO_POINT",
    "parameters": "{\"x\": 100, \"y\": 150}",
    "executed": false,
    "created_at": "2024-01-15T10:40:00Z"
}
```

---

### Bảng 5: robot_logs
```sql
CREATE TABLE robot_logs (
    id SERIAL PRIMARY KEY,
    event VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Event types:**
- `SYSTEM_START`: Hệ thống bắt đầu
- `AUTO_MODE`: Chế độ tự động
- `MANUAL_MODE`: Chế độ thủ công
- `OBJECT_DETECTED`: Phát hiện vật thể
- `ABANDONED_OBJECT`: Vật bị bỏ quên
- `ERROR`: Lỗi

---

## 🌐 API Endpoints

### Users API
```
GET    /api/users                    - Lấy tất cả users
GET    /api/users/:id                - Lấy user theo ID
POST   /api/users                    - Tạo user mới
PUT    /api/users/:id                - Update user
DELETE /api/users/:id                - Xóa user
```

### Detections API
```
GET    /api/detections               - Lấy tất cả detections
GET    /api/detections/:id           - Lấy detection theo ID
GET    /api/detections/recent/30     - Detections 30 phút gần đây
GET    /api/detections/stats/all     - Thống kê detections
POST   /api/detections               - Tạo detection mới
```

### Abandoned Events API
```
GET    /api/events                   - Lấy tất cả events
GET    /api/events/:id               - Lấy event theo ID
GET    /api/events/status/pending    - Events pending
GET    /api/events/status/confirmed  - Events confirmed
GET    /api/events/pending/all       - Events chưa xử lý
GET    /api/events/stats/all         - Thống kê events
POST   /api/events                   - Tạo event mới
PUT    /api/events/:id/status        - Update status
PUT    /api/events/:id/resolve       - Đánh dấu resolved
```

### Commands API
```
GET    /api/commands                 - Lấy tất cả commands
GET    /api/commands/:id             - Lấy command theo ID
GET    /api/commands/pending/all     - Commands chưa thực thi
GET    /api/commands/user/:userId    - Commands của user
GET    /api/commands/stats/all       - Thống kê commands
POST   /api/commands                 - Tạo command mới
PUT    /api/commands/:id/execute     - Đánh dấu executed
DELETE /api/commands/:id             - Xóa command
```

### Logs API
```
GET    /api/logs                     - Lấy tất cả logs
GET    /api/logs/:id                 - Lấy log theo ID
GET    /api/logs/recent/60           - Logs 60 phút gần đây
GET    /api/logs/event/SYSTEM_START  - Logs theo event
GET    /api/logs/stats/all           - Thống kê logs
GET    /api/logs/status/system       - System status
POST   /api/logs                     - Tạo log mới
```

### Health Check
```
GET    /api/health                   - Server health
GET    /api/db-health                - Database health
GET    /api/                         - API overview
```

---

## 🧪 Test Cases

### Test 1: Tạo Detection Mới

**Request:**
```bash
curl -X POST http://localhost:5000/api/detections \
  -H "Content-Type: application/json" \
  -d '{
    "objectType": "suitcase",
    "confidence": 0.89,
    "imagePath": "/images/frame_005.jpg",
    "locationX": 300.2,
    "locationY": 250.8
  }'
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 4,
        "object_type": "suitcase",
        "confidence": 0.89,
        "image_path": "/images/frame_005.jpg",
        "location_x": 300.2,
        "location_y": 250.8,
        "detected_at": "2024-01-15T11:00:00Z"
    }
}
```

---

### Test 2: Tạo Abandoned Event

**Request:**
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "detectionId": 4,
    "firstSeen": "2024-01-15T11:00:00Z",
    "lastSeen": "2024-01-15T11:05:00Z",
    "duration": 300,
    "snapshotPath": "/snapshots/event_003.jpg"
  }'
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 3,
        "detection_id": 4,
        "status": "pending",
        "confirmed_by": null,
        "first_seen": "2024-01-15T11:00:00Z",
        "last_seen": "2024-01-15T11:05:00Z",
        "duration": 300,
        "created_at": "2024-01-15T11:05:00Z"
    }
}
```

---

### Test 3: Update Event Status

**Request:**
```bash
curl -X PUT http://localhost:5000/api/events/3/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "confirmedBy": 3,
    "note": "Confirmed by security team"
  }'
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 3,
        "status": "confirmed",
        "confirmed_by": 3,
        "note": "Confirmed by security team"
    }
}
```

---

### Test 4: Tạo Command

**Request:**
```bash
curl -X POST http://localhost:5000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 2,
    "command": "GO_TO_POINT",
    "parameters": "{\"x\": 100, \"y\": 150}"
  }'
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "user_id": 2,
        "command": "GO_TO_POINT",
        "parameters": "{\"x\": 100, \"y\": 150}",
        "executed": false,
        "created_at": "2024-01-15T11:10:00Z"
    }
}
```

---

### Test 5: Lấy Statistics

**Request:**
```bash
curl http://localhost:5000/api/detections/stats/all
```

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "object_type": "backpack",
            "count": 2,
            "avg_confidence": 0.93
        },
        {
            "object_type": "bag",
            "count": 1,
            "avg_confidence": 0.87
        }
    ]
}
```

---

## 🧪 Sử dụng Database Tester HTML

### Bước 1: Chạy Server
```bash
cd backend
npm run dev
```

### Bước 2: Mở Tester
- Mở file `database-tester.html` trong browser
- Hoặc `file:///d:/Code/pbl5/Robot_Control_Web/database-tester.html`

### Bước 3: Kiểm tra Status
- Click "🔄 Refresh Status" để kiểm tra server và database
- Xem số lượng records của mỗi bảng

### Bước 4: Test Features
- **Users**: Tạo user mới, xem danh sách
- **Detections**: Tạo detection, thống kê
- **Events**: Kiểm tra pending events, update status
- **Commands**: Tạo command cho robot
- **Logs**: Tạo log hệ thống

---

## 🐛 Troubleshooting

### Lỗi: "Cannot connect to database"

**Giải pháp:**
```bash
# Kiểm tra PostgreSQL chạy không
psql -U postgres

# Nếu không, start service
# Windows: Services > PostgreSQL > Start
# macOS: brew services start postgresql@15
# Linux: sudo systemctl start postgresql

# Tạo database
createdb robot_control

# Khởi tạo schema
psql -U postgres -d robot_control -f migrations/001_init_schema.sql
```

---

### Lỗi: "CORS error"

**Giải pháp:**
Backend đã cấu hình CORS. Nếu vẫn lỗi:

```javascript
// backend/server.js
app.use(cors({
    origin: '*',
    credentials: true
}));
```

---

### Lỗi: "Port 5000 already in use"

**Giải pháp:**
```bash
# Thay đổi port trong .env
PORT=5001

# Hoặc tìm process chiếm port 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

---

### Lỗi: "Invalid detection - confidence must be 0-1"

**Giải pháp:**
Confidence phải nằm trong khoảng 0-1. Ví dụ: 0.95 là hợp lệ

---

### Lỗi: "Foreign key constraint"

**Giải pháp:**
Khi tạo abandoned_events, detection_id phải tồn tại:
```bash
# Lấy IDs hiện tại
SELECT * FROM detections;

# Sử dụng ID đó
POST /api/events
{
    "detectionId": 1,  // ID phải tồn tại
    ...
}
```

---

## 📊 Ví dụ Flow Thực Tế

### Scenario: Phát hiện vật bỏ quên

```
1. AI Detection
   ↓
   POST /api/detections
   {
       "objectType": "backpack",
       "confidence": 0.95,
       "imagePath": "/images/frame_001.jpg",
       "locationX": 150.5,
       "locationY": 200.3
   }
   → Detection ID = 1

2. Tạo Abandoned Event
   ↓
   POST /api/events
   {
       "detectionId": 1,
       "firstSeen": "2024-01-15T10:30:00Z",
       "lastSeen": "2024-01-15T10:35:00Z",
       "duration": 300
   }
   → Event ID = 1, Status = "pending"

3. Security Xác Nhận
   ↓
   PUT /api/events/1/status
   {
       "status": "confirmed",
       "confirmedBy": 3,
       "note": "Confirmed by security"
   }

4. Robot Được Điều Khiển
   ↓
   POST /api/commands
   {
       "userId": 2,
       "command": "GO_TO_POINT",
       "parameters": "{\"x\": 150, \"y\": 200}"
   }

5. Log Hoạt Động
   ↓
   POST /api/logs
   {
       "event": "ABANDONED_OBJECT",
       "message": "Backpack detected and confirmed at (150, 200)"
   }

6. Event Đã Xử Lý
   ↓
   PUT /api/events/1/resolve
   {
       "note": "Item removed from location"
   }
```

---

## 📚 Tài liệu Tham Khảo

- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Express.js**: https://expressjs.com/
- **Node-postgres**: https://node-postgres.com/
- **REST API Best Practices**: https://restfulapi.net/

