import { useState, useEffect, useRef, useCallback } from 'react';

// ⚠️ Đổi IP này thành IP máy tính chạy server của bạn
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://192.168.1.223:5000/ws/dashboard';

const DEFAULT_STATUS = {
  robotConnected: false,
  mode: 'UNKNOWN',
  state: -1,
  rssi: null as number | null,
  uptime: 0,
  lastSeen: null as string | null,
  device: 'KaliVega-01',
};

export function useRobotWS() {
  const [robotStatus, setRobotStatus] = useState(DEFAULT_STATUS);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setWsConnected(true);
        if (reconnectRef.current) clearTimeout(reconnectRef.current);
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setWsConnected(false);
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();

      ws.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'STATUS' && msg.data)
            setRobotStatus(prev => ({ ...prev, ...msg.data }));
          else if (msg.type === 'ROBOT_CONNECTED')
            setRobotStatus(prev => ({ ...prev, robotConnected: msg.data?.connected ?? false }));
        } catch {}
      };
    } catch {
      reconnectRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendDirect = useCallback((command: string, parameters: any = null) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'DIRECT_COMMAND',
        data: { command, parameters },
      }));
    }
  }, []);

  return { robotStatus, wsConnected, sendDirect };
}
