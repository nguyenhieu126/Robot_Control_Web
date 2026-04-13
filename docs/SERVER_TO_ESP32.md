# Server/Jetson -> ESP32 (Tài liệu riêng)

Tài liệu này mô tả riêng luồng điều khiển từ Server hoặc Jetson xuống ESP32, cơ chế hybrid, và cách chọn kết nối ở hướng 2.

## 1) Luồng Server -> ESP32 hiện tại (khuyến nghị)

### Mô hình chính
- Kênh 1 (ưu tiên): WebSocket realtime (`/ws/robot`) để đẩy lệnh ngay.
- Kênh 2 (dự phòng): ESP32 polling HTTP (`GET /api/commands/pending/all`) khi WebSocket mất kết nối.

### Trình tự hoạt động
1. UI hoặc API gửi lệnh lên server qua `POST /api/commands`.
2. Backend lưu lệnh (DB) và broadcast lệnh sang ESP32 qua WebSocket.
3. ESP32 nhận lệnh theo format chuẩn:

```json
{
	"type": "COMMAND",
	"data": {
		"id": 123,
		"command": "MOVE",
		"parameters": {
			"direction": "FORWARD",
			"speed": 120,
			"duration_ms": 1000
		}
	}
}
```

4. ESP32 xử lý lệnh và callback về server để đánh dấu đã thực thi (`PUT /api/commands/:id/execute`).
5. Nếu WebSocket đứt, ESP32 tự chuyển sang polling để lấy lệnh chờ.

## 2) Nếu làm hybrid thì cơ chế hoạt động như thế nào?

Hybrid ở đây nên hiểu là "2 lớp truyền lệnh" để vừa nhanh vừa bền:

- Lớp realtime (WebSocket):
	- Độ trễ thấp, phù hợp lệnh tay (manual) như `MOVE`, `STOP`, `TURN`.
	- Server push trực tiếp, ESP32 nhận gần như ngay lập tức.

- Lớp bảo toàn lệnh (HTTP + DB queue):
	- Khi mạng chập chờn hoặc WS rớt, lệnh vẫn nằm trong DB.
	- ESP32 polling định kỳ để không mất lệnh.

### Quy tắc chuyển kênh đề xuất
- WS còn sống: nhận lệnh qua WS là chính.
- WS mất: chuyển sang polling mỗi 500ms (manual) hoặc 2000ms (autonomous).
- WS hồi lại: quay về realtime, vẫn giữ polling nhẹ để fail-safe.

### Ưu điểm hybrid
- Nhanh khi mạng tốt.
- Không mất lệnh khi mạng xấu.
- Dễ giám sát vì lệnh có log/DB.

## 3) Hướng 2: dùng RX/TX cắm chéo hay dùng Bluetooth?

Nếu "hướng 2" là kênh truyền cục bộ giữa thiết bị chủ (server cục bộ như Raspberry Pi/PC gần robot) và ESP32, có 2 cách phổ biến:

### A. UART TTL (RX/TX cắm chéo)
- Đấu dây:
	- TX (thiết bị A) -> RX (ESP32)
	- RX (thiết bị A) -> TX (ESP32)
	- GND chung bắt buộc
- Ưu điểm:
	- Ổn định, độ trễ thấp, dễ debug bằng Serial.
	- Không cần pairing, không phụ thuộc RF.
- Nhược điểm:
	- Bị giới hạn bởi dây, khó bố trí khi khoảng cách xa.

### B. Bluetooth (Classic/BLE)
- Ưu điểm:
	- Không dây, gọn khi robot di chuyển ngắn.
- Nhược điểm:
	- Cần pairing/reconnect, dễ nhiễu hơn UART có dây.
	- Throughput và độ ổn định thường kém hơn Wi-Fi/WS cho điều khiển realtime liên tục.

## 4) Kết luận chọn phương án

- Nếu ưu tiên ổn định và realtime: chọn Wi-Fi + WS + HTTP fallback (hybrid hiện tại).
- Nếu bắt buộc có kênh cục bộ dự phòng trong phạm vi gần:
	- Ưu tiên UART RX/TX cắm chéo (độ tin cậy cao hơn Bluetooth).
	- Bluetooth chỉ nên dùng khi không thể đi dây.

## 5) Khuyến nghị thực tế cho dự án này

- Giữ kiến trúc chính: Server <-> ESP32 qua Wi-Fi (WS realtime + HTTP fallback).
- Nếu cần "hướng 2" như kênh backup vật lý: thêm UART giữa ESP32 và thiết bị host gần đó.
- Chuẩn hóa một schema lệnh duy nhất cho mọi kênh để tránh lỗi parse.

## 6) Bổ sung: Jetson -> ESP32

Khi dùng Jetson (ví dụ Jetson Nano/Orin) đặt gần robot, có thể xem Jetson là "edge controller" nằm giữa server và ESP32.

### Mô hình khuyến nghị
1. Server gửi lệnh xuống Jetson (HTTP hoặc MQTT hoặc WS tùy hạ tầng).
2. Jetson chuyển lệnh xuống ESP32 qua kênh cục bộ.
3. ESP32 phản hồi trạng thái ngược về Jetson.
4. Jetson đồng bộ trạng thái/lịch sử lên server.

### 3 cách Jetson nói chuyện với ESP32

#### A. UART TTL (khuyên dùng khi Jetson đặt gần ESP32)
- Đấu dây chéo:
	- Jetson TX -> ESP32 RX
	- Jetson RX -> ESP32 TX
	- GND Jetson <-> GND ESP32
- Ưu điểm: ổn định, trễ thấp, dễ kiểm soát realtime.
- Lưu ý mức điện áp: cả hai nên làm việc ở mức logic 3.3V.

#### B. Wi-Fi nội bộ (Jetson làm local server/client)
- Jetson và ESP32 giao tiếp bằng TCP/WS trong cùng mạng nội bộ.
- Ưu điểm: không dây, mở rộng dễ.
- Nhược điểm: phụ thuộc chất lượng Wi-Fi.

#### C. Bluetooth (chỉ khi bắt buộc)
- Dùng khi không đi dây và Wi-Fi không phù hợp.
- Nhược điểm: reconnect/pairing phức tạp hơn, độ ổn định kém hơn UART.

### Cơ chế hybrid khi có Jetson

- Kênh chính: Jetson -> ESP32 qua UART (realtime, độ trễ thấp).
- Kênh phụ: Jetson <-> ESP32 qua Wi-Fi (fallback khi UART lỗi, hoặc dùng cho telemetry bổ sung).
- Khi Jetson mất mạng lên server:
	- Jetson vẫn điều khiển cục bộ ESP32.
	- Jetson lưu queue tạm local.
	- Khi mạng phục hồi, Jetson đẩy bù dữ liệu/lệnh lên server.

### Kết luận nhanh cho Jetson -> ESP32

- Nếu bạn đã có Jetson gần robot: chọn UART RX/TX cắm chéo là tốt nhất cho điều khiển chính.
- Bluetooth không phải lựa chọn ưu tiên cho luồng điều khiển liên tục.
- Dùng Wi-Fi làm kênh bổ sung hoặc khi không thể đi dây UART.

