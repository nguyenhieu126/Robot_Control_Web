# Hướng 2: Server Trung Gian Giữa Jetson và ESP32

## Mô Tả Kiến Trúc

```
Jetson ←→ Server ←→ ESP32
```

**Server là trung gian:**
- Nhận lệnh từ Jetson (AI detection → gửi lệnh "chụp ảnh", "dừng lại")
- Nhận lệnh từ Dashboard (User → "MOVE FORWARD")
- Server **quyết định** lệnh nào ưu tiên gửi xuống ESP32
- ESP32 chỉ nhận lệnh từ Server, không kết nối trực tiếp Jetson

---

## Flow Hoạt Động Chi Tiết

```
User (Dashboard)        Jetson (AI)            Server               ESP32
        │                   │                    │                    │
        │                   │                    │                    │
User gửi MOVE ──────────────────────────────────>│                    │
        │                   │                    │                    │
        │               AI phát hiện ──────────>│                    │
        │               vật thể bỏ quên         │                    │
        │                   │                   │ (chọn priority)    │
        │                   │                   │                    │
        │                   │                   ├─ Gửi MOVE ────────>│
        │                   │                   │                    │
        │                   │                   │<─ Status ─────────│
        │                   │                   │                    │
        │                   │<─ Status/GPS ──────                    │
        │                   │                    │                    │
        │<─ Status ────────────────────────────│                    │
```

---

## 4 Trường Hợp Lệnh & Cách Server Xử Lý

### **Case 1: User gửi lệnh realtime (Dashboard)**

```
Dashboard → POST /api/commands
Server     → {type: "COMMAND", command: "MOVE FORWARD", speed: 120}
           → ESP32 qua WebSocket /ws/robot
ESP32      → Thực hiện ngay
```

### **Case 2: Jetson phát hiện vật thể & gửi thông báo**

```
Jetson AI  → POST /api/detections {lat: 10.5, lon: 20.3, confidence: 0.92}
Server     → Lưu DB + Yêu cầu Jetson: "Xác nhận vật thể"
Jetson     → Gửi thông báo: "Yêu cầu dừng gần vật thể"
Server     → {type: "COMMAND", command: "STOP"}
           → ESP32 qua WebSocket /ws/robot
ESP32      → Dừng khẩn cấp
```

### **Case 3: Xung đột lệnh (User + Jetson cùng gửi)**

```
User       → MOVE FORWARD speed 80
Jetson     → STOP (phát hiện chướng ngại vật)

Server logic:
  if (jetson_stop && user_move) {
    priority = JETSON_STOP;  // An toàn trước tiên!
  }
  
Server → ESP32: STOP command
```

### **Case 4: Mất kết nối Jetson**

```
Jetson lost connection
↓
Server heartbeat timeout
↓
User vẫn có thể điều khiển ESP32 qua Dashboard
```

---

## Ưu Điểm Hướng 2

✅ **Server là trung tâm quyết định toàn bộ** → dễ kiểm soát ưu tiên  
✅ **Mọi lệnh được log trong DB** → dễ audit, dễ debug  
✅ **Dễ xử lý xung đột**: User vs AI, User vs Autonomous  
✅ **Bảo mật tập trung** → chỉ cần kiểm soát 1 điểm (Server)  
✅ **Dễ bảo trì & mở rộng** → thêm logic ưu tiên ở 1 chỗ  
✅ **Phù hợp để test** → không cần cài Jetson thực, dùng Postman/cURL test ngay

---

## Nhược Điểm Hướng 2

❌ **Độ trễ cao hơn** → lệnh phải qua: Jetson → Server → ESP32 (2 hop)  
❌ **Nếu Server down → ESP32 mất lệnh** (ngoài keepalive fallback)  
❌ **Phụ thuộc mạng** → mạng chập chờn → lệnh bị delay  
❌ **Không phù hợp STOP khẩn cấp** vì độ trễ có thể quá cao  
❌ **Tải server cao hơn** → xử lý + broadcast từng lệnh

