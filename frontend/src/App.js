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
import Connect from "./components/Connect";
import MapTracking from "./components/MapTracking";
import AuthPage from "./components/AuthPage";
import { useRobotApi } from "./hooks/useRobotApi";

const PAGE_TO_PATH = {
  dashboard: "/dashboard",
  settings: "/settings",
  manual: "/manual",
  camera: "/manual",
  connect: "/connect",
  map: "/map",
};

const ALLOWED_REDIRECT_PATHS = new Set([
  "/dashboard",
  "/settings",
  "/manual",
  "/camera",
  "/connect",
  "/map",
]);

function resolveRedirectPath(path) {
  if (typeof path !== "string") {
    return "/dashboard";
  }

  if (!path.startsWith("/")) {
    return "/dashboard";
  }

  const basePath = path.split("?")[0].split("#")[0];
  if (!ALLOWED_REDIRECT_PATHS.has(basePath)) {
    return "/dashboard";
  }

  return path;
}

function ProtectedRoute({ authUser, children }) {
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

  return children;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { register, login, getMe } = useRobotApi();
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem("auth_user"));
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authUser, setAuthUser] = useState(() => {
    const raw = localStorage.getItem("auth_user");
    return raw ? JSON.parse(raw) : null;
  });

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
        navigate(resolveRedirectPath(location.state?.from), { replace: true });
      }
    });
  }, [getMe, location.state, navigate]);

  const redirectAfterLogin = resolveRedirectPath(location.state?.from);

  const handleLoginOrRegister = async (payload, authMode, redirectPath) => {
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
        navigate("/login", { replace: true, state: { from: redirectPath } });
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
        navigate(redirectPath, { replace: true });
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
    navigate("/login", { replace: true });
  };

  const handleNavigate = (page) => {
    navigate(PAGE_TO_PATH[page] || "/dashboard");
  };

  const loginElement = (
    <AuthPage
      darkMode={darkMode}
      mode="login"
      onModeChange={(mode) => {
        navigate(mode === "register" ? "/register" : "/login", { state: { from: redirectAfterLogin } });
        setAuthError("");
      }}
      onSubmit={(payload) => handleLoginOrRegister(payload, "login", redirectAfterLogin)}
      loading={authLoading}
      error={authError}
    />
  );

  const registerElement = (
    <AuthPage
      darkMode={darkMode}
      mode="register"
      onModeChange={(mode) => {
        navigate(mode === "register" ? "/register" : "/login", { state: { from: redirectAfterLogin } });
        setAuthError("");
      }}
      onSubmit={(payload) => handleLoginOrRegister(payload, "register", redirectAfterLogin)}
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
        <Routes>
          <Route path="/" element={<Navigate to={authUser ? "/dashboard" : "/login"} replace />} />
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
              <ProtectedRoute authUser={authUser}>
                <Dashboard darkMode={darkMode} onNavigate={handleNavigate} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute authUser={authUser}>
                <Settings
                  darkMode={darkMode}
                  onDarkModeChange={setDarkMode}
                  onBack={() => navigate("/dashboard")}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manual"
            element={
              <ProtectedRoute authUser={authUser}>
                <ManualControl darkMode={darkMode} onBack={() => navigate("/dashboard")} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camera"
            element={
              <ProtectedRoute authUser={authUser}>
                <ManualControl darkMode={darkMode} onBack={() => navigate("/dashboard")} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/connect"
            element={
              <ProtectedRoute authUser={authUser}>
                <Connect darkMode={darkMode} onBack={() => navigate("/dashboard")} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute authUser={authUser}>
                <MapTracking darkMode={darkMode} onBack={() => navigate("/dashboard")} />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={<Navigate to={authUser ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      )}
    </>
  );
}

export default App;
