import { useCallback } from 'react';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const DEFAULT_USER_ID = 1;

export function useRobotApi() {
  const request = useCallback(async (path, options = {}) => {
    try {
      const token = localStorage.getItem('auth_token');
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
  }, []);

  const _post = useCallback(
    (path, body) =>
      request(path, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    [request]
  );

  const _get = useCallback((path) => request(path, { method: 'GET' }), [request]);

  /** Tạo lệnh mới (lưu DB + push WS) */
  const sendCommand = useCallback(
    (command, parameters = null) =>
      _post('/api/commands', { userId: DEFAULT_USER_ID, command, parameters }),
    [_post]
  );

  /** Đổi mode AUTONOMOUS / MANUAL */
  const setMode = useCallback(
    (mode) => _post('/api/robot/mode', { mode }),
    [_post]
  );

  const register = useCallback(
    ({ username, email, password }) =>
      _post('/api/auth/register', {
        username,
        email,
        password,
      }),
    [_post]
  );

  const login = useCallback(
    ({ identifier, password }) =>
      _post('/api/auth/login', {
        identifier,
        password,
      }),
    [_post]
  );

  const getMe = useCallback(() => _get('/api/auth/me'), [_get]);

  return { sendCommand, setMode, register, login, getMe };
}
