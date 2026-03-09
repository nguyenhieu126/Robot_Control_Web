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

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState("dashboard");

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

  return (
    <>
      {showSplash && (
        <SplashScreen darkMode={darkMode} onFinish={() => setShowSplash(false)} />
      )}

      {!showSplash && page === "dashboard" && (
        <Dashboard
          darkMode={darkMode}
          onNavigate={setPage}
        />
      )}

      {!showSplash && page === "settings" && (
        <Settings
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
          onBack={() => setPage("dashboard")}
        />
      )}
    </>
  );
}

export default App;
