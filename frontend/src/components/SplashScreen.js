import React, { useEffect, useState, useRef } from "react";
import "./styles/SplashScreen.css";

// Each stage: [targetPercent, pauseMs, stepLabel]
const STAGES = [
  { target: 20,  pause: 700,  text: "Initializing system..." },
  { target: 50,  pause: 900,  text: "Loading calibration data..." },
  { target: 80,  pause: 800,  text: "Connecting to controller..." },
  { target: 100, pause: 500,  text: "Ready." },
];

// Speed (% per ms) while bar is moving between stages
const SPEED = 0.045;

function SplashScreen({ onFinish, darkMode = true }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing system...");
  const [fadeOut, setFadeOut] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const rafRef = useRef(null);
  const stageRef = useRef(0);       // current stage index
  const pausingRef = useRef(false); // true while waiting at a checkpoint
  const progressRef = useRef(0);    // live progress value
  const lastTsRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setLogoReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const tick = (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;

      if (pausingRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const stage = STAGES[stageRef.current];
      const next = Math.min(progressRef.current + SPEED * dt, stage.target);
      progressRef.current = next;
      setProgress(next);

      if (next >= stage.target) {
        // Reached checkpoint — pause
        pausingRef.current = true;
        const nextStage = stageRef.current + 1;

        if (nextStage >= STAGES.length) {
          // All done
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onFinish, 700);
          }, stage.pause);
          return;
        }

        setTimeout(() => {
          stageRef.current = nextStage;
          setStatusText(STAGES[nextStage].text);
          pausingRef.current = false;
        }, stage.pause);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onFinish]);

  return (
    <div className={`splash splash--${darkMode ? "dark" : "light"}${fadeOut ? " splash--fadeout" : ""}`}>
      {/* Background grid */}
      <div className="splash-grid" />

      {/* Ambient corner glows */}
      <div className="splash-glow splash-glow--tl" />
      <div className="splash-glow splash-glow--br" />

      {/* Scan line */}
      <div className="splash-scanline" />

      <div className={`splash-content${logoReady ? " splash-content--visible" : ""}`}>

        {/* ── Logo ── */}
        <div className="splash-logo-wrap">
          {/* Outer rotating ring */}
          <div className="ring ring--outer" />
          {/* Inner rotating ring (opposite) */}
          <div className="ring ring--inner" />
          {/* Pulse halo */}
          <div className="ring ring--pulse" />

          {/* SVG logo — circuit trident */}
          <div className="splash-logo-circle">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="logo-svg">
              <circle cx="100" cy="100" r="90"
                fill={darkMode ? "#0a1628" : "#c0d8f0"}
                stroke={darkMode ? "#00e5c3" : "#1a6bff"} strokeWidth="3" />
              <circle cx="100" cy="100" r="82" fill="none"
                stroke={darkMode ? "#1a3a6b" : "#90b4d8"} strokeWidth="8" strokeDasharray="30 12" />
              <circle cx="100" cy="100" r="72" fill="none"
                stroke={darkMode ? "#0c2548" : "#b0cce8"} strokeWidth="14" />
              <circle cx="100" cy="100" r="68" fill="none"
                stroke={darkMode ? "#00e5c3" : "#1a6bff"} strokeWidth="1.5" strokeDasharray="20 8" opacity="0.6" />
              {[0,60,120,180,240,300].map((a,i) => (
                <circle key={i}
                  cx={100 + 82 * Math.cos((a * Math.PI) / 180)}
                  cy={100 + 82 * Math.sin((a * Math.PI) / 180)}
                  r="3"
                  fill={darkMode ? "#00e5c3" : "#1a6bff"} opacity="0.8" />
              ))}
              <polygon
                points="90,140 105,100 95,100 110,60 85,105 97,105 80,140"
                fill="url(#boltGrad)" opacity="0.9" />
              <g transform="translate(108, 55)" opacity="0.9">
                <line x1="10" y1="0" x2="10" y2="52"
                  stroke={darkMode ? "#c8d8ef" : "#4a6080"} strokeWidth="3" strokeLinecap="round" />
                <line x1="10" y1="0" x2="4" y2="14"
                  stroke={darkMode ? "#c8d8ef" : "#4a6080"} strokeWidth="2.5" strokeLinecap="round" />
                <line x1="10" y1="0" x2="16" y2="14"
                  stroke={darkMode ? "#c8d8ef" : "#4a6080"} strokeWidth="2.5" strokeLinecap="round" />
                <line x1="4" y1="8" x2="4" y2="0"
                  stroke={darkMode ? "#c8d8ef" : "#4a6080"} strokeWidth="2" strokeLinecap="round" />
                <line x1="16" y1="8" x2="16" y2="0"
                  stroke={darkMode ? "#c8d8ef" : "#4a6080"} strokeWidth="2" strokeLinecap="round" />
                {[32,38,44].map((y,i) => (
                  <rect key={i} x="7" y={y} width="6" height="2.5" rx="1"
                    fill={darkMode ? "#7090c0" : "#5a80a0"} />
                ))}
              </g>
              <defs>
                <linearGradient id="boltGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={darkMode ? "#4cc9ff" : "#1a6bff"} />
                  <stop offset="100%" stopColor={darkMode ? "#00e5c3" : "#00a884"} />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* ── Title ── */}
        <div className="splash-title">
          <h1 className="splash-name">
            <span className="splash-name__kali">Kali</span>
            <span className="splash-name__vega">Vega</span>
          </h1>
          <p className="splash-sub">Controller</p>
        </div>

        {/* ── Progress bar ── */}
        <div className="splash-bar-wrap">
          <div className="splash-bar-track">
            <div className="splash-bar-fill" style={{ width: `${progress}%` }}>
              <div className="splash-bar-glow" />
            </div>
          </div>
          <p className="splash-status">{statusText}</p>
        </div>

      </div>
    </div>
  );
}

export default SplashScreen;