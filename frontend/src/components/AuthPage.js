import React, { useState } from 'react';
import './AuthPage.css';

function AuthPage({ darkMode = true, mode = 'login', onModeChange, onSubmit, loading = false, error = '' }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  const isLogin = mode === 'login';

  const handleChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <div className={`auth-page auth-page--${darkMode ? 'dark' : 'light'}`}>
      <div className="auth-card">
        <h1>{isLogin ? 'Đăng Nhập' : 'Đăng Ký'}</h1>
        <p className="auth-subtitle">
          {isLogin ? 'Đăng nhập để điều khiển robot.' : 'Tạo tài khoản mới để bắt đầu.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <label>
              Username
              <input
                type="text"
                value={form.username}
                onChange={handleChange('username')}
                required
                minLength={3}
                placeholder="Nhập username"
              />
            </label>
          )}

          <label>
            {isLogin ? 'Email hoặc Username' : 'Email'}
            <input
              type="text"
              value={isLogin ? (form.email || '') : form.email}
              onChange={handleChange('email')}
              required
              placeholder={isLogin ? 'admin@robot.local hoặc admin' : 'you@example.com'}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              required
              minLength={6}
              placeholder="Nhập mật khẩu"
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => onModeChange(isLogin ? 'register' : 'login')}
          >
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
