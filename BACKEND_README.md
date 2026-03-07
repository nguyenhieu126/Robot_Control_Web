# 🤖 Robot Control System - Backend Setup

## 📋 Tổng Quan

Hệ thống điều khiển robot với:
- ✅ **5 bảng database chuẩn hóa**
- ✅ **Tách AI detection và event (abandoned object)**
- ✅ **Status chỉ nằm ở event**
- ✅ **Dễ mở rộng cho nhiều robot**
- ✅ **Full REST API**
- ✅ **Web test interface**

---

## 🗄️ Database Structure

```
robot_control/
├── users              (Người dùng hệ thống)
├── detections         (Kết quả AI phát hiện)
├── abandoned_events   (Sự kiện vật bị bỏ quên)
├── manual_commands    (Lệnh điều khiển thủ công)
└── robot_logs         (Log hoạt động robot)
```

### Mối quan hệ

```
users
  ├── manual_commands.user_id → users.id
  └── abandoned_events.confirmed_by → users.id

detections
  └── abandoned_events.detection_id → detections.id

robot_logs
  (độc lập - không có FK)
```

---

## 🚀 Quick Start (5 phút)

### 1. Yêu cầu
- Node.js 14+
- PostgreSQL 12+

### 2. Setup Database
```bash
# Tạo database
createdb robot_control

# Chạy từ folder backend
npm run db:init
```

### 3. Chạy Server
```bash
cd backend
npm install
npm run dev
```

### 4. Test Database
```bash
# Browser
http://localhost:5000/api

# Test web interface
file:///d:/Code/pbl5/Robot_Control_Web/database-tester.html
```

---

## 📁 Cấu Trúc Thư Mục

```
backend/
├── config/
│   └── db.js                    # Database config
├── migrations/
│   └── 001_init_schema.sql      # Database schema
├── models/
│   ├── userModel.js             # User queries
│   ├── detectionModel.js        # Detection queries
│   ├── abandonedEventModel.js   # Event queries
│   ├── manualCommandModel.js    # Command queries
│   └── robotLogModel.js         # Log queries
├── routes/
│   ├── userRoutes.js            # User endpoints
│   ├── detectionRoutes.js       # Detection endpoints
│   ├── abandonedEventRoutes.js  # Event endpoints
│   ├── manualCommandRoutes.js   # Command endpoints
│   └── robotLogRoutes.js        # Log endpoints
├── server.js                    # Main server
├── package.json
├── .env
└── .env.example
```

---

## 🌐 API Endpoints

### Health Check
```
GET  /api              - API overview
GET  /api/health       - Server health
GET  /api/db-health    - Database health
```

### Users (👥)
```
GET    /api/users              - Tất cả users
GET    /api/users/:id          - User theo ID
POST   /api/users              - Tạo user
PUT    /api/users/:id          - Update user
DELETE /api/users/:id          - Xóa user
```

### Detections (🎯)
```
GET    /api/detections         - Tất cả detections
GET    /api/detections/:id     - Detection theo ID
GET    /api/detections/recent/30     - Gần đây
GET    /api/detections/stats/all     - Thống kê
POST   /api/detections         - Tạo detection
```

### Abandoned Events (🚨)
```
GET    /api/events             - Tất cả events
GET    /api/events/:id         - Event theo ID
GET    /api/events/status/:status    - Theo status
GET    /api/events/pending/all       - Pending events
GET    /api/events/stats/all   - Thống kê
POST   /api/events             - Tạo event
PUT    /api/events/:id/status  - Update status
PUT    /api/events/:id/resolve - Mark resolved
```

### Manual Commands (⚙️)
```
GET    /api/commands           - Tất cả commands
GET    /api/commands/:id       - Command theo ID
GET    /api/commands/pending/all     - Pending
GET    /api/commands/user/:id       - Của user
GET    /api/commands/stats/all      - Thống kê
POST   /api/commands           - Tạo command
PUT    /api/commands/:id/execute    - Mark executed
DELETE /api/commands/:id       - Xóa command
```

### Robot Logs (📝)
```
GET    /api/logs               - Tất cả logs
GET    /api/logs/:id           - Log theo ID
GET    /api/logs/recent/60     - Gần đây
GET    /api/logs/event/:event  - Theo event
GET    /api/logs/stats/all     - Thống kê
GET    /api/logs/status/system - System status
POST   /api/logs               - Tạo log
```

---

## 💾 Database Schema

### users
```sql
id              SERIAL PRIMARY KEY
username        VARCHAR(50) UNIQUE
password_hash   TEXT
role            VARCHAR(20) [admin|operator|security]
created_at      TIMESTAMP
```

### detections
```sql
id              SERIAL PRIMARY KEY
object_type     VARCHAR(50)         -- bag, backpack, suitcase...
confidence      FLOAT               -- 0-1
image_path      TEXT                -- /images/frame_001.jpg
location_x      FLOAT               -- tọa độ X
location_y      FLOAT               -- tọa độ Y
detected_at     TIMESTAMP
```

