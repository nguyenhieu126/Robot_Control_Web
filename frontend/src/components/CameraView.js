import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./styles/CameraView.css";

const DEFAULT_STREAM_URL = "http://192.168.1.11:8080/stream.mjpg";
const STREAM_ENDPOINT = process.env.REACT_APP_CAMERA_DIRECT_STREAM_URL || DEFAULT_STREAM_URL;

function formatTime(ts) {
  if (!ts) return "--";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("vi-VN", { hour12: false });
}

export default function CameraView({ onBack, darkMode = true }) {
  const [streamStatus, setStreamStatus] = useState("loading");
  const [lastLiveAt, setLastLiveAt] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [streamKey, setStreamKey] = useState(0);

  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);

  const themeCls = darkMode ? "cv-page--dark" : "cv-page--light";

  const scheduleRetry = useCallback(() => {
    clearTimeout(retryTimeoutRef.current);
    const attempt = retryCountRef.current + 1;
    retryCountRef.current = attempt;
    const backoff = Math.min(10000, 1500 * attempt);

    retryTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setStreamStatus("loading");
      setStreamKey((prev) => prev + 1);
    }, backoff);
  }, []);

  const handleImageLoad = useCallback(() => {
    retryCountRef.current = 0;
    setStreamStatus("live");
    setLastLiveAt(new Date().toISOString());
    setErrorMessage("");
  }, []);

  const handleImageError = useCallback(() => {
    setStreamStatus("offline");
    setErrorMessage("Camera stream interrupted. Retrying...");
    scheduleRetry();
  }, [scheduleRetry]);

  const handleManualRetry = useCallback(() => {
    retryCountRef.current = 0;
    clearTimeout(retryTimeoutRef.current);
    setStreamStatus("loading");
    setErrorMessage("");
    setStreamKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  const streamUrl = useMemo(() => `${STREAM_ENDPOINT}?v=${streamKey}`, [streamKey]);

  const liveBadge = streamStatus === "live";

  return (
    <div className={`cv-page ${themeCls}`}>
      <div className="cv-bg-grid" />
      <div className="cv-glow cv-glow--tl" />
      <div className="cv-glow cv-glow--br" />

      <header className="cv-header">
        <button className="cv-back" onClick={onBack} title="Quay lại">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <div className="cv-title-wrap">
          <h1>Camera View</h1>
          <p>Live camera stream only (no control commands)</p>
        </div>

        <div className={`cv-badge ${liveBadge ? "cv-badge--live" : "cv-badge--offline"}`}>
          <span className="cv-dot" />
          {liveBadge ? "Live" : "Offline"}
        </div>
      </header>

      <main className="cv-main">
        <section className="cv-stream-card">
          <div className="cv-stream-head">
            <h2>Robot Camera</h2>
            <button className="cv-btn" onClick={handleManualRetry}>Retry</button>
          </div>

          <div className="cv-stream-shell">
            {streamStatus === "loading" && (
              <div className="cv-overlay">
                <span className="cv-spinner" />
                <span>Loading stream...</span>
              </div>
            )}

            {streamStatus === "offline" && (
              <div className="cv-overlay cv-overlay--error">
                <span>Camera offline</span>
                <small>{errorMessage || "Unable to load stream"}</small>
              </div>
            )}

            <img
              src={streamUrl}
              alt="Robot camera stream"
              className={`cv-stream ${streamStatus === "live" ? "cv-stream--visible" : ""}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        </section>

        <section className="cv-status-card">
          <h3>Connection Status</h3>
          <div className="cv-row">
            <span>Source URL</span>
            <strong>{STREAM_ENDPOINT}</strong>
          </div>
          <div className="cv-row">
            <span>Stream</span>
            <strong className={streamStatus === "live" ? "ok" : "bad"}>{streamStatus}</strong>
          </div>
          <div className="cv-row">
            <span>Last live frame</span>
            <strong>{formatTime(lastLiveAt)}</strong>
          </div>
          {errorMessage && <p className="cv-error-text">{errorMessage}</p>}
        </section>
      </main>
    </div>
  );
}
