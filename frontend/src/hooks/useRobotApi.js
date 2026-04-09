import { useCallback } from 'react';
import { getApiBaseUrl } from '../utils/runtimeEndpoints';

const BASE = getApiBaseUrl();
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

  const _put = useCallback(
    (path, body) =>
      request(path, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    [request]
  );

  const _get = useCallback((path) => request(path, { method: 'GET' }), [request]);

  const _delete = useCallback((path) => request(path, { method: 'DELETE' }), [request]);

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

  const updateMe = useCallback(
    ({ email }) => _put('/api/auth/me', { email }),
    [_put]
  );

  const changePassword = useCallback(
    ({ oldPassword, newPassword, confirmPassword }) =>
      _put('/api/auth/change-password', {
        oldPassword,
        newPassword,
        confirmPassword,
      }),
    [_put]
  );

  const getAllUsers = useCallback(
    ({ role = null } = {}) => {
      const params = new URLSearchParams();
      if (role) params.set('role', role);
      const query = params.toString();
      return _get(`/api/users${query ? `?${query}` : ''}`);
    },
    [_get]
  );

  const getUserById = useCallback((id) => _get(`/api/users/${id}`), [_get]);

  const createUser = useCallback(
    ({ username, email, password, role }) =>
      _post('/api/users', {
        username,
        email,
        password,
        role,
      }),
    [_post]
  );

  const updateUser = useCallback(
    (id, payload) => _put(`/api/users/${id}`, payload),
    [_put]
  );

  const deleteUser = useCallback((id) => _delete(`/api/users/${id}`), [_delete]);

  const updateUserPassword = useCallback(
    (id, { oldPassword, newPassword, confirmPassword }) =>
      _put(`/api/users/${id}/password`, {
        oldPassword,
        newPassword,
        confirmPassword,
      }),
    [_put]
  );

  const resetUserPassword = useCallback(
    (id) => _post(`/api/users/${id}/reset-password`, {}),
    [_post]
  );

  const getAllEvents = useCallback(
    ({ limit = 50, offset = 0, status = null, from = null, to = null } = {}) => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      if (status && status !== 'all') params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return _get(`/api/events?${params.toString()}`);
    },
    [_get]
  );

  const getEventById = useCallback((id) => _get(`/api/events/${id}`), [_get]);

  const updateEventStatus = useCallback(
    (id, { status, note = null }) => _put(`/api/events/${id}/status`, { status, note }),
    [_put]
  );

  const deleteEvent = useCallback((id) => _delete(`/api/events/${id}`), [_delete]);

  const getEventStats = useCallback(() => _get('/api/events/stats'), [_get]);

  const getGpsLatest = useCallback(
    (robotId = null) => {
      const query = robotId ? `?robotId=${encodeURIComponent(robotId)}` : '';
      return _get(`/api/gps/latest${query}`);
    },
    [_get]
  );

  const getGpsHistory = useCallback(
    ({ limit = 200, from = null, to = null, robotId = null } = {}) => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (robotId) params.set('robotId', robotId);
      return _get(`/api/gps/history?${params.toString()}`);
    },
    [_get]
  );

  return {
    sendCommand,
    setMode,
    register,
    login,
    getMe,
    updateMe,
    changePassword,
    getGpsLatest,
    getGpsHistory,
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    updateUserPassword,
    resetUserPassword,
    getAllEvents,
    getEventById,
    updateEventStatus,
    deleteEvent,
    getEventStats,
  };
}
