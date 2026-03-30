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
        <h1>{isLogin ? 'Login' : 'Register'}</h1>
        <p className="auth-subtitle">
          {isLogin ? 'Login to control the robot.' : 'Create a new account to get started.'}
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
                placeholder="Enter username"
              />
            </label>
          )}

          <label>
            {isLogin ? 'Email or Username' : 'Email'}
            <input
              type="text"
              value={isLogin ? (form.email || '') : form.email}
              onChange={handleChange('email')}
              required
              placeholder={isLogin ? 'admin@robot.local or admin' : 'you@example.com'}
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
              placeholder="Enter password"
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? 'Don\'t have an account?' : 'Already have an account?'}{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => onModeChange(isLogin ? 'register' : 'login')}
          >
            {isLogin ? 'Register now' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
