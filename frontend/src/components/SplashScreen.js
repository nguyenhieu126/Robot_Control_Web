import React, { useEffect, useState, useRef } from "react";
import "./SplashScreen.css";

const STEPS = [
  "Initializing system...",
  "Loading calibration data...",
  "Connecting to controller...",
  "Syncing BLE protocol...",
  "Ready.",
];

function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const DURATION = 2000; // ms total for progress bar

  useEffect(() => {
    // Logo entrance delay
    const t = setTimeout(() => setLogoReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Smooth progress bar
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const p = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(p);

      // Update step text based on progress
      const si = Math.min(Math.floor((p / 100) * STEPS.length), STEPS.length - 1);
      setStepIndex(si);

      if (p < 100) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Pause at 100% then fade out
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onFinish, 700);
        }, 400);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onFinish]);

  return (
    <div className={`splash${fadeOut ? " splash--fadeout" : ""}`}>
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
              {/* Outer circle */}
              <circle cx="100" cy="100" r="90" fill="#0a1628" stroke="#00e5c3" strokeWidth="3" />

              {/* Circuit arc decorations */}
              <circle cx="100" cy="100" r="82" fill="none" stroke="#1a3a6b" strokeWidth="8" strokeDasharray="30 12" />
              <circle cx="100" cy="100" r="72" fill="none" stroke="#0c2548" strokeWidth="14" />
              <circle cx="100" cy="100" r="68" fill="none" stroke="#00e5c3" strokeWidth="1.5" strokeDasharray="20 8" opacity="0.6" />

              {/* Small circuit dots */}
              {[0,60,120,180,240,300].map((a,i) => (
                <circle
                  key={i}
                  cx={100 + 82 * Math.cos((a * Math.PI) / 180)}
                  cy={100 + 82 * Math.sin((a * Math.PI) / 180)}
                  r="3"
                  fill="#00e5c3"
                  opacity="0.8"
                />
              ))}

              {/* Lightning bolt */}
              <polygon
                points="90,140 105,100 95,100 110,60 85,105 97,105 80,140"
                fill="url(#boltGrad)"
                opacity="0.9"
              />

              {/* Trident */}
              <g transform="translate(108, 55)" opacity="0.9">
                <line x1="10" y1="0" x2="10" y2="52" stroke="#c8d8ef" strokeWidth="3" strokeLinecap="round" />
                <line x1="10" y1="0" x2="4" y2="14" stroke="#c8d8ef" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="10" y1="0" x2="16" y2="14" stroke="#c8d8ef" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="4" y1="8" x2="4" y2="0" stroke="#c8d8ef" strokeWidth="2" strokeLinecap="round" />
                <line x1="16" y1="8" x2="16" y2="0" stroke="#c8d8ef" strokeWidth="2" strokeLinecap="round" />
                {/* Handle grip rings */}
                {[32,38,44].map((y,i) => (
                  <rect key={i} x="7" y={y} width="6" height="2.5" rx="1" fill="#7090c0" />
                ))}
              </g>

              {/* Gradient defs */}
              <defs>
                <linearGradient id="boltGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4cc9ff" />
                  <stop offset="100%" stopColor="#00e5c3" />
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
          <p className="splash-status">{STEPS[stepIndex]}</p>
        </div>

      </div>
    </div>
  );
}

export default SplashScreen;
