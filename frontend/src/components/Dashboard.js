import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRobotWS } from "../hooks/useRobotWS";
import Toast from "./common/Toast";
import {
  getBrowserNotificationPermission,
  getNotificationSettings,
  isBrowserNotificationSupported,
} from "../utils/browserNotifications";
import {
  getAlertToastDurationMsPreference,
  getDashboardSizePreference,
  getNotificationClickOpensEventsPreference,
  setDashboardSizePreference,
} from "../utils/appPreferences";
import "./styles/Dashboard.css";

const SIZES = ["SM", "MD", "LG", "XL"];
const NOTIFICATION_COOLDOWN_MS = 30000;

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
  {
    id: "cameraView",
    cls: "card-sliders",
    icon: "🎥",
    label: "Camera View",
    desc: "Live stream only",
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
    id: "events",
    cls: "card-manual",
    icon: "🧳",
    label: "Abandoned Events",
    desc: "Review and update incidents",
  },
  {
    id: "settings",
    cls: "card-settings",
    icon: "⚙",
    label: "Settings",
    desc: "System preferences",
  },
];

function Dashboard({ onNavigate, onLogout, darkMode = true, allowedMenuIds = [], authUser = null }) {
  const [size, setSize] = useState(() => getDashboardSizePreference());
  const [alertToastDurationMs] = useState(() => getAlertToastDurationMsPreference());
  const [notificationClickOpensEvents] = useState(() => getNotificationClickOpensEventsPreference());
  const [toast, setToast] = useState({ type: "info", message: "" });
  const notifiedEventRef = useRef(new Map());
  const permissionHintShownRef = useRef({ unsupported: false, default: false, denied: false });
  const theme = darkMode ? "dark" : "light";
  const { robotStatus, wsConnected, latestAlert } = useRobotWS();
  const hasMenuRestrictions = Array.isArray(allowedMenuIds) && allowedMenuIds.length > 0;
  const canManageUsers = !hasMenuRestrictions || allowedMenuIds.includes("users");
  const canEditProfile = !hasMenuRestrictions || allowedMenuIds.includes("profile");
  const displayName = authUser?.username || "operator";

  const visibleMenuItems = useMemo(() => {
    if (!Array.isArray(allowedMenuIds) || allowedMenuIds.length === 0) {
      return MENU_ITEMS;
    }

    return MENU_ITEMS.filter((item) => allowedMenuIds.includes(item.id));
  }, [allowedMenuIds]);

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

  useEffect(() => {
    setDashboardSizePreference(size);
  }, [size]);

  useEffect(() => {
    if (!latestAlert) return;

    const objectType = latestAlert.objectType || "khong ro";
    setToast({
      type: "warning",
      message: `Cảnh báo: Phát hiện đồ vật bị bỏ quên (${objectType})`,
    });

    const settings = getNotificationSettings();
    if (!settings.enabled) {
      return;
    }

    const notificationSupported = isBrowserNotificationSupported();
    if (!notificationSupported) {
      if (!permissionHintShownRef.current.unsupported) {
        permissionHintShownRef.current.unsupported = true;
        setToast({
          type: "info",
          message: "Browser không hỗ trợ push Notification. Đang dùng toast trong app.",
        });
      }
      return;
    }

    const permission = getBrowserNotificationPermission();
    if (permission !== "granted") {
      if (permission === "default" && !permissionHintShownRef.current.default) {
        permissionHintShownRef.current.default = true;
        setToast({
          type: "info",
          message: "Chưa cấp quyền Notification. Vào Settings để bấm Grant Permission.",
        });
      }

      if (permission === "denied" && !permissionHintShownRef.current.denied) {
        permissionHintShownRef.current.denied = true;
        setToast({
          type: "error",
          message: "Notification đang bị chặn bởi trình duyệt. Hãy mở quyền trong browser settings.",
        });
      }
      return;
    }

    const tabFocused =
      typeof document !== "undefined"
      && document.visibilityState === "visible"
      && document.hasFocus();

    if (tabFocused && !settings.notifyWhenFocused) {
      return;
    }

    const eventId = latestAlert.eventId ?? latestAlert.id ?? null;
    const eventKey = eventId !== null && eventId !== undefined
      ? `event:${eventId}`
      : `fallback:${objectType}:${latestAlert.createdAt || "unknown"}`;
    const now = Date.now();
    const lastNotifiedAt = notifiedEventRef.current.get(eventKey) || 0;
    if (now - lastNotifiedAt < NOTIFICATION_COOLDOWN_MS) {
      return;
    }

    notifiedEventRef.current.set(eventKey, now);

    try {
      const notification = new Notification("Abandoned Item Alert", {
        body: `Detected: ${objectType}`,
        tag: `abandoned-${eventKey}`,
        renotify: false,
      });

      notification.onclick = () => {
        notification.close();
        window.focus();
        if (notificationClickOpensEvents && typeof onNavigate === "function") {
          onNavigate("events");
        }
      };
    } catch (error) {
      setToast({
        type: "error",
        message: "Không thể hiển thị Notification của trình duyệt. Đang dùng toast trong app.",
      });
      console.error("[Notification] Failed to show browser notification:", error);
    }
  }, [latestAlert, notificationClickOpensEvents, onNavigate]);

  const handleCardClick = (id) => {
    if (id === "settings" && onNavigate) onNavigate("settings");
    if (id === "manual"   && onNavigate) onNavigate("manual");
    if (id === "cameraView" && onNavigate) onNavigate("cameraView");
    if (id === "auto"     && onNavigate) onNavigate("manual");  // auto card cũng vào manual để toggle
    if (id === "connect"  && onNavigate) onNavigate("connect");
    if (id === "camera"   && onNavigate) onNavigate("manual");
    if (id === "map"      && onNavigate) onNavigate("map");
    if (id === "events"   && onNavigate) onNavigate("events");
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

            <div className="user-menu" tabIndex={0}>
              <button type="button" className="user-menu-trigger">
                <span className="user-avatar">{String(displayName).charAt(0).toUpperCase()}</span>
                <span className="user-meta">
                  <span className="user-welcome">Welcome</span>
                  <span className="user-name">{displayName}</span>
                </span>
                <span className="user-menu-caret">▾</span>
              </button>

              <div className="user-menu-dropdown">
                {canEditProfile ? (
                  <button type="button" className="user-menu-item" onClick={() => onNavigate && onNavigate("profile")}>Edit Personal Info</button>
                ) : null}
                {canManageUsers ? (
                  <button type="button" className="user-menu-item" onClick={() => onNavigate && onNavigate("users")}>User Management</button>
                ) : null}
                <button type="button" className="user-menu-item user-menu-item--danger" onClick={onLogout}>Log out</button>
              </div>
            </div>
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
            {visibleMenuItems.map((item) => (
              <div key={item.id} className={`card ${item.cls}`} onClick={() => handleCardClick(item.id)}>
                <div className="icon-badge">{item.icon}</div>
                <span className="card-label">{item.label}</span>
                <span className="card-desc">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <Toast
        type={toast.type}
        message={toast.message}
        duration={alertToastDurationMs}
        onClose={() => setToast({ type: "info", message: "" })}
      />
    </div>
  );
}

export default Dashboard;