---

## Implementation: Các Bước Cơ Bản

### **1. Jetson gửi event AI lên Server**

```javascript
// Jetson Python/Node.js
POST /api/detections
{
  "robot_id": "kali-vega-01",
  "event_type": "ABANDONED_ITEM",
  "confidence": 0.92,
  "location": { "lat": 10.5, "lon": 20.3 },
  "image_path": "/jetson/captures/item_001.jpg",
  "timestamp": "2026-03-31T10:30:45Z"
}
```

### **2. Server nhận & gửi lệnh điều khiển xuống ESP32**

```javascript
// Server WebSocket → ESP32 (trong wsManager.js)
app.post('/api/detections', async (req, res) => {
  const { event_type, confidence, location } = req.body;
  
  // Lưu vào database
  await detectionModel.create(req.body);
  
  // Nếu phát hiện vật thể bỏ quên, gửi STOP ngay
  if (event_type === 'ABANDONED_ITEM' && confidence > 0.8) {
    if (isRobotConnected()) {
      _send(robotClient, {
        type: 'COMMAND',
        data: {
          id: -1,
          command: 'STOP',
          parameters: {
            reason: 'Abandoned item detected',
            priority: 'HIGH',
            location: location
          }
        }
      });
    }
  }
  
  res.json({ success: true, detection_id: ... });
});
```

### **3. ESP32 nhận lệnh & phản hồi trạng thái**

```cpp
// ESP32 (CommandProcessor.cpp)
void handleCommand(const JsonDocument& doc) {
  String command = doc["data"]["command"];
  String reason = doc["data"]["parameters"]["reason"];
  
  if (command == "STOP") {
    motorController.stop();
    delay(500);
    
    // Phản hồi lại server
    JsonDocument response;
    response["type"] = "STATUS";
    response["data"]["state"] = "STOPPED";
    response["data"]["reason"] = reason;
    response["data"]["gps"] = getCurrentGPS();
    response["data"]["timestamp"] = getTimestamp();
    
    sendToServer(response);
  }
}
```

### **4. Server log & broadcast cho Dashboard**

```javascript
// Server lưu DB + broadcast tất cả clients
ws.on('message', async (raw) => {
  const msg = JSON.parse(raw.toString());
  
  if (msg.type === 'STATUS') {
    // Lưu lịch sử trạng thái
    await robotLogModel.create({
      robot_id: 'kali-vega-01',
      action: msg.data.state,
      reason: msg.data.reason,
      location: msg.data.gps,
      timestamp: new Date()
    });
    
    // Broadcast cho tất cả dashboard clients
    _broadcastDashboard({
      type: 'ROBOT_STATUS_UPDATE',
      data: msg.data
    });
  }
});
```

---

## So Sánh 2 Hướng

| Tiêu Chí | **Hướng 1** (Jetson ↔ ESP32 trực tiếp) | **Hướng 2** (Server trung gian) |
|---------|------|------|
| Độ trễ | 🟢 Thấp (1 hop) | 🔴 Cao (2 hop) |
| Khi Server down | 🟢 Vẫn chạy | 🔴 Mất lệnh |
| Kiểm soát ưu tiên | 🟡 Jetson quyết định | 🟢 Server quyết định |
| Log/Audit | 🟡 Jetson + DB | 🟢 Toàn bộ ở Server |
| Bảo mật | 🟡 2 điểm | 🟢 1 điểm tập trung |
| STOP khẩn cấp | 🟢 Nhanh | 🔴 Chậm |
| Phức tạp | 🟢 Đơn giản | 🔴 Phức tạp |
| Dễ test ngay | 🔴 Cần Jetson | 🟢 Dùng Postman/cURL |

---

## Khuyến Nghị Thử Cả 2 Hướng

