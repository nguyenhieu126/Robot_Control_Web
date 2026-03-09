import React, { useState } from "react";
import "./Settings.css";

const INITIAL_PROFILES = [
  { id: 1, name: "RoboArm-X1",   type: "Industrial",  time: "2 hours ago", active: true  },
  { id: 2, name: "Workshop Arm", type: "Educational", time: "Yesterday",   active: false },
];

/* ── Toggle: uses onToggle prop (never onChange) ── */
function Toggle({ on, onToggle }) {
  const handleClick = () => {
    if (typeof onToggle === "function") onToggle(!on);
  };
  return (
    <div className={`toggle ${on ? "toggle--on" : ""}`} onClick={handleClick}>
      <div className="toggle-thumb" />
    </div>
  );
}

function Settings({ onBack, darkMode, onDarkModeChange }) {
  const [notifications, setNotifications] = useState(true);
  const [profiles, setProfiles]           = useState(INITIAL_PROFILES);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const theme = darkMode ? "dark" : "light";

  const deleteProfile = (id, e) => {
    e.stopPropagation();
    setProfiles(p => p.filter(pr => pr.id !== id));
    if (selectedProfile === id) setSelectedProfile(null);
  };

  const addProfile = () => {
    const name = prompt("Enter profile name:");
    if (!name) return;
    const type = prompt("Enter type (e.g. Industrial):") || "Custom";
    setProfiles(p => [...p, { id: Date.now(), name, type, time: "Just now", active: false }]);
  };

  const switchProfile = (id) => {
    setProfiles(p => p.map(pr => ({ ...pr, active: pr.id === id })));
    setSelectedProfile(null);
  };

  return (
    <div className={`settings-page settings-page--${theme}`}>
      <div className="settings-grid" />
      <div className="settings-glow settings-glow--tl" />
      <div className="settings-glow settings-glow--br" />

      <div className="settings-inner">

        {/* ── HEADER ── */}
        <div className="settings-header">
          <button className="back-btn" onClick={onBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div>
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">App preferences</p>
          </div>
        </div>

        {/* ── TWO COLUMNS ── */}
        <div className="settings-columns">

          {/* ── LEFT ── */}
          <div className="settings-left">

            {/* APPEARANCE */}
            <div className="settings-section-label">APPEARANCE</div>
            <div className="settings-group">
              <div className="settings-row">
                <div className="settings-row-icon"
                  style={{ background: darkMode
                    ? "linear-gradient(135deg,#1a2a4a,#1a6bff)"
                    : "linear-gradient(135deg,#f59e0b,#fbbf24)" }}>
                  {darkMode ? "🌙" : "☀️"}
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

            {/* NOTIFICATIONS */}
            <div className="settings-section-label">NOTIFICATIONS</div>
            <div className="settings-group">
              <div className="settings-row">
                <div className="settings-row-icon"
                  style={{ background: "linear-gradient(135deg,#00c9a7,#00e5c3)" }}>
                  🔔
                </div>
                <div className="settings-row-text">
                  <span className="settings-row-title">Push Notifications</span>
                  <span className="settings-row-sub">Alerts and updates</span>
                </div>
                <Toggle on={notifications} onToggle={setNotifications} />
              </div>
            </div>

            {/* GENERAL */}
            <div className="settings-section-label">GENERAL</div>
            <div className="settings-group">
              {[
                { icon: "📶", color: "linear-gradient(135deg,#1a6bff,#00c6ff)", label: "Network Settings",   sub: "Wi-Fi & BLE config"  },
                { icon: "🛡",  color: "linear-gradient(135deg,#059669,#00e5c3)", label: "Privacy & Security", sub: "Permissions & data"  },
                { icon: "ℹ",  color: "linear-gradient(135deg,#0ea5e9,#38bdf8)", label: "About",              sub: "Version info"        },
              ].map((item, i, arr) => (
                <div key={item.label}
                  className={`settings-row settings-row--nav${i < arr.length - 1 ? " settings-row--bordered" : ""}`}>
                  <div className="settings-row-icon" style={{ background: item.color }}>{item.icon}</div>
                  <div className="settings-row-text">
                    <span className="settings-row-title">{item.label}</span>
                    <span className="settings-row-sub">{item.sub}</span>
                  </div>
                  <svg className="chevron" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              ))}
            </div>

          </div>

          {/* ── RIGHT ── */}
          <div className="settings-right">

            <div className="settings-profiles-header">
              <span className="settings-section-label" style={{ margin: 0 }}>DEVICE PROFILES</span>
              <button className="add-btn" onClick={addProfile}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            <div className="settings-group">
              {profiles.length === 0 && (
                <p className="empty-msg">No profiles. Click + to add one.</p>
              )}
              {profiles.map((profile, i) => (
                <div key={profile.id}>
                  <div
                    className={`profile-row${selectedProfile === profile.id ? " profile-row--expanded" : ""}`}
                    onClick={() => setSelectedProfile(selectedProfile === profile.id ? null : profile.id)}
                  >
                    <div className={`profile-avatar${profile.active ? " profile-avatar--active" : ""}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                      </svg>
                    </div>
                    <div className="profile-text">
                      <div className="profile-name-row">
                        <span className="profile-name">{profile.name}</span>
                        {profile.active && <span className="profile-active-badge">Active</span>}
                      </div>
                      <span className="profile-meta">{profile.type} · {profile.time}</span>
                    </div>
                    <button className="delete-btn" onClick={(e) => deleteProfile(profile.id, e)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>

                  {selectedProfile === profile.id && !profile.active && (
                    <div className="profile-switch-wrap">
                      <button className="profile-switch-btn" onClick={() => switchProfile(profile.id)}>
                        Switch to this profile
                      </button>
                    </div>
                  )}

                  {i < profiles.length - 1 && <div className="profile-divider" />}
                </div>
              ))}
            </div>

            <div className="version-card">
              <span className="version-title">KaliVega Controller</span>
              <span className="version-num">Version 1.0.0</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;