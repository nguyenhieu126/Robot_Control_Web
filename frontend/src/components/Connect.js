import React, { useState, useRef, useCallback, useEffect } from "react";
import "./Connect.css";

const WS_URL = process.env.REACT_APP_WS_DASHBOARD || "ws://localhost:5000/ws/dashboard";

const STATE_NAMES = {
  "-1": "Unknown",
  0:    "Idle",
  1:    "Moving",
  2:    "Obstacle Detected",
  3:    "Emergency Stop",
  4:    "Calibrating",
};

function RssiBar({ rssi }) {
  if (rssi == null) return <span className="cn-val-dim">—</span>;
  const level = rssi >= -50 ? 4 : rssi >= -65 ? 3 : rssi >= -80 ? 2 : 1;
  return (
    <span className="cn-rssi-wrap">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={`cn-rssi-bar ${i <= level ? "active" : ""}`} />
      ))}
      <span className="cn-rssi-num">{rssi} dBm</span>
    </span>
  );
}

function StatusPill({ connected, label }) {
  return (
    <span className={`cn-pill ${connected ? "cn-pill--on" : "cn-pill--off"}`}>
      <span className="cn-pill-dot" />
      {label}
    </span>
  );
}

export default function Connect({ onBack, darkMode = true }) {
  const theme = darkMode ? "dark" : "light";

  /* ── WS state ── */
  const [wsState, setWsState]           = useState("disconnected"); // connecting | connected | disconnected | error
  const [robotConnected, setRobotConnected] = useState(false);
  const [robotStatus, setRobotStatus]   = useState(null);
  const [log, setLog]                   = useState([]);
  const [serverUrl, setServerUrl]       = useState(WS_URL);
  const [editingUrl, setEditingUrl]     = useState(false);
  const [urlDraft, setUrlDraft]         = useState(WS_URL);

  const wsRef       = useRef(null);
  const reconnectRef = useRef(null);
  const mountedRef  = useRef(true);
  const logRef      = useRef(null);

  const addLog = useCallback((msg, type = "info") => {
    const ts = new Date().toLocaleTimeString("vi-VN", { hour12: false });
    setLog((prev) => [...prev.slice(-49), { ts, msg, type }]);
  }, []);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsState("disconnected");
    setRobotConnected(false);
    addLog("Disconnected manually.", "warn");
  }, [addLog]);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;
    setWsState("connecting");
    addLog(`Connecting to ${serverUrl} …`, "info");

    try {
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setWsState("connected");
        addLog("✅ WebSocket connected to server.", "success");
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setWsState("disconnected");
        setRobotConnected(false);
        addLog("Connection closed. Retrying in 3 s…", "warn");
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        addLog("❌ WebSocket error.", "error");
        ws.close();
      };

      ws.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(e.data);
          switch (msg.type) {
            case "STATUS":
              setRobotStatus(msg.data);
              setRobotConnected(msg.data?.robotConnected ?? false);
              addLog(`📊 Status update: mode=${msg.data?.mode}, state=${msg.data?.state}`, "info");
              break;
            case "ROBOT_CONNECTED":
              setRobotConnected(msg.data?.connected ?? false);
              addLog(
                msg.data?.connected
                  ? "🤖 ESP32 connected to server!"
                  : "🔌 ESP32 disconnected from server.",
                msg.data?.connected ? "success" : "warn"
              );
              break;
            case "WELCOME":
              addLog(`🖐 Server: ${msg.data?.message}`, "success");
              break;
            default:
              break;
          }
        } catch {}
      };
    } catch (err) {
      setWsState("error");
      addLog(`❌ Failed to connect: ${err.message}`, "error");
      reconnectRef.current = setTimeout(connect, 3000);
    }
  }, [serverUrl, addLog]);

  /* Auto-connect on mount */
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectRef.current);
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Scroll log to bottom */
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const handleManualConnect = () => {
    clearTimeout(reconnectRef.current);
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    connect();
  };

  const handleSaveUrl = () => {
    setServerUrl(urlDraft);
    setEditingUrl(false);
    // Will reconnect on next handleManualConnect or useEffect re-run
  };

  const wsStateLabel = {
    connecting:   "Connecting…",
    connected:    "Connected",
    disconnected: "Disconnected",
    error:        "Error",
  }[wsState];

  return (
    <div className={`cn-page cn-page--${theme}`}>
      <div className="cn-bg-grid" />
      <div className="cn-glow cn-glow--tl" />
      <div className="cn-glow cn-glow--br" />

      <div className="cn-inner">

        {/* ── HEADER ── */}
        <header className="cn-header">
          <button className="cn-back-btn" onClick={onBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div>
            <h1 className="cn-title">Connect</h1>
            <p className="cn-subtitle">Device connection manager</p>
          </div>
          <div className="cn-header-pills">
            <StatusPill connected={wsState === "connected"}   label="Server" />
            <StatusPill connected={robotConnected}            label="ESP32"  />
          </div>
        </header>

        {/* ── MAIN GRID ── */}
        <div className="cn-grid">

          {/* ── LEFT COLUMN ── */}
          <div className="cn-col cn-col--left">

            {/* Server URL card */}
            <div className="cn-card">
              <div className="cn-card-title">Server WebSocket URL</div>
              {editingUrl ? (
                <div className="cn-url-edit">
                  <input
                    className="cn-url-input"
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveUrl()}
                    autoFocus
                  />
                  <div className="cn-url-btns">
                    <button className="cn-btn cn-btn--primary" onClick={handleSaveUrl}>Save</button>
                    <button className="cn-btn cn-btn--ghost" onClick={() => { setEditingUrl(false); setUrlDraft(serverUrl); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="cn-url-row">
                  <span className="cn-url-display">{serverUrl}</span>
                  <button className="cn-btn cn-btn--ghost cn-btn--sm" onClick={() => { setEditingUrl(true); setUrlDraft(serverUrl); }}>Edit</button>
                </div>
              )}
            </div>

            {/* Connection card */}
            <div className="cn-card">
              <div className="cn-card-title">Connection Status</div>

              <div className="cn-status-block">
                <div className={`cn-status-icon cn-status-icon--${wsState}`}>
                  {wsState === "connected"    ? "✅" :
                   wsState === "connecting"   ? "⏳" :
                   wsState === "error"        ? "❌" : "🔌"}
                </div>
                <div className="cn-status-text">
                  <span className={`cn-status-label cn-status-label--${wsState}`}>{wsStateLabel}</span>
                  <span className="cn-status-url">{serverUrl}</span>
                </div>
              </div>

              <div className="cn-btn-row">
                {wsState !== "connected" ? (
                  <button
                    className="cn-btn cn-btn--primary cn-btn--full"
                    onClick={handleManualConnect}
                    disabled={wsState === "connecting"}
                  >
                    {wsState === "connecting" ? (
                      <><span className="cn-spinner" /> Connecting…</>
                    ) : "Connect"}
                  </button>
                ) : (
                  <button className="cn-btn cn-btn--danger cn-btn--full" onClick={disconnect}>
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* ESP32 card */}
            <div className="cn-card">
              <div className="cn-card-title">ESP32 Device</div>
              <div className={`cn-device-status ${robotConnected ? "cn-device-status--on" : "cn-device-status--off"}`}>
                <span className="cn-device-icon">🤖</span>
                <div className="cn-device-info">
                  <span className="cn-device-name">KaliVega-ESP32</span>
                  <span className="cn-device-state">
                    {robotConnected ? "Online" : "Offline — waiting for ESP32…"}
                  </span>
                </div>
                <span className={`cn-device-dot ${robotConnected ? "cn-device-dot--on" : ""}`} />
              </div>

              {robotStatus && robotConnected && (
                <div className="cn-stats-grid">
                  <div className="cn-stat">
                    <label>Mode</label>
                    <span>{robotStatus.mode ?? "—"}</span>
                  </div>
                  <div className="cn-stat">
                    <label>State</label>
                    <span>{STATE_NAMES[robotStatus.state] ?? robotStatus.state ?? "—"}</span>
                  </div>
                  <div className="cn-stat">
                    <label>Signal</label>
                    <RssiBar rssi={robotStatus.rssi} />
                  </div>
                  <div className="cn-stat">
                    <label>Uptime</label>
                    <span>{robotStatus.uptime != null ? `${robotStatus.uptime} s` : "—"}</span>
                  </div>
                  <div className="cn-stat">
                    <label>Last Seen</label>
                    <span className="cn-val-dim">
                      {robotStatus.lastSeen
                        ? new Date(robotStatus.lastSeen).toLocaleTimeString("vi-VN", { hour12: false })
                        : "—"}
                    </span>
                  </div>
                  <div className="cn-stat">
                    <label>Front</label>
                    <span>{robotStatus.front != null ? `${robotStatus.front} cm` : "—"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN — LOG ── */}
          <div className="cn-col cn-col--right">
            <div className="cn-card cn-card--log">
              <div className="cn-card-title">
                Connection Log
                <button className="cn-btn cn-btn--ghost cn-btn--sm" onClick={() => setLog([])}>Clear</button>
              </div>
              <div className="cn-log" ref={logRef}>
                {log.length === 0 && (
                  <span className="cn-log-empty">No events yet…</span>
                )}
                {log.map((entry, i) => (
                  <div key={i} className={`cn-log-row cn-log-row--${entry.type}`}>
                    <span className="cn-log-ts">{entry.ts}</span>
                    <span className="cn-log-msg">{entry.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