### **Phase 1: Test Hướng 2 (Server trung gian) - Dễ implement**

✅ **Lợi ích:**
- Sử dụng WebSocket hiện tại
- Server relay lệnh từ Jetson/Dashboard xuống ESP32
- Phù hợp để test xung đột lệnh, ưu tiên
- Nhận feedback trước khi tối ưu
- Không cần cài Jetson thực

✅ **Thực hiện:**
- Thêm endpoint `/api/detections` cho Jetson
- Modify `wsManager.js` để xử lý event từ Jetson
- Test với Postman/cURL

### **Phase 2: Nếu độ trễ là vấn đề → Switch sang Hướng 1**

✅ **Lợi ích:**
- Thêm kênh UART Jetson ↔ ESP32
- Server chỉ giám sát & log
- Giữ WebSocket cho Dashboard
- Đối với STOP khẩn cấp sẽ nhanh hơn

✅ **Thực hiện:**
- Cài đặt UART trên cả Jetson và ESP32
- Chuẩn hóa protocol truyền thông

---

## Bắt Đầu Hướng 2 Ngay Hôm Nay

### **Bước 1: Thêm endpoint Jetson gửi detection**

```javascript
// Server (server.js)
app.post('/api/detections', authenticate, async (req, res) => {
  try {
    const { robot_id, event_type, confidence, location, image_path } = req.body;
    
    // Validate
    if (!event_type || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Lưu database
    const result = await detectionModel.create({
      robot_id: robot_id || 'kali-vega-01',
      event_type,
      confidence,
      location,
      image_path,
      created_at: new Date()
    });
    
    // Gửi lệnh xuống ESP32 nếu cần
    if (event_type === 'ABANDONED_ITEM' && confidence > 0.8) {
      forwardCommandToRobot({
        type: 'COMMAND',
        data: {
          command: 'STOP',
          parameters: { reason: 'Abandoned item detected' }
        }
      });
    }
    
    res.json({ success: true, detection_id: result.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **Bước 2: Test với Postman/cURL**

```bash
curl -X POST http://localhost:3000/api/detections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "robot_id": "kali-vega-01",
    "event_type": "ABANDONED_ITEM",
    "confidence": 0.92,
    "location": { "lat": 10.5, "lon": 20.3 },
    "image_path": "/jetson/captures/item_001.jpg"
  }'
```

### **Bước 3: Observe kết quả**

- ✅ ESP32 có nhận lệnh không?
- ✅ Độ trễ bao lâu?
- ✅ Có lỗi gì không?
- ✅ Database log đầy đủ?
- ✅ Dashboard update realtime?

### **Bước 4: Điều chỉnh ưu tiên**

```javascript
// Thêm logic ưu tiên lệnh
function determinePriority(source, command) {
  if (source === 'JETSON_AI') {
    // AI detection ưu tiên cao
    if (command === 'STOP') return 'CRITICAL';
    if (command === 'ALERT') return 'HIGH';
    return 'NORMAL';
  } else if (source === 'USER') {
    // User command ưu tiên thấp hơn
    return 'LOW';
  }
}
```

---

## Kết Luận

**Hướng 2 phù hợp để:**
- 🟢 Test xử lý xung đột lệnh
- 🟢 Xây dựng hệ thống log tập trung
- 🟢 Phát triển nhanh mà không cần Jetson
- 🟢 Hiểu rõ flow trước khi tối ưu

**Sau này có thể upgrade lên Hướng 1 khi:**
- ⚠️ Độ trễ trở thành vấn đề thực tế
- ⚠️ Hệ thống phải hoạt động offline
- ⚠️ Có nhu cầu STOP khẩn cấp nhanh hơn

---

## Tham Khảo Thêm

- `SERVER_TO_ESP32.md` - Chi tiết luồng Server → ESP32
- `KIEN_TRUC_JETSON_ESP32_VS_SERVER_RELAY.md` - So sánh kiến trúc
