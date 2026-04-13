import React, { useEffect, useMemo, useState } from "react";
import { useRobotApi } from "../hooks/useRobotApi";
import Toast from "./common/Toast";
import "./styles/AdminPages.css";
import "./styles/UserProfile.css";

function formatTime(value) {
  if (!value) return "--";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString();
}

export default function UserProfile({ onBack, darkMode = true }) {
  const { getMe, updateMe, changePassword } = useRobotApi();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  const [activeTab, setActiveTab] = useState("profile");
  const [editing, setEditing] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [toast, setToast] = useState({ type: "info", message: "" });

  const pageTitle = useMemo(() => (activeTab === "profile" ? "Personal Information" : "Change Password"), [activeTab]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      setError("");
      const res = await getMe();
      if (!mounted) return;

      if (!res?.success) {
        setError(res?.error || "Cannot load profile.");
        setLoading(false);
        return;
      }

      setUser(res.data || null);
      setEmailDraft(res?.data?.email || "");
      setLoading(false);
    };

    init();
    return () => {
      mounted = false;
    };
  }, [getMe]);

  const handleSaveProfile = async () => {
    if (!emailDraft.trim()) {
      setToast({ type: "error", message: "Email is required." });
      return;
    }

    setLoading(true);
    const res = await updateMe({ email: emailDraft.trim().toLowerCase() });
    if (!res?.success) {
      setToast({ type: "error", message: res?.error || "Profile update failed." });
      setLoading(false);
      return;
    }

    setUser(res.data);
    localStorage.setItem("auth_user", JSON.stringify(res.data));
    setEditing(false);
    setToast({ type: "success", message: "Profile updated." });
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setToast({ type: "error", message: "New password must be at least 6 characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setToast({ type: "error", message: "Confirm password does not match." });
      return;
    }

    setPasswordSaving(true);
    const res = await changePassword({ oldPassword, newPassword, confirmPassword });

    if (!res?.success) {
      setToast({ type: "error", message: res?.error || "Password change failed." });
      setPasswordSaving(false);
      return;
    }

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setToast({ type: "success", message: "Password changed successfully." });
    setPasswordSaving(false);
  };

  return (
    <div className={`admin-page ${darkMode ? "admin-page--dark" : "admin-page--light"}`}>
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <h1 className="admin-title">My Profile</h1>
            <p className="admin-subtitle">{pageTitle}</p>
          </div>
          <div className="admin-actions">
            <button className="admin-btn admin-btn--muted" onClick={onBack}>Back</button>
          </div>
        </header>

        <div className="profile-tabs">
          <button className={`profile-tab ${activeTab === "profile" ? "is-active" : ""}`} onClick={() => setActiveTab("profile")}>Profile</button>
          <button className={`profile-tab ${activeTab === "password" ? "is-active" : ""}`} onClick={() => setActiveTab("password")}>Password</button>
        </div>

        {error ? <div className="admin-msg admin-msg--error">{error}</div> : null}

        {activeTab === "profile" ? (
          <section className="admin-card">
            <div className="admin-kv">
              <div><span>Username</span><span>{user?.username || "--"}</span></div>
              <div><span>Role</span><span>{user?.role || "--"}</span></div>
              <div><span>Created</span><span>{formatTime(user?.created_at)}</span></div>
            </div>

            <div className="admin-field">
              <label>Email</label>
              <input
                className="admin-input"
                value={emailDraft}
                disabled={!editing || loading}
                onChange={(e) => setEmailDraft(e.target.value)}
              />
            </div>

            <div className="admin-actions">
              {!editing ? (
                <button className="admin-btn" onClick={() => setEditing(true)} disabled={loading}>Edit Profile</button>
              ) : (
                <>
                  <button className="admin-btn admin-btn--muted" onClick={() => { setEditing(false); setEmailDraft(user?.email || ""); }} disabled={loading}>Cancel</button>
                  <button className="admin-btn" onClick={handleSaveProfile} disabled={loading}>Save</button>
                </>
              )}
            </div>
          </section>
        ) : (
          <section className="admin-card profile-password">
            <div className="admin-field">
              <label>Old Password</label>
              <input type="password" className="admin-input" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} disabled={passwordSaving} />
            </div>

            <div className="admin-field">
              <label>New Password</label>
              <input type="password" className="admin-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={passwordSaving} />
            </div>

            <div className="admin-field">
              <label>Confirm Password</label>
              <input type="password" className="admin-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={passwordSaving} />
            </div>

            <div className="admin-actions">
              <button className="admin-btn" onClick={handleChangePassword} disabled={passwordSaving}>Change Password</button>
            </div>
          </section>
        )}

        <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: "info", message: "" })} />
      </div>
    </div>
  );
}
