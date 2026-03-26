import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.REACT_APP_WS_DASHBOARD || 'ws://localhost:5000/ws/dashboard';

const DEFAULT_STATUS = {
  connected: false,
  mode: 'UNKNOWN',
  state: -1,
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
  const wsRef         = useRef(null);
  const reconnectRef  = useRef(null);
  const mountedRef    = useRef(true);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(WS_URL);
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

  return { robotStatus, wsConnected, sendDirect };
}
