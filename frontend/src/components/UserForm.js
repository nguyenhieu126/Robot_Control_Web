import React, { useEffect, useState } from "react";
import "./styles/UserForm.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;

export default function UserForm({ mode, initialData, onSubmit, onCancel, loading, error }) {
  const isCreate = mode === "create";
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setForm({
      username: initialData?.username || "",
      email: initialData?.email || "",
      password: "",
      role: initialData?.role || "user",
    });
    setLocalError("");
  }, [initialData]);

  const setValue = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setLocalError("");

    if (!USERNAME_REGEX.test(form.username)) {
      setLocalError("Username must be 3-20 chars and only contain letters, numbers, underscore.");
      return;
    }

    if (!EMAIL_REGEX.test(form.email)) {
      setLocalError("Invalid email format.");
      return;
    }

    if (isCreate && form.password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    onSubmit({
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      password: form.password,
    });
  };

  return (
    <form className="user-form" onSubmit={handleSubmit}>
      <div className="admin-field">
        <label>Username</label>
        <input className="admin-input" value={form.username} onChange={setValue("username")} disabled={loading} />
      </div>

      <div className="admin-field">
        <label>Email</label>
        <input className="admin-input" value={form.email} onChange={setValue("email")} disabled={loading} />
      </div>

      <div className="admin-field">
        <label>Role</label>
        <select className="admin-select" value={form.role} onChange={setValue("role")} disabled={loading}>
          <option value="user">user</option>
          <option value="security">security</option>
          <option value="admin">admin</option>
        </select>
      </div>

      {isCreate ? (
        <div className="admin-field">
          <label>Password</label>
          <input type="password" className="admin-input" value={form.password} onChange={setValue("password")} disabled={loading} />
        </div>
      ) : null}

      {localError || error ? <div className="user-form-error">{localError || error}</div> : null}

      <div className="user-form-actions">
        <button className="admin-btn admin-btn--muted" type="button" onClick={onCancel} disabled={loading}>Cancel</button>
        <button className="admin-btn" type="submit" disabled={loading}>{isCreate ? "Create User" : "Update User"}</button>
      </div>
    </form>
  );
}
