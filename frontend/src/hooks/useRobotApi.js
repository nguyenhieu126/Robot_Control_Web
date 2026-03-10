import { useCallback } from 'react';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const DEFAULT_USER_ID = 1;

export function useRobotApi() {
  const _post = useCallback(async (path, body) => {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (e) {
      console.error(`[API] POST ${path}:`, e.message);
      return { success: false, error: e.message };
    }
  }, []);

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

  return { sendCommand, setMode };
}
