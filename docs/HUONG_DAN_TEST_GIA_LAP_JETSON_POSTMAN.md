# Hướng Dẫn Test Giả Lập Jetson Gửi Cảnh Báo Lên Server Bằng Postman

## 1. Mục tiêu
Giả lập luồng Jetson phát hiện đồ vật để quên và gửi dữ liệu lên server:

1. Server nhận dữ liệu.
2. Server lưu bản ghi detection + event vào database.
3. (Nếu đã làm realtime) Server broadcast thông báo WebSocket cho dashboard.

---

## 2. Khi nào dùng tài liệu này

- **Trường hợp A (khuyến nghị):** Bạn đã code endpoint `POST /api/ingest/abandoned-alert` (multipart/form-data, có upload ảnh).
- **Trường hợp B (fallback):** Chưa code endpoint ingest, test bằng 2 API có sẵn:
  - `POST /api/detections`
  - `POST /api/events`

---

## 3. Chuẩn bị

1. Chạy backend tại `http://localhost:5000`.
2. Đảm bảo PostgreSQL đang chạy.
3. Có tài khoản đăng nhập (ví dụ admin).
4. Chuẩn bị 1-2 ảnh mẫu trên máy để upload (jpg/png/webp).

---

## 4. Trường hợp A: Test endpoint ingest (sau khi đã code)

## 4.1 Đăng nhập lấy token

- Method: `POST`
- URL: `http://localhost:5000/api/auth/login`
- Body (JSON):

```json
{
  "identifier": "admin",
  "password": "Admin@123"
}
```

Kỳ vọng:
- Status `200`.
- Lấy `token` từ response.

## 4.2 Mở WebSocket để quan sát thông báo realtime

Trong Postman, tạo **WebSocket Request**:

- URL: `ws://localhost:5000/ws/dashboard?token=YOUR_TOKEN`

Kỳ vọng:
- Kết nối thành công.
- Nhận message `STATUS` ban đầu.

## 4.3 Gửi request giả lập Jetson

- Method: `POST`
- URL: `http://localhost:5000/api/ingest/abandoned-alert`
- Body: chọn `form-data`

### Field text

- `objectType` = `backpack`
- `confidence` = `0.92`
- `locationX` = `325.4`
- `locationY` = `212.8`
- `firstSeen` = `2026-04-16T09:10:00.000Z`
- `lastSeen` = `2026-04-16T09:13:10.000Z`
- `duration` = `190`

### Field file

- `image` = chọn ảnh mẫu (bắt buộc)
- `snapshot` = chọn ảnh mẫu khác (không bắt buộc)

> Không cần gửi `note` trong kịch bản này.

Kỳ vọng:
- Status `201`.
- Response có `detection` và `event`.
- `imagePath`/`snapshotPath` là path public (ví dụ `/uploads/jetson/...`).
- Tab WebSocket nhận message `ABANDONED_ALERT`.

## 4.4 Verify dữ liệu đã lưu

### Kiểm tra events

- Method: `GET`
- URL: `http://localhost:5000/api/events?limit=5&status=pending`
- Header: `Authorization: Bearer YOUR_TOKEN`

Kỳ vọng:
- Có event mới vừa tạo.

### Kiểm tra detections

- Method: `GET`
- URL: `http://localhost:5000/api/detections?limit=5`

Kỳ vọng:
- Có detection mới với `object_type = backpack`.

---

## 5. Trường hợp B: Chưa có endpoint ingest (test tạm bằng API hiện có)

## 5.1 Tạo detection

- Method: `POST`
- URL: `http://localhost:5000/api/detections`
- Body (JSON):

```json
{
  "objectType": "backpack",
  "confidence": 0.92,
  "imagePath": "/snapshots/jetson/frame_001.jpg",
  "locationX": 325.4,
  "locationY": 212.8
}
```

Kỳ vọng:
- Status `201`.
- Lấy `detection.id` từ response.

## 5.2 Tạo event từ detection

- Method: `POST`
- URL: `http://localhost:5000/api/events`
- Header: `Authorization: Bearer YOUR_TOKEN`
- Body (JSON):

```json
{
  "detectionId": 1,
  "firstSeen": "2026-04-16T09:10:00.000Z",
  "lastSeen": "2026-04-16T09:13:10.000Z",
  "duration": 190,
  "snapshotPath": "/snapshots/jetson/alert_001.jpg"
}
```

> Đổi `detectionId` theo ID thực tế vừa tạo.

Kỳ vọng:
- Status `201`.
- Event có `status = pending`.

---

## 6. Lỗi thường gặp và cách xử lý

1. `404 Endpoint not found`:
- Bạn chưa mount route ingest vào `server.js`.

2. `400 Missing required fields`:
- Thiếu field bắt buộc như `objectType`, `confidence`, `image`...

3. `401 Unauthorized` khi gọi `/api/events`:
- Thiếu hoặc sai JWT token.

4. Ảnh không hiển thị trên frontend:
- Bạn đang lưu local path kiểu `C:\...` hoặc path không public.
- Cần dùng URL/path mà browser truy cập được.

---

## 7. Checklist hoàn tất

- [ ] Request giả lập từ Postman trả `201`.
- [ ] Có bản ghi mới trong `detections`.
- [ ] Có bản ghi mới trong `abandoned_events`.
- [ ] (Nếu có WS) Dashboard nhận `ABANDONED_ALERT` realtime.
- [ ] Frontend hiện ảnh từ `imagePath` hoặc `snapshotPath`.