### abandoned_events
```sql
id              SERIAL PRIMARY KEY
detection_id    INT FK              -- → detections(id)
status          VARCHAR(20)         -- [pending|confirmed|false_alarm|resolved]
confirmed_by    INT FK              -- → users(id)
first_seen      TIMESTAMP
last_seen       TIMESTAMP
duration        INT                 -- seconds
snapshot_path   TEXT
created_at      TIMESTAMP
resolved_at     TIMESTAMP
note            TEXT
```

### manual_commands
```sql
id              SERIAL PRIMARY KEY
user_id         INT FK              -- → users(id)
command         VARCHAR(50)         -- [MOVE_FORWARD|TURN_LEFT|STOP...]
parameters      TEXT                -- JSON
executed        BOOLEAN
created_at      TIMESTAMP
executed_at     TIMESTAMP
```

### robot_logs
```sql
id              SERIAL PRIMARY KEY
event           VARCHAR(50)         -- [SYSTEM_START|AUTO_MODE...]
message         TEXT
created_at      TIMESTAMP
```

---

## 📚 Hướng dẫn Chi Tiết

Xem thêm:
- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** - Setup database từ đầu
- **[DATABASE_TEST.md](DATABASE_TEST.md)** - Test API & troubleshooting
- **[database-tester.html](database-tester.html)** - Web test interface

---

## 🔧 Scripts npm

```bash
npm start           # Run server production
npm run dev         # Run server development (auto reload)
npm run db:init     # Initialize database schema
npm run db:reset    # Reset database (xóa tất cả)
npm test            # Run tests (TODO)
```

---

## 🧪 Ví dụ CURL

### Tạo Detection
```bash
curl -X POST http://localhost:5000/api/detections \
  -H "Content-Type: application/json" \
  -d '{
    "objectType": "backpack",
    "confidence": 0.95,
    "imagePath": "/images/frame_001.jpg",
    "locationX": 150.5,
    "locationY": 200.3
  }'
```

### Tạo Abandoned Event
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "detectionId": 1,
    "firstSeen": "2024-01-15T10:30:00Z",
    "lastSeen": "2024-01-15T10:35:00Z",
    "duration": 300
  }'
```

### Update Event Status
```bash
curl -X PUT http://localhost:5000/api/events/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "confirmedBy": 3,
    "note": "Confirmed by security"
  }'
```

---

## 🌐 Test Web Interface

Tính năng:
- ✅ Dashboard real-time
- ✅ System status (Server, DB)
- ✅ CRUD operations cho tất cả bảng
- ✅ Statistics & graphs
- ✅ Export JSON data
- ✅ Responsive design

**Cách dùng:**
1. Mở `database-tester.html` trong browser
2. Click "🔄 Refresh Status" để kiểm tra
3. Thử các tính năng: Create, Load, Stats

---

## ⚙️ Environment Variables

File `.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=robot_control
DB_USER=postgres
DB_PASSWORD=postgres

# Server
PORT=5000
NODE_ENV=development

# MQTT (tùy chọn)
MQTT_BROKER=mqtt://localhost:1883
```

---

## 🚨 Thông báo quan trọng

### Database
- **Đã chuẩn hóa**: Tách AI detection và abandoned object
- **Status**: Chỉ nằm ở `abandoned_events`
- **Dễ mở rộng**: Sẽ dễ thêm nhiều robot, camera sau này

### API
- Tất cả endpoints return `{success, data/error}`
- Pagination: `?limit=10&offset=0`
- Error handling: Tất cả lỗi trả JSON

### Frontend
- Database tester là standalone HTML
- Không cần build, mở trực tiếp file
- CORS đã enable

---

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Kiểm tra PostgreSQL
psql -U postgres

# Tạo database
createdb robot_control

# Khởi tạo
npm run db:init
```

### "Port 5000 already in use"
```bash
# Thay port trong .env
PORT=5001

# Hoặc kill process
# Windows: taskkill /PID <PID> /F
# Mac/Linux: kill -9 <PID>
```

### "CORS Error"
- Backend đã config CORS (origin: '*')
- Kiểm tra server có chạy không

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Xem [DATABASE_SETUP.md](DATABASE_SETUP.md)
2. Xem [DATABASE_TEST.md](DATABASE_TEST.md)
3. Kiểm tra terminal output
4. Xem API logs: `http://localhost:5000/api/logs/recent/60`

---

## 🎯 Tiếp Theo

- [ ] Integraton AI detection (detectionModel.py)
- [ ] MQTT subscriber cho commands
- [ ] Authentication (JWT)
- [ ] Frontend React
- [ ] Docker deployment
- [ ] Unit tests
- [ ] Performance optimization

---

**Được tạo: 2024-01-15**
**Version: 1.0.0**
**Database: PostgreSQL 12+**
**Node.js: 14+**

