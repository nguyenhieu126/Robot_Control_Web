import React from 'react';
import './AdminPanel.css';

function AdminPanel({ user, onLogout, onNavigateDashboard }) {
  return (
    <div className="admin-wrap">
      <section className="admin-card">
        <h2>Admin Console</h2>
        <p>Xin chào {user?.username || 'admin'}, bạn đang ở khu vực quản trị.</p>

        <ul>
          <li>Email: {user?.email}</li>
          <li>Role: {user?.role}</li>
        </ul>

        <div className="admin-actions">
          <button onClick={onNavigateDashboard}>Đi tới Dashboard</button>
          <button className="danger" onClick={onLogout}>Đăng xuất</button>
        </div>
      </section>
    </div>
  );
}

export default AdminPanel;
