import React, { useState } from "react";
import { useRobotWS } from "../hooks/useRobotWS";
import "./Dashboard.css";

const SIZES = ["SM", "MD", "LG", "XL"];

const MENU_ITEMS = [
  {
    id: "connect",
    cls: "card-connect",
    icon: "📶",
    label: "Connect",
    desc: "Manage device connections",
  },
  {
    id: "manual",
    cls: "card-manual",
    icon: "✋",
    label: "Manual Control",
    desc: "Drive control + live camera",
  },
  // {
  //   id: "sliders",
  //   cls: "card-sliders",
  //   icon: "🎚",
  //   label: "Sliders",
  // //   desc: "Fine-tune parameters",
  // // },
  // // {
  // //   id: "auto",
  // //   cls: "card-auto",
  // //   icon: "⚡",
  // //   label: "Auto Mode",
  // //   desc: "Autonomous operation",
  // // },
  // {
  //   id: "calibration",
  //   cls: "card-calibration",
  //   icon: "🎯",
  //   label: "Calibration",
  //   desc: "Sensor alignment",
  // },
  {
    id: "map",
    cls: "card-connect",
    icon: "🗺️",
    label: "Map Tracking",
    desc: "Realtime GPS trail",
  },
  {
    id: "settings",
    cls: "card-settings",
    icon: "⚙",
    label: "Settings",
    desc: "System preferences",
  },
];

function Dashboard({ onNavigate, onLogout, darkMode = true }) {
  const [size, setSize] = useState("XL");
  const theme = darkMode ? "dark" : "light";
  const { robotStatus, wsConnected } = useRobotWS();

  const robotConnected = !!robotStatus.robotConnected;
  const connectionText = robotConnected ? "Connected" : "Disconnected";
  const deviceName = robotStatus.device || "KaliVega-01";

  let signalLevel = 0;
  if (robotConnected && robotStatus.rssi !== null && robotStatus.rssi !== undefined) {
    if (robotStatus.rssi >= -50) signalLevel = 4;
    else if (robotStatus.rssi >= -65) signalLevel = 3;
    else if (robotStatus.rssi >= -80) signalLevel = 2;
    else signalLevel = 1;
  }

  const signalLabel = !robotConnected || signalLevel === 0
    ? "No signal"
    : signalLevel >= 4
      ? "Strong"
      : signalLevel >= 3
        ? "Good"
        : signalLevel >= 2
          ? "Weak"
          : "Very weak";

  const protocolLabel = wsConnected ? "WebSocket" : "Offline";

  const handleCardClick = (id) => {
    if (id === "settings" && onNavigate) onNavigate("settings");
    if (id === "manual"   && onNavigate) onNavigate("manual");
    if (id === "auto"     && onNavigate) onNavigate("manual");  // auto card cũng vào manual để toggle
    if (id === "connect"  && onNavigate) onNavigate("connect");
    if (id === "camera"   && onNavigate) onNavigate("manual");
    if (id === "map"      && onNavigate) onNavigate("map");
  };

  return (
    <div className={`dashboard size-${size.toLowerCase()} dashboard--${theme}`}>
      <div className="dashboard-inner">

        {/* ── HEADER ── */}
        <header className="header">
          <div className="logo">
            <div className="logo-icon-wrap">📡</div>
            <div className="logo-text">
              <h1>KaliVega</h1>
              <p>Controller Dashboard</p>
            </div>
          </div>

          <div className="header-right">
            {/* Size switcher */}
            <div className="size-switcher">
              {SIZES.map((s) => (
                <button
                  key={s}
                  className={`size-btn ${size === s ? "active" : ""}`}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="status-badge">
              <span className={`status-dot ${wsConnected ? 'status-dot--on' : 'status-dot--off'}`} />
              {wsConnected ? "Connected" : "Disconnected"}
            </div>

            <button className="logout-btn" onClick={onLogout}>Đăng xuất</button>
          </div>
        </header>

        {/* ── CONNECTION BOX ── */}
        <div className="connection-box">
          <div className="connection-info">
            <div className="connection-stat">
              <label>Connection Status</label>
              <span className="val">
                <span className={`status-dot ${robotConnected ? 'status-dot--on' : 'status-dot--off'}`} />
                {connectionText}
              </span>
            </div>

            <div className="divider-v" />

            <div className="connection-stat">
              <label>Device</label>
              <span className="val neutral">{deviceName}</span>
            </div>

            <div className="divider-v" />

            <div className="connection-stat">
              <label>Signal</label>
              <span className="val">
                <div className="signal-bars">
                  {[1, 2, 3, 4].map((bar) => (
                    <span key={bar} className={bar <= signalLevel ? "active" : ""} />
                  ))}
                </div>
                {signalLabel}
              </span>
            </div>

            <div className="divider-v" />

            <div className="connection-stat">
              <label>Protocol</label>
              <span className="val neutral">{protocolLabel}</span>
            </div>
          </div>

          <div className="connection-right">
            <div className="bt-circle">🔵</div>
          </div>
        </div>

        {/* ── MENU CARDS ── */}
        <div className="menu-section">
          <p className="section-label">Navigation</p>
          <div className="menu">
            {MENU_ITEMS.map((item) => (
              <div key={item.id} className={`card ${item.cls}`} onClick={() => handleCardClick(item.id)}>
                <div className="icon-badge">{item.icon}</div>
                <span className="card-label">{item.label}</span>
                <span className="card-desc">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;