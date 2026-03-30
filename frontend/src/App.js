// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;

// import React, { useState } from "react";
// import SplashScreen from "./components/SplashScreen";
// import Dashboard from "./components/Dashboard";

// function App() {
//   const [showSplash, setShowSplash] = useState(true);

//   return (
//     <>
//       {showSplash && (
//         <SplashScreen onFinish={() => setShowSplash(false)} />
//       )}
//       {/* Dashboard renders underneath; becomes visible when splash fades */}
//       <Dashboard />
//     </>
//   );
// }

// export default App;

import React, { useState, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import SplashScreen from "./components/SplashScreen";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import ManualControl from "./components/ManualControl";
import CameraView from "./components/CameraView";
import Connect from "./components/Connect";
import MapTracking from "./components/MapTracking";
import AuthPage from "./components/AuthPage";
import { useRobotApi } from "./hooks/useRobotApi";
import {
  PAGE_TO_PATH,
  canAccessPath,
  getAllowedDashboardMenuIds,
  getDefaultPathForRole,
  normalizeRole,
} from "./constants/rolePermissions";

function resolveRedirectPath(path, role) {
  const fallbackPath = getDefaultPathForRole(role);

  if (typeof path !== "string" || !path.startsWith("/")) {
    return fallbackPath;
  }

  if (!canAccessPath(role, path)) {
    return fallbackPath;
  }

  return path;
}

function ProtectedRoute({ authUser, routePath, children }) {
  const location = useLocation();

  if (!authUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  const role = normalizeRole(authUser?.role);
  if (!canAccessPath(role, routePath)) {
    return (
      <Navigate
        to={getDefaultPathForRole(role)}
        replace
        state={{ accessDenied: "You do not have permission to access this page." }}
      />
    );
  }

  return children;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { register, login, getMe } = useRobotApi();
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem("auth_user"));
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [accessNotice, setAccessNotice] = useState("");
  const [authUser, setAuthUser] = useState(() => {
    const raw = localStorage.getItem("auth_user");
    return raw ? JSON.parse(raw) : null;
  });
  const currentRole = normalizeRole(authUser?.role);

  // Read saved theme from localStorage, default to dark if not set
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("kalivega-theme");
    if (saved === null) return true;       // first visit → dark
    return saved === "dark";
  });

  // Save to localStorage whenever theme changes
  useEffect(() => {
    localStorage.setItem("kalivega-theme", darkMode ? "dark" : "light");
    document.body.classList.toggle("theme-dark",  darkMode);
    document.body.classList.toggle("theme-light", !darkMode);
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      return;
    }

    getMe().then((res) => {
      if (!res?.success) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        setAuthUser(null);
        return;
      }

      localStorage.setItem("auth_user", JSON.stringify(res.data));
      setAuthUser(res.data);
      setShowSplash(false);

      const currentPath = window.location.pathname;
      if (currentPath === "/" || currentPath === "/login" || currentPath === "/register") {
        navigate(resolveRedirectPath(location.state?.from, normalizeRole(res.data?.role)), { replace: true });
      }
    });
  }, [getMe, location.state, navigate]);

  useEffect(() => {
    const deniedMessage = location.state?.accessDenied;
    if (!deniedMessage) {
      return;
    }

    setAccessNotice(String(deniedMessage));
    const timeoutId = setTimeout(() => setAccessNotice(""), 3000);
    return () => clearTimeout(timeoutId);
  }, [location.state]);

  const requestedPathAfterLogin = typeof location.state?.from === "string"
    ? location.state.from
    : undefined;
  const redirectAfterLogin = resolveRedirectPath(requestedPathAfterLogin, currentRole);

  const handleLoginOrRegister = async (payload, authMode, requestedPath) => {
    setAuthLoading(true);
    setAuthError("");

    let res;
    if (authMode === "register") {
      res = await register({
        username: payload.username,
        email: payload.email,
        password: payload.password,
      });

      if (res?.success) {
        navigate("/login", { replace: true, state: { from: requestedPath } });
      }
    } else {
      res = await login({
        identifier: payload.email,
        password: payload.password,
      });

      if (res?.success) {
        localStorage.setItem("auth_token", res.data.token);
        localStorage.setItem("auth_user", JSON.stringify(res.data.user));
        setAuthUser(res.data.user);
        setShowSplash(false);
        navigate(resolveRedirectPath(requestedPath, normalizeRole(res.data.user?.role)), { replace: true });
      }
    }

    if (!res?.success) {
      setAuthError(res?.error || "Có lỗi xảy ra, vui lòng thử lại.");
    }

    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setAuthUser(null);
    setAccessNotice("");
    navigate("/login", { replace: true });
  };

  const handleNavigate = (page) => {
    const targetPath = PAGE_TO_PATH[page] || getDefaultPathForRole(currentRole);
    if (!canAccessPath(currentRole, targetPath)) {
      setAccessNotice("Ban khong co quyen truy cap trang nay.");
      navigate(getDefaultPathForRole(currentRole), { replace: true });
      return;
    }

    navigate(targetPath);
  };

  const loginElement = (
    <AuthPage
      darkMode={darkMode}
      mode="login"
      onModeChange={(mode) => {
        navigate(mode === "register" ? "/register" : "/login", { state: { from: requestedPathAfterLogin } });
        setAuthError("");
      }}
      onSubmit={(payload) => handleLoginOrRegister(payload, "login", requestedPathAfterLogin)}
      loading={authLoading}
      error={authError}
    />
  );

  const registerElement = (
    <AuthPage
      darkMode={darkMode}
      mode="register"
      onModeChange={(mode) => {
        navigate(mode === "register" ? "/register" : "/login", { state: { from: requestedPathAfterLogin } });
        setAuthError("");
      }}
      onSubmit={(payload) => handleLoginOrRegister(payload, "register", requestedPathAfterLogin)}
      loading={authLoading}
      error={authError}
    />
  );

  return (
    <>
      {showSplash && (
        <SplashScreen darkMode={darkMode} onFinish={() => setShowSplash(false)} />
      )}

      {!showSplash && (
        <>
          {accessNotice && (
            <div style={{
              position: "fixed",
              top: 14,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              background: "rgba(239, 68, 68, 0.95)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 10,
              fontWeight: 600,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}>
              {accessNotice}
            </div>
          )}

          <Routes>
            <Route path="/" element={<Navigate to={authUser ? getDefaultPathForRole(currentRole) : "/login"} replace />} />
            <Route
              path="/login"
              element={authUser ? <Navigate to={redirectAfterLogin} replace /> : loginElement}
            />
            <Route
              path="/register"
              element={authUser ? <Navigate to={redirectAfterLogin} replace /> : registerElement}
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute authUser={authUser} routePath="/dashboard">
                  <Dashboard
                    darkMode={darkMode}
                    onNavigate={handleNavigate}
                    onLogout={handleLogout}
                    allowedMenuIds={getAllowedDashboardMenuIds(currentRole)}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute authUser={authUser} routePath="/settings">
                  <Settings
                    darkMode={darkMode}
                    onDarkModeChange={setDarkMode}
                    onBack={() => navigate(getDefaultPathForRole(currentRole))}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manual"
              element={
                <ProtectedRoute authUser={authUser} routePath="/manual">
                  <ManualControl darkMode={darkMode} onBack={() => navigate(getDefaultPathForRole(currentRole))} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/camera"
              element={
                <ProtectedRoute authUser={authUser} routePath="/camera">
                  <ManualControl darkMode={darkMode} onBack={() => navigate(getDefaultPathForRole(currentRole))} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/camera-view"
              element={
                <ProtectedRoute authUser={authUser} routePath="/camera-view">
                  <CameraView darkMode={darkMode} onBack={() => navigate(getDefaultPathForRole(currentRole))} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/connect"
              element={
                <ProtectedRoute authUser={authUser} routePath="/connect">
                  <Connect darkMode={darkMode} onBack={() => navigate(getDefaultPathForRole(currentRole))} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/map"
              element={
                <ProtectedRoute authUser={authUser} routePath="/map">
                  <MapTracking darkMode={darkMode} onBack={() => navigate(getDefaultPathForRole(currentRole))} />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={<Navigate to={authUser ? getDefaultPathForRole(currentRole) : "/login"} replace />}
            />
          </Routes>
        </>
      )}
    </>
  );
}

export default App;
