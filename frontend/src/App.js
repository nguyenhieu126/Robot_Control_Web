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
import SplashScreen from "./components/SplashScreen";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import ManualControl from "./components/ManualControl";
import Connect from "./components/Connect";
import MapTracking from "./components/MapTracking";
import AuthPage from "./components/AuthPage";
import { useRobotApi } from "./hooks/useRobotApi";

function App() {
  const { register, login, getMe } = useRobotApi();
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem("auth_user"));
  const [page, setPage] = useState("dashboard");
  const [authMode, setAuthMode] = useState("login");
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
      setPage("dashboard");
      setShowSplash(false);
    });
  }, [getMe]);

  const handleLoginOrRegister = async (payload) => {
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
        setAuthMode("login");
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
        setPage("dashboard");
        setShowSplash(false);
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
    setAuthMode("login");
  };

  return (
    <>
      {showSplash && (
        <SplashScreen darkMode={darkMode} onFinish={() => setShowSplash(false)} />
      )}

      {!showSplash && !authUser && (
        <AuthPage
          darkMode={darkMode}
          mode={authMode}
          onModeChange={(mode) => {
            setAuthMode(mode);
            setAuthError("");
          }}
          onSubmit={handleLoginOrRegister}
          loading={authLoading}
          error={authError}
        />
      )}

      {!showSplash && authUser && page === "dashboard" && (
        <Dashboard
          darkMode={darkMode}
          onNavigate={setPage}
          onLogout={handleLogout}
        />
      )}

      {!showSplash && authUser && page === "settings" && (
        <Settings
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
          onBack={() => setPage("dashboard")}
        />
      )}

      {!showSplash && authUser && (page === "manual" || page === "camera") && (
        <ManualControl
          darkMode={darkMode}
          onBack={() => setPage("dashboard")}
        />
      )}

      {!showSplash && authUser && page === "connect" && (
        <Connect
          darkMode={darkMode}
          onBack={() => setPage("dashboard")}
        />
      )}

      {!showSplash && authUser && page === "map" && (
        <MapTracking
          darkMode={darkMode}
          onBack={() => setPage("dashboard")}
        />
      )}
    </>
  );
}

export default App;
