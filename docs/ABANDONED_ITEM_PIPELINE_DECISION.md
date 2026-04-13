# Abandoned Item Detection Pipeline - Decision Note

## Ket luan nhanh

Phuong an 1 on hon voi codebase hien tai:

- Jetson detect va gui su kien len server.
- Server la noi ra lenh cho ESP32 dung xe/theo doi/di tiep.
- Jetson khong dieu khien ESP32 truc tiep trong luong chinh.

Ly do: kien truc hien tai da co san kenh WebSocket trung tam Server -> ESP32, co auth/phan quyen o dashboard, va ESP32 dang ky vong doi lenh theo giao thuc COMMAND/MODE_CHANGE.

## Co so danh gia tu he thong hien tai

1. ESP32 dang duoc thiet ke nhan lenh qua server
- ESP32 WebSocket client ket noi vao /ws/robot va xu ly type COMMAND, MODE_CHANGE, PING.
- Duong fallback HTTP da co san khi WS ngat (poll pending command + mode).

2. Backend da la hub trung tam
- Web da co wsManager lam bridge dashboard -> ESP32.
- Backend da co API cho detection va abandoned events:
  - POST /api/detections
  - POST /api/events
- Backend da co robot mode API va trang thai robot cache theo heartbeat.

3. Safety va governance tot hon khi qua server
- Co the log day du detection, event, command, timestamp trong 1 noi.
- De bo sung rule an toan, cooldown, debounce, role-based control.
- De kiem tra va replay su co khi robot dung sai/di sai.

## So sanh 2 huong

## Huong 1: Jetson -> Server -> ESP32 (De xuat)

Uu diem:
- Trung tam hoa quyet dinh, de kiem soat va audit.
- Tuan theo dung kien truc hien co, it sua firmware.
- De mo rong nhieu nguon AI (nhieu camera/nhieu robot).
- De ket hop business rule: nguong thoi gian, confidence, blacklist area, gio hanh chinh.

Nhuoc diem:
- Them 1 hop network (them tre nho).
- Phu thuoc server trong luong dieu khien.

## Huong 2: Jetson -> ESP32 truc tiep, Server chi nhan thong bao

Uu diem:
- Latency nho hon trong ly thuyet.
- Van hanh tam thoi duoc neu server downtime.

Nhuoc diem:
- Tao 2 kenh dieu khien song song (server va jetson), de conflict lenh.
- Mat tinh nhat quan logging/phan quyen/quy trinh phe duyet.
- Tang rui ro bao mat (mo them kenh den ESP32).
- Lam phuc tap firmware va giao thuc dong bo trang thai.

## Kien nghi thuc te

Chon Huong 1 lam luong chinh.

Them 1 co che hybrid de an toan:
- Luong chinh: Jetson -> Server -> ESP32.
- Luong khan cap (optional): Jetson duoc phep gui duy nhat 1 lenh STOP truc tiep den ESP32 khi server mat ket noi qua nguong T, sau do bat buoc dong bo lai voi server khi online.

Neu chua can do phuc tap, bo qua hybrid va di thang Huong 1.

## Pipeline de xuat (Huong 1)

1. Jetson detect object + person tren moi frame.
2. Khi co vat nghi bo quen (object co, person khong gan, confidence dat nguong):
   - Jetson POST /api/detections (snapshot + meta).
   - Jetson POST /api/events voi status = pending.
3. Server nhan event pending:
   - Gui COMMAND STOP qua wsManager den ESP32.
   - Danh dau robot state/event state = monitoring.
4. Jetson theo doi trong cua so thoi gian (vd 10-20s):
   - Neu van la do bo quen: update event = confirmed, gui thong bao.
   - Neu khong con dieu kien bo quen: update event = resolved.
5. Server quyet dinh cho xe di tiep:
   - Gui lenh MOVE/SET_MODE tuy theo policy.

## Nguong de khoi dong (goi y)

- confidence object >= 0.65
- confidence person < 0.40 trong vung lan can vat
- thoi gian theo doi xac nhan: 12s
- cooldown cung 1 vi tri/snapshot: 20s

## Danh sach viec can them nho

1. Backend
- Them endpoint event state machine nho (pending -> monitoring -> confirmed/resolved).
- Them rule anti-spam command STOP (debounce/cooldown).

2. Jetson
- Dong nhat payload detection/event.
- Bo sung tracker nhe de khong tao event moi moi frame.

3. ESP32
- Dung shape COMMAND hien tai (id co the -1 cho realtime).
- Khong mo them kenh dieu khien truc tiep neu khong that su can.

## Tom tat 1 dong

Voi he thong hien tai, phuong an on dinh va de van hanh nhat la: Jetson detect -> Server quyet dinh -> ESP32 thi hanh.