/**
 * services/api.js
 * Mirror chính xác useRobotApi.js của Web App
 * - Dùng SecureStore thay localStorage
 * - KEY 'auth_token' giữ nguyên để consistent
 */
import * as SecureStore from 'expo-secure-store';

// ⚠️ Đổi thành IP máy tính của bạn khi test trên điện thoại thật
// Không dùng localhost — trên mobile localhost = chính điện thoại
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.223:5000';

export const WS_URL = BASE.replace(/^http/, 'ws') + '/ws/dashboard';

export async function request(path, options = {}) {
  try {
    const token = await SecureStore.getItemAsync('accessToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Request failed', status: res.status };
    }

    return data;
  } catch (e) {
    console.error(`[API] ${path}:`, e.message);
    return { success: false, error: e.message };
  }
}

const _post = (path, body) =>
  request(path, { method: 'POST', body: JSON.stringify(body) });

const _get = (path) =>
  request(path, { method: 'GET' });

/**
 * Login — khớp chính xác authController.js
 * Backend nhận: { identifier, password }
 * Backend trả:  { success, data: { token, role, user } }
 */
export async function login({ identifier, password }) {
  const res = await _post('/api/auth/login', { identifier, password });
  if (res.success && res.data?.token) {
    // Lưu với key 'auth_token' giống web
    await SecureStore.setItemAsync('auth_token', res.data.token);
  }
  return res;
}

export async function logout() {
  await SecureStore.deleteItemAsync('auth_token');
}

export async function getMe() {
  return _get('/api/auth/me');
}

/** Tạo lệnh mới (lưu DB + push WS) — giống useRobotApi.sendCommand */
export async function sendCommand(command, parameters = null) {
  return _post('/api/commands', { userId: 1, command, parameters });
}

/** Đổi mode AUTONOMOUS / MANUAL */
export async function setMode(mode) {
  return _post('/api/robot/mode', { mode });
}

export async function getToken() {
  return SecureStore.getItemAsync('auth_token');
}
