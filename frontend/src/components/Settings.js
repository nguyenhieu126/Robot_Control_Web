import React, { useEffect, useState } from "react";
import {
  FaBell,
  FaClock,
  FaCompass,
  FaEye,
  FaFlask,
  FaInfoCircle,
  FaLock,
  FaMoon,
  FaRecycle,
  FaSun,
  FaThLarge,
} from "react-icons/fa";
import "./styles/Settings.css";
import {
  getBrowserNotificationPermission,
  getNotificationSettings,
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
  setNotificationEnabled,
  setNotifyWhenFocused,
} from "../utils/browserNotifications";
import {
  getAlertToastDurationMsPreference,
  getDashboardSizePreference,
  getNotificationClickOpensEventsPreference,
  resetAppPreferences,
  setAlertToastDurationMsPreference,
  setDashboardSizePreference,
  setNotificationClickOpensEventsPreference,
} from "../utils/appPreferences";
import RobotConfigPanel from "./RobotConfigPanel";

const DASHBOARD_SIZE_OPTIONS = ["SM", "MD", "LG", "XL"];

function Toggle({ on, onToggle, disabled = false }) {
  const handleClick = () => {
    if (!disabled) onToggle(!on);
  };

  return (
    <div
      className={`toggle ${on ? "toggle--on" : ""}`}
      onClick={handleClick}
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      <div className="toggle-thumb" />
    </div>
  );
}

