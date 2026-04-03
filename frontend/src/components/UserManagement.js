import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRobotApi } from "../hooks/useRobotApi";
import Table from "./common/Table";
import Modal from "./common/Modal";
import Toast from "./common/Toast";
import UserForm from "./UserForm";
import "./styles/AdminPages.css";

const PAGE_SIZE = 10;

function formatTime(value) {
  if (!value) return "--";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString();
}

export default function UserManagement({ onBack, darkMode = true }) {
  const { getAllUsers, createUser, updateUser, deleteUser, resetUserPassword } = useRobotApi();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedUser, setSelectedUser] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ type: "info", message: "" });

  const currentRole = useMemo(() => {
    const raw = localStorage.getItem("auth_user");
    try {
      return raw ? JSON.parse(raw)?.role : "user";
    } catch {
      return "user";
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getAllUsers({ role: roleFilter === "all" ? null : roleFilter });
    if (res?.success) {
      setUsers(Array.isArray(res.data) ? res.data : []);
    } else {
      setError(res?.error || "Failed to load users.");
    }
    setLoading(false);
  }, [getAllUsers, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setPage(0);
  }, [search, roleFilter]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((item) => {
      return String(item.username || "").toLowerCase().includes(query)
        || String(item.email || "").toLowerCase().includes(query);
    });
  }, [users, search]);

  const offset = page * PAGE_SIZE;
  const pagedUsers = useMemo(() => filteredUsers.slice(offset, offset + PAGE_SIZE), [filteredUsers, offset]);
  const hasNext = offset + PAGE_SIZE < filteredUsers.length;

  const openCreate = () => {
    setModalMode("create");
    setSelectedUser(null);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setModalMode("edit");
    setSelectedUser(user);
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    setFormError("");

    let res;
    if (modalMode === "create") {
      res = await createUser(payload);
    } else {
      res = await updateUser(selectedUser.id, {
        username: payload.username,
        email: payload.email,
        role: payload.role,
      });
    }

    if (!res?.success) {
      setFormError(res?.error || "Request failed.");
      setSaving(false);
      return;
    }

    setToast({
      type: "success",
      message: modalMode === "create" ? "User created." : "User updated.",
    });
    setModalOpen(false);
    await loadUsers();
    setSaving(false);
  };

  const handleDelete = async (user) => {
    const yes = window.confirm(`Delete user ${user.username}?`);
    if (!yes) return;

    const res = await deleteUser(user.id);
    if (!res?.success) {
      setToast({ type: "error", message: res?.error || "Delete failed." });
      return;
    }

    setToast({ type: "success", message: "User deleted." });
    await loadUsers();
  };

  const handleResetPassword = async (user) => {
    const yes = window.confirm(`Reset password for ${user.username}?`);
    if (!yes) return;

    const res = await resetUserPassword(user.id);
    if (!res?.success) {
      setToast({ type: "error", message: res?.error || "Reset failed." });
      return;
    }

    const temp = res?.data?.tempPassword ? ` Temporary password: ${res.data.tempPassword}` : "";
    setToast({ type: "warning", message: `Password reset successful.${temp}` });
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "created_at", label: "Created", render: (row) => formatTime(row.created_at) },
    { key: "updated_at", label: "Updated", render: (row) => formatTime(row.updated_at) },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="admin-inline-actions">
          <button type="button" className="admin-btn admin-btn--muted" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
            Edit
          </button>
          <button type="button" className="admin-btn" onClick={(e) => { e.stopPropagation(); handleResetPassword(row); }}>
            Reset
          </button>
          <button type="button" className="admin-btn admin-btn--danger" onClick={(e) => { e.stopPropagation(); handleDelete(row); }}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (currentRole !== "admin") {
    return (
      <div className={`admin-page ${darkMode ? "admin-page--dark" : "admin-page--light"}`}>
        <div className="admin-shell">
          <div className="admin-msg admin-msg--error">You do not have permission to access User Management.</div>
          <div><button className="admin-btn" onClick={onBack}>Back</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-page ${darkMode ? "admin-page--dark" : "admin-page--light"}`}>
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <h1 className="admin-title">User Management</h1>
            <p className="admin-subtitle">CRUD users, filter roles, reset passwords</p>
          </div>
          <div className="admin-actions">
            <button className="admin-btn admin-btn--muted" onClick={onBack}>Back</button>
            <button className="admin-btn" onClick={openCreate}>Add User</button>
          </div>
        </header>

        <section className="admin-toolbar">
          <div className="admin-field">
            <label>Search</label>
            <input className="admin-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="username or email" />
          </div>
          <div className="admin-field">
            <label>Role filter</label>
            <select className="admin-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">all</option>
              <option value="admin">admin</option>
              <option value="security">security</option>
              <option value="user">user</option>
            </select>
          </div>
          <div className="admin-field">
            <label>Total after search</label>
            <input className="admin-input" value={String(filteredUsers.length)} disabled />
          </div>
        </section>

        {error ? <div className="admin-msg admin-msg--error">{error}</div> : null}

        <Table
          columns={columns}
          data={pagedUsers}
          loading={loading}
          error={error}
          pagination={{
            offset,
            limit: PAGE_SIZE,
            hasNext,
            onPageChange: (nextOffset) => setPage(Math.floor(nextOffset / PAGE_SIZE)),
          }}
        />

        <Modal
          isOpen={modalOpen}
          title={modalMode === "create" ? "Create User" : `Edit User #${selectedUser?.id ?? ""}`}
          onClose={closeModal}
          size="medium"
        >
          <UserForm
            mode={modalMode}
            initialData={selectedUser}
            onSubmit={handleSave}
            onCancel={closeModal}
            loading={saving}
            error={formError}
          />
        </Modal>

        <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: "info", message: "" })} />
      </div>
    </div>
  );
}
