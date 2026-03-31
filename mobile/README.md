# Hướng dẫn cài đặt Mobile App

## Cấu trúc file cần sao chép vào project

```
mobile/
├── hooks/
│   ├── useRobotWS.ts       ← Copy từ hooks/useRobotWS.ts
│   └── useRobotApi.ts      ← Copy từ hooks/useRobotApi.ts
├── components/
│   └── Joystick.tsx        ← Copy từ components/Joystick.tsx
└── app/
    ├── dashboard.tsx       ← Copy vào app/(tabs)/dashboard.tsx
    ├── manual.tsx          ← Copy vào app/manual.tsx
    ├── connect.tsx         ← Copy vào app/connect.tsx
    ├── camera.tsx          ← Copy vào app/camera.tsx
    └── settings.tsx        ← Copy vào app/settings.tsx
```

## Bước 1: Cài package cần thiết

```bash
cd mobile
npx expo install @react-native-community/slider
npx expo install @react-native-async-storage/async-storage
```

## Bước 2: Sửa IP trong file .env

Mở file `mobile/.env` và đổi IP thành IP máy tính chạy server:

```
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:5000
EXPO_PUBLIC_WS_URL=ws://192.168.1.XXX:5000/ws/dashboard
```

> Tìm IP máy tính: Windows → `ipconfig`, Mac/Linux → `ifconfig`

## Bước 3: Cấu hình Expo Router

Mở `app/_layout.tsx` và đảm bảo có Stack cho các màn hình mới:

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="manual"   options={{ headerShown: false }} />
      <Stack.Screen name="connect"  options={{ headerShown: false }} />
      <Stack.Screen name="camera"   options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="login"    options={{ headerShown: false }} />
    </Stack>
  );
}
```

## Bước 4: Sửa file dashboard.tsx

File `app/(tabs)/dashboard.tsx` — thay toàn bộ nội dung bằng file `app/dashboard.tsx` đã cung cấp.

## Bước 5: Chạy lại app

```bash
npx expo start --clear
```

## Tính năng đã implement

| Màn hình       | Tính năng |
|----------------|-----------|
| Dashboard      | Connection status, Signal bars, Menu cards điều hướng |
| Manual Control | Joystick cảm ứng, Speed slider, STOP/Emergency, Mode toggle |
| Connect        | WebSocket manager, Connection log, ESP32 status |
| Camera         | Live stream, Health check, Auto-retry |
| Settings       | Dark mode toggle, Notifications, Device profiles |

## Lưu ý

- `Joystick.tsx` dùng `PanResponder` của React Native (không dùng pointer events như web)
- `useRobotWS.ts` tự động reconnect mỗi 3 giây nếu mất kết nối
- Camera stream dùng `<Image>` tag với URL MJPEG — cần server hỗ trợ MJPEG stream