function Settings({ onBack, darkMode, onDarkModeChange, authUser }) {
  const initialNotificationSettings = getNotificationSettings();
  const notificationApiSupported = isBrowserNotificationSupported();

  const [notificationsEnabled, setNotificationsEnabled] = useState(initialNotificationSettings.enabled);
  const [notifyWhenFocused, setNotifyWhenFocusedState] = useState(initialNotificationSettings.notifyWhenFocused);
  const [notificationPermission, setNotificationPermission] = useState(getBrowserNotificationPermission());
  const [notificationHint, setNotificationHint] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);

  const [notificationClickOpensEvents, setNotificationClickOpensEvents] = useState(
    getNotificationClickOpensEventsPreference()
  );
  const [dashboardSize, setDashboardSize] = useState(getDashboardSizePreference());
  const [toastDurationSec, setToastDurationSec] = useState(
    Math.round(getAlertToastDurationMsPreference() / 1000)
  );

  const theme = darkMode ? "dark" : "light";
  const isAdmin = authUser?.role === "admin";

  useEffect(() => {
    setNotificationEnabled(notificationsEnabled);
  }, [notificationsEnabled]);

  useEffect(() => {
    setNotifyWhenFocused(notifyWhenFocused);
  }, [notifyWhenFocused]);

  useEffect(() => {
    setNotificationClickOpensEventsPreference(notificationClickOpensEvents);
  }, [notificationClickOpensEvents]);

  useEffect(() => {
    setDashboardSizePreference(dashboardSize);
  }, [dashboardSize]);

  useEffect(() => {
    setAlertToastDurationMsPreference(toastDurationSec * 1000);
  }, [toastDurationSec]);

  useEffect(() => {
    const syncPermission = () => setNotificationPermission(getBrowserNotificationPermission());
    syncPermission();

    window.addEventListener("focus", syncPermission);
    document.addEventListener("visibilitychange", syncPermission);

    return () => {
      window.removeEventListener("focus", syncPermission);
      document.removeEventListener("visibilitychange", syncPermission);
    };
  }, []);

  const permissionLabel = notificationPermission === "granted"
    ? "Granted"
    : notificationPermission === "denied"
      ? "Blocked"
      : notificationPermission === "default"
        ? "Not requested"
        : "Not supported";

  const handleNotificationToggle = (nextValue) => {
    setNotificationsEnabled(nextValue);

    if (nextValue && notificationApiSupported && notificationPermission === "default") {
      setNotificationHint("Notification enabled. Click Grant Permission to allow browser push alerts.");
      return;
    }

    if (nextValue && !notificationApiSupported) {
      setNotificationHint("This browser does not support Notification API. In-app toast fallback will be used.");
      return;
    }

    setNotificationHint("");
  };

  const handleRequestPermission = async () => {
    const permission = await requestBrowserNotificationPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      setNotificationHint("Browser push notifications are enabled.");
    } else if (permission === "denied") {
      setNotificationHint("Permission denied. Update browser site settings if you want push notifications.");
    } else if (permission === "unsupported") {
      setNotificationHint("This browser does not support Notification API.");
    }
  };

  const handleTestNotification = () => {
    if (!notificationApiSupported) {
      setNotificationHint("Notification API is not supported in this browser. Toast fallback is active.");
      return;
    }

    if (notificationPermission !== "granted") {
      setNotificationHint("Browser permission is not granted yet. Click Grant first.");
      return;
    }

    const notification = new Notification("KaliVega Test Notification", {
      body: "Browser push is configured successfully.",
      tag: "kalivega-notification-test",
      renotify: true,
    });

    notification.onclick = () => {
      notification.close();
      window.focus();
    };

    setNotificationHint("Test notification sent.");
  };

  const handleResetSettings = () => {
    resetAppPreferences();
    setNotificationsEnabled(true);
    setNotifyWhenFocusedState(false);
    setNotificationClickOpensEvents(true);
    setDashboardSize("XL");
    setToastDurationSec(5);
    setNotificationHint("Settings reset to defaults.");
  };

  return (
    <div className={`settings-page settings-page--${theme}`}>
      <div className="settings-grid" />
      <div className="settings-glow settings-glow--tl" />
      <div className="settings-glow settings-glow--br" />

      <div className="settings-inner">
        <div className="settings-header">
          <button className="back-btn" onClick={onBack}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div>
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">App preferences</p>
          </div>
        </div>

        <div className="settings-columns">
          <div className="settings-left">
            <div className="settings-section-label">APPEARANCE</div>
            <div className="settings-group">
              <div className="settings-row">
                <div
                  className="settings-row-icon"
                  style={{
                    background: darkMode
                      ? "linear-gradient(135deg,#1a2a4a,#1a6bff)"
                      : "linear-gradient(135deg,#f59e0b,#fbbf24)",
                  }}
                >
                  {darkMode ? <FaMoon aria-hidden="true" /> : <FaSun aria-hidden="true" />}
                </div>
                <div className="settings-row-text">
                  <span className="settings-row-title">{darkMode ? "Dark Mode" : "Light Mode"}</span>
                  <span className="settings-row-sub">
                    {darkMode ? "Dark theme enabled" : "Light theme enabled"}
                  </span>
                </div>
                <Toggle on={darkMode} onToggle={onDarkModeChange} />
              </div>
            </div>

            <div className="settings-section-label">NOTIFICATIONS</div>
            <div className="settings-group">
              <div className="settings-row">
                <div className="settings-row-icon" style={{ background: "linear-gradient(135deg,#00c9a7,#00e5c3)" }}>
                  <FaBell aria-hidden="true" />
                </div>
                <div className="settings-row-text">
                  <span className="settings-row-title">Push Notifications</span>
                  <span className="settings-row-sub">Alerts and updates</span>
                </div>
                <Toggle on={notificationsEnabled} onToggle={handleNotificationToggle} />
              </div>

              <div className="settings-row settings-row--bordered">
                <div className="settings-row-icon" style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)" }}>
                  <FaEye aria-hidden="true" />
                </div>
                <div className="settings-row-text">
                  <span className="settings-row-title">Notify when tab is focused</span>
                  <span className="settings-row-sub">Send browser push even when app tab is active</span>
                </div>
                <Toggle
                  on={notifyWhenFocused}
                  onToggle={setNotifyWhenFocusedState}
                  disabled={!notificationsEnabled}
                />
              </div>

              <div className="settings-row settings-row--bordered">
                <div className="settings-row-icon" style={{ background: "linear-gradient(135deg,#f97316,#fb923c)" }}>
                  <FaCompass aria-hidden="true" />
                </div>
                <div className="settings-row-text">
                  <span className="settings-row-title">Notification click opens Events page</span>
                  <span className="settings-row-sub">When clicking browser notification, jump to Events</span>
                </div>
                <Toggle
                  on={notificationClickOpensEvents}
                  onToggle={setNotificationClickOpensEvents}
                  disabled={!notificationsEnabled}
                />
              </div>

              <div className="settings-row settings-row--bordered">
                <div className="settings-row-icon" style={{ background: "linear-gradient(135deg,#0ea5e9,#22d3ee)" }}>
                  <FaLock aria-hidden="true" />
                </div>
                <div className="settings-row-text">
                  <span className="settings-row-title">Browser Permission</span>
                  <span className="settings-row-sub">Current status: {permissionLabel}</span>
                </div>
                <button
                  type="button"
                  className="add-btn"
                  onClick={handleRequestPermission}
                  disabled={!notificationApiSupported || !notificationsEnabled || notificationPermission === "granted"}
                  title="Grant browser notification permission"
                  style={{ minWidth: 128 }}
                >
                  {notificationPermission === "granted" ? "Granted" : "Grant"}
                </button>
              </div>

              <div className="settings-row">
                <div className="settings-row-icon" style={{ background: "linear-gradient(135deg,#22c55e,#4ade80)" }}>
                  <FaFlask aria-hidden="true" />
                </div>
                <div className="settings-row-text">
                  <span className="settings-row-title">Send test browser notification</span>
                  <span className="settings-row-sub">Verify push workflow without waiting for alert event</span>
                </div>
                <button
                  type="button"
                  className="add-btn"
                  onClick={handleTestNotification}
                  disabled={!notificationsEnabled}
                  style={{ minWidth: 128 }}
                >
                  Test
                </button>
              </div>

              {notificationHint ? (
                <p style={{ margin: "8px 14px 0", fontSize: "12px", opacity: 0.8 }}>{notificationHint}</p>
              ) : null}
            </div>
          </div>

          <div className="settings-right">
            <div className="settings-section-label">DASHBOARD</div>
            <div className="settings-group">
              <div className="settings-row settings-row--bordered">
                <div className="settings-row-icon" style={{ background: "linear-gradient(135deg,#06b6d4,#22d3ee)" }}>
                  <FaThLarge aria-hidden="true" />
                </div>
                <div className="settings-row-text">
                  <span className="settings-row-title">Default dashboard card size</span>
                  <span className="settings-row-sub">Applied when opening Dashboard</span>
                </div>
              </div>

              <div className="settings-choice-wrap">
                {DASHBOARD_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`settings-choice-btn ${dashboardSize === option ? "settings-choice-btn--active" : ""}`}
                    onClick={() => setDashboardSize(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="settings-row settings-row--bordered">
                <div className="settings-row-icon" style={{ background: "linear-gradient(135deg,#f59e0b,#fbbf24)" }}>
                  <FaClock aria-hidden="true" />
                </div>
                <div className="settings-row-text">
                  <span className="settings-row-title">Alert toast duration</span>
                  <span className="settings-row-sub">{toastDurationSec}s for in-app alert toast</span>
                </div>
              </div>

              <div className="settings-range-wrap">
                <input
                  type="range"
                  min={2}
                  max={15}
                  step={1}
                  value={toastDurationSec}
                  onChange={(event) => setToastDurationSec(Number(event.target.value))}
                />
                <span className="settings-range-val">{toastDurationSec}s</span>
              </div>

              <div className="settings-row">
                <div className="settings-row-icon" style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}>
                  <FaRecycle aria-hidden="true" />
                </div>
                <div className="settings-row-text">
                  <span className="settings-row-title">Reset interactive settings</span>
                  <span className="settings-row-sub">Restore defaults for dashboard and notification behavior</span>
                </div>
                <button type="button" className="settings-action-btn" onClick={handleResetSettings}>
                  Reset
                </button>
              </div>
            </div>

            <div className="settings-section-label">ROBOT CONFIGURATION</div>
            <RobotConfigPanel isAdmin={isAdmin} />

            <div className="settings-section-label">ABOUT</div>
            <div className="settings-group">
              <div className="settings-row settings-row--nav" onClick={() => setAboutOpen(true)}>
                <div className="settings-row-icon" style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)" }}>
                  <FaInfoCircle aria-hidden="true" />
                </div>
                <div className="settings-row-text">
                  <span className="settings-row-title">About & Credits</span>
                  <span className="settings-row-sub">Project info, contributors, and technology stack</span>
                </div>
                <svg
                  className="chevron"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </div>

            <div className="version-card">
              <span className="version-title">KaliVega Controller</span>
              <span className="version-num">Version 1.0.0</span>
            </div>
          </div>
        </div>
      </div>

      {aboutOpen ? (
        <div className="settings-modal-backdrop" onClick={() => setAboutOpen(false)}>
          <div className="settings-modal" onClick={(event) => event.stopPropagation()}>
            <h3>KaliVega Controller - Credits</h3>
            <p>Version 1.0.0</p>
            <ul>
              <li>Frontend: React + React Router</li>
              <li>Backend: Node.js + Express + WebSocket</li>
              <li>Database: PostgreSQL</li>
              <li>Realtime: ws dashboard + robot channels</li>
            </ul>
            <p>Team: KaliVega Development</p>
            <button type="button" className="settings-action-btn" onClick={() => setAboutOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Settings;
