import { useState, useEffect, useRef, useCallback } from 'react';
import { getWsDashboardUrl } from '../utils/runtimeEndpoints';

function buildWsUrlWithToken() {
  const baseUrl = getWsDashboardUrl();

  if (typeof window === 'undefined') {
    return baseUrl;
  }

  const token = localStorage.getItem('auth_token');
  if (!token) {
    return baseUrl;
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}token=${encodeURIComponent(token)}`;
  }
}

const DEFAULT_STATUS = {
  connected: false,
  mode: 'UNKNOWN',
  state: 'UNKNOWN',
  stateCode: -1,
  rssi: null,
  uptime: 0,
  lastSeen: null,
  robotConnected: false,
  front: null,
  left: null,
  right: null,
  back: null,
  gps: null,
};

export function useRobotWS() {
  const [robotStatus, setRobotStatus] = useState(DEFAULT_STATUS);
  const [wsConnected, setWsConnected] = useState(false);
  const [latestAlert, setLatestAlert] = useState(null);
  const wsRef         = useRef(null);
  const reconnectRef  = useRef(null);
  const mountedRef    = useRef(true);
  const seenAlertIdsRef = useRef(new Set());

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(buildWsUrlWithToken());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setWsConnected(true);
        clearTimeout(reconnectRef.current);
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setWsConnected(false);
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => { ws.close(); };

      ws.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'STATUS' && msg.data) {
            setRobotStatus(prev => ({ ...prev, ...msg.data }));
          } else if (msg.type === 'ROBOT_CONNECTED') {
            setRobotStatus(prev => ({
              ...prev,
              robotConnected: msg.data?.connected ?? false,
            }));
          } else if (msg.type === 'ABANDONED_ALERT' && msg.data) {
            const eventId = msg.data?.eventId;
            if (eventId !== undefined && eventId !== null) {
              const eventKey = String(eventId);
              if (seenAlertIdsRef.current.has(eventKey)) {
                return;
              }
              seenAlertIdsRef.current.add(eventKey);
            }

            setLatestAlert({ ...msg.data });
          } else if (msg.type === 'DIRECT_COMMAND_ACK' && msg.data?.success === false) {
            console.warn('[WS] Direct command rejected:', msg.data?.error || 'Unknown error');
          }
        } catch {}
      };
    } catch (e) {
      reconnectRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  /** Gửi lệnh realtime trực tiếp đến ESP32 (không lưu DB) */
  const sendDirect = useCallback((command, parameters = null) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'DIRECT_COMMAND',
        data: { command, parameters },
      }));
    }
  }, []);

  return { robotStatus, wsConnected, latestAlert, sendDirect };
}
