import { useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

// ⚠️ Đổi IP này thành IP máy tính chạy server của bạn
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.223:5000';

export function useRobotApi() {
  const request = useCallback(async (path: string, options: any = {}) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const headers: any = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${BASE}${path}`, { ...options, headers });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Request failed', status: res.status };
      }
      return data;
    } catch (e: any) {
      console.error(`[API] ${path}:`, e.message);
      return { success: false, error: e.message };
    }
  }, []);

  const _post = useCallback(
    (path: string, body: any) =>
      request(path, { method: 'POST', body: JSON.stringify(body) }),
    [request]
  );

  const _get = useCallback((path: string) => request(path, { method: 'GET' }), [request]);

  const sendCommand = useCallback(
    (command: string, parameters: any = null) =>
      _post('/api/commands', { userId: 1, command, parameters }),
    [_post]
  );

  const setMode = useCallback(
    (mode: string) => _post('/api/robot/mode', { mode }),
    [_post]
  );

  const login = useCallback(
    ({ identifier, password }: { identifier: string; password: string }) =>
      _post('/api/auth/login', { identifier, password }),
    [_post]
  );

  const register = useCallback(
    ({ username, email, password }: { username: string; email: string; password: string }) =>
      _post('/api/auth/register', { username, email, password }),
    [_post]
  );

  const getMe = useCallback(() => _get('/api/auth/me'), [_get]);

  return { sendCommand, setMode, login, register, getMe };
}
