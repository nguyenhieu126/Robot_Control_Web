import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FaBan,
  FaBolt,
  FaClock,
  FaExclamationTriangle,
  FaHandPaper,
  FaLock,
  FaStop,
} from 'react-icons/fa';
import Joystick from './Joystick';
import { useRobotWS }  from '../hooks/useRobotWS';
import { useRobotApi } from '../hooks/useRobotApi';
import { getApiBaseUrl } from '../utils/runtimeEndpoints';
import './styles/ManualControl.css';

const API_BASE = getApiBaseUrl();
const STREAM_ENDPOINT = `${API_BASE}/api/camera/stream`;
const STEER_SIGN = -1;
const MAX_STEER_DEG = 45;

const STATE_NAMES = [
  'INIT','NORMAL','SLOW','AVOID_L','AVOID_R',
  'TURN_L','TURN_R','BACKING','STOP','EMERGENCY','MANUAL','ESCAPE',
];

function resolveStateName(state, stateCode) {
  if (typeof state === 'string' && state.length > 0) return state;

  const code = Number.isInteger(Number(stateCode))
    ? Number(stateCode)
    : Number(state);

  if (Number.isInteger(code) && STATE_NAMES[code]) {
    return STATE_NAMES[code];
  }

  return `ST(${state ?? stateCode ?? 'UNKNOWN'})`;
}

// ── Slider with fill track ───────────────────────────────────────
function RangeSlider({ label, sub, min, max, step, value, unit, onChange, onCommit }) {
  const pct = ((value - min) / (max - min) * 100).toFixed(1);

  // Centered fill for steering (-45 to 45)
  const isCentered = min < 0;
  const centerPct  = ((-min) / (max - min) * 100).toFixed(1);
  const fillStyle  = isCentered
    ? {
        '--fill-a': `${Math.min(+pct, +centerPct)}%`,
        '--fill-b': `${Math.max(+pct, +centerPct)}%`,
        '--fill-color': 'var(--accent-purple)',
      }
    : { '--fill-a': '0%', '--fill-b': `${pct}%`, '--fill-color': 'var(--accent-blue)' };

  return (
    <div className="mc-card mc-slider-card">
      <div className="mcs-header">
        <div>
          <h3>{label}</h3>
          <span className="mcs-sub">{sub}</span>
        </div>
        <div className="mcs-val">
          <span className="mcs-big" style={{ color: isCentered ? 'var(--accent-purple)' : 'var(--accent-blue)' }}>
            {value}
          </span>
          <span className="mcs-unit">{unit}</span>
        </div>
      </div>

      <div className="mcs-row">
        <button className="mcs-btn" onClick={() => onChange(Math.max(min, value - step * 2))}>−</button>
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          className={`mc-range ${isCentered ? 'mc-range-center' : ''}`}
          style={fillStyle}
          onChange={(e) => onChange(+e.target.value)}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
          onPointerUp={onCommit}
        />
        <button className="mcs-btn" onClick={() => onChange(Math.min(max, value + step * 2))}>+</button>
      </div>

      <div className="mcs-ticks">
        <span>{min}{isCentered ? '°' : ''}</span>
        <span>{isCentered ? '0°' : Math.round((min+max)/2)}</span>
        <span>{max}{isCentered ? '°' : ''}</span>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────
function ManualControl({ onBack, darkMode = true }) {
  const { robotStatus, wsConnected, sendDirect } = useRobotWS();
  const { sendCommand, setMode } = useRobotApi();

  const [speed,    setSpeed]    = useState(120);
  const [steer,    setSteer]    = useState(0);
  const [joyXY,    setJoyXY]    = useState({ x: 0, y: 0 });
  const [toggling, setToggling] = useState(false);
  const [showTuning, setShowTuning] = useState(false);
  const [streamStatus, setStreamStatus] = useState('loading');
  const [streamKey, setStreamKey] = useState(0);
  const [streamError, setStreamError] = useState('');

  const joystickActive = useRef(false);
  const joystickVal    = useRef({ x: 0, y: 0 });
  const speedRef       = useRef(speed);
  const intervalRef    = useRef(null);
  const retryTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const isManual    = robotStatus.mode === 'MANUAL';
  const robotOnline = robotStatus.robotConnected;
  const stateName   = resolveStateName(robotStatus.state, robotStatus.stateCode);

  // ── Joystick send loop 150 ms ──
  useEffect(() => {
    if (!isManual) { clearInterval(intervalRef.current); return; }

    intervalRef.current = setInterval(() => {
      const { x, y } = joystickVal.current;
      if (!joystickActive.current && x === 0 && y === 0) return;

      // const spd = Math.round(-y * speedRef.current); // up → positive = forward
      // const str = Math.round(x * 45);               // right → positive
      // sendDirect('JOYSTICK', { speed: spd, steer: str });
      const spd = Math.round(-y * speedRef.current);       // up → positive = forward
      const str = Math.round(x * MAX_STEER_DEG * STEER_SIGN); // đảo chiều servo thực tế
      sendDirect('JOYSTICK', { speed: spd, steer: str });
    }, 150);

    return () => clearInterval(intervalRef.current);
  }, [isManual, sendDirect]);

  const scheduleStreamRetry = useCallback(() => {
    clearTimeout(retryTimeoutRef.current);
    const attempt = retryCountRef.current + 1;
    retryCountRef.current = attempt;
    const backoff = Math.min(10000, 1500 * attempt);

    retryTimeoutRef.current = setTimeout(() => {
      setStreamStatus('loading');
      setStreamKey((prev) => prev + 1);
    }, backoff);
  }, []);

  const handleStreamLoad = useCallback(() => {
    retryCountRef.current = 0;
    setStreamStatus('live');
    setStreamError('');
  }, []);

  const handleStreamError = useCallback(() => {
    setStreamStatus('offline');
    setStreamError('Camera stream interrupted. Retrying...');
    scheduleStreamRetry();
  }, [scheduleStreamRetry]);

  const handleStreamRetry = useCallback(() => {
    retryCountRef.current = 0;
    clearTimeout(retryTimeoutRef.current);
    setStreamStatus('loading');
    setStreamError('');
    setStreamKey((prev) => prev + 1);
  }, []);

  const handleJoyChange = useCallback((nx, ny) => {
    joystickActive.current = true;
    joystickVal.current    = { x: nx, y: ny };
    setJoyXY({ x: nx, y: ny });
  }, []);

  const handleJoyRelease = useCallback(() => {
    joystickActive.current = false;
    joystickVal.current    = { x: 0, y: 0 };
    setJoyXY({ x: 0, y: 0 });
    sendDirect('JOYSTICK', { speed: 0, steer: 0 });
    sendDirect('STOP', null);
  }, [sendDirect]);

  const handleToggleMode = useCallback(async () => {
    setToggling(true);
    const next = isManual ? 'AUTONOMOUS' : 'MANUAL';
    if (!isManual) await sendCommand('STOP', null);   // dừng trước khi MANUAL
    await setMode(next);
    // Không cần timeout cố định - UI sẽ tự cập nhật khi nhận STATUS từ ESP32
  }, [isManual, sendCommand, setMode]);

  // Tự động tắt toggling state khi mode đã thay đổi
  useEffect(() => {
    if (toggling) {
      setToggling(false);
    }
  }, [toggling, robotStatus.mode]);

  const handleStop = useCallback(() => {
    sendDirect('STOP', null);
    sendCommand('STOP', null);
  }, [sendDirect, sendCommand]);

  const handleEmergency = useCallback(() => {
    sendDirect('STOP', null);
    sendDirect('JOYSTICK', { speed: 0, steer: 0 });
    sendCommand('STOP', null);
  }, [sendDirect, sendCommand]);

  const handleSpeedChange = useCallback((val) => {
    setSpeed(val);
    speedRef.current = val;
  }, []);

  // ── Steer slider manual apply ──
  // const handleSteerApply = useCallback(() => {
  //   if (isManual) {
  //     const dir = steer >= 0 ? 'RIGHT' : 'LEFT';
  //     sendDirect('TURN', { direction: dir, angle: Math.abs(steer) });
  //   }
  // }, [isManual, steer, sendDirect]);
  const handleSteerApply = useCallback(() => {
    if (isManual) {
      // `steer` là giá trị theo UI: dương = phải, âm = trái.
      // `servoSteer` là giá trị thực gửi xuống robot sau khi đảo chiều servo.
      const servoSteer = steer * STEER_SIGN;
      const dir = servoSteer >= 0 ? 'RIGHT' : 'LEFT';
      sendDirect('TURN', { direction: dir, angle: Math.abs(servoSteer) });
    }
  }, [isManual, steer, sendDirect]);

  const handleSteerCenter = useCallback(() => {
    setSteer(0);
    if (isManual) {
      sendDirect('TURN', { direction: 'RIGHT', angle: 0 });
    }
  }, [isManual, sendDirect]);

  const theme = darkMode ? 'mc-dark' : 'mc-light';
  const streamUrl = useMemo(() => `${STREAM_ENDPOINT}?v=${streamKey}`, [streamKey]);

  useEffect(() => {
    return () => {
      clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  return (
    <div className={`mc-page ${theme}`}>

      {/* ── HEADER ── */}
      <header className="mc-header">
        <button className="mc-back" onClick={onBack} title="Quay lại">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <div className="mc-title">
          <h1>Manual Control</h1>
          <p>Direct robot control</p>
        </div>

        {/* Mode toggle button */}
        <button
          className={`mc-mode-btn ${isManual ? 'mode-is-manual' : 'mode-is-auto'} ${toggling ? 'mode-busy' : ''}`}
          onClick={handleToggleMode}
          disabled={toggling}
          title={`Current: ${isManual ? 'MANUAL' : 'AUTONOMOUS'}. Click to switch to ${isManual ? 'AUTONOMOUS' : 'MANUAL'}`}
        >
          {toggling
            ? <span className="mc-spin" />
            : isManual
              ? (
                <>
                  <FaHandPaper className="mc-mode-icon" aria-hidden="true" />
                  MANUAL MODE
                </>
              )
              : (
                <>
                  <FaBolt className="mc-mode-icon" aria-hidden="true" />
                  AUTO MODE
                </>
              )
          }
        </button>
      </header>

      {/* ── OFFLINE BANNER ── */}
      {!robotOnline && (
        <div className="mc-banner mc-banner-warn">
          <FaExclamationTriangle className="mc-banner-icon" aria-hidden="true" />
          <span>ESP32 is not connected — commands are queued and sent when the robot is online</span>
        </div>
      )}

      {/* ── LIVE CAMERA CARD ── */}
      <div className="mc-card mc-live-camera-card">
        <div className="mc-card-head">
          <div>
            <h2>Live Camera</h2>
            <span className="mc-sub">Onboard stream integrated with Manual Control</span>
          </div>
          <div className="mc-live-head-right">
            <span className={`mc-live-badge ${streamStatus === 'live' ? 'is-live' : 'is-offline'}`}>
              {streamStatus === 'live' ? 'LIVE' : 'OFFLINE'}
            </span>
            <button className="mc-live-retry" onClick={handleStreamRetry}>Reload</button>
          </div>
        </div>

        <div className="mc-live-stream-wrap">
          {streamStatus === 'loading' && (
            <div className="mc-live-overlay">
              <span>Loading stream...</span>
            </div>
          )}

          {streamStatus === 'offline' && (
            <div className="mc-live-overlay mc-live-overlay-error">
              <span>Camera offline</span>
              <small>{streamError || 'Unable to load stream'}</small>
            </div>
          )}

          <img
            src={streamUrl}
            alt="Robot camera stream"
            className={`mc-live-stream ${streamStatus === 'live' ? 'mc-live-stream-visible' : ''}`}
            onLoad={handleStreamLoad}
            onError={handleStreamError}
          />
        </div>
      </div>

      {/* ── JOYSTICK CARD ── */}
      <div className="mc-card mc-joy-card">
        <div className="mc-card-head">
          <div>
            <h2>Drive Control</h2>
            <span className="mc-sub">Joystick Control</span>
          </div>
          <div className="mc-coords">
            <div className="mc-coord-item">
              <span className="mc-coord-label">X</span>
              <span className="mc-coord-val">{joyXY.x >= 0 ? '+' : ''}{joyXY.x.toFixed(2)}</span>
            </div>
            <div className="mc-coord-sep" />
            <div className="mc-coord-item">
              <span className="mc-coord-label">Y</span>
              <span className="mc-coord-val">{joyXY.y >= 0 ? '+' : ''}{joyXY.y.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mc-joy-area">
          <Joystick
            onChange={handleJoyChange}
            onRelease={handleJoyRelease}
            disabled={!isManual}
            size={230}
          />
          {!isManual && (
            <div className="mc-joy-lock">
              <FaLock className="mc-joy-lock-icon" aria-hidden="true" />
              <span>Chế độ AUTONOMOUS đang hoạt động</span>
              <span style={{fontSize: '12px', opacity: 0.7}}>Nhấn nút MANUAL MODE để điều khiển thủ công</span>
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK CONTROL ── */}
      <div className="mc-sliders-grid mc-sliders-quick">
        <RangeSlider
          label="Speed" sub="Range: 0 – 255"
          min={0} max={255} step={5}
          value={speed} unit="units"
          onChange={handleSpeedChange}
        />
      </div>

      {/* ── ADVANCED / TUNING ── */}
      <div className="mc-card mc-tuning-card">
        <button
          className={`mc-tuning-toggle ${showTuning ? 'open' : ''}`}
          onClick={() => setShowTuning(v => !v)}
          type="button"
        >
          <span className="mc-tuning-title">Advanced / Tuning</span>
          <span className="mc-tuning-desc">Servo test, căn lái, debug joystick</span>
          <span className="mc-tuning-caret">{showTuning ? '▲' : '▼'}</span>
        </button>

        {showTuning && (
          <div className="mc-tuning-content">
            <p className="mc-tuning-note">
              Dùng khi bảo trì: test servo, hiệu chỉnh cơ khí lệch lái, hoặc debug khi joystick có vấn đề.
            </p>

            <RangeSlider
              label="Steering" sub="Range: -45° – 45°"
              min={-45} max={45} step={1}
              value={steer} unit="degrees"
              onChange={setSteer}
              onCommit={handleSteerApply}
            />

            <div className="mc-tuning-actions">
              <button className="mc-action-inline" onClick={handleSteerApply} disabled={!isManual}>
                Apply Steering
              </button>
              <button className="mc-action-inline ghost" onClick={handleSteerCenter}>
                Center Steering
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div className="mc-actions">
        <button
          className="mc-action-btn mc-btn-stop"
          onClick={handleStop}
          disabled={!isManual}
        >
          <FaStop className="mc-btn-icon" aria-hidden="true" />
          <span className="mc-btn-label">STOP</span>
          <span className="mc-btn-sub">Dừng xe</span>
        </button>

        <button
          className="mc-action-btn mc-btn-emergency"
          onClick={handleEmergency}
        >
          <FaBan className="mc-btn-icon" aria-hidden="true" />
          <span className="mc-btn-label">Emergency</span>
          <span className="mc-btn-sub">Dừng khẩn cấp</span>
        </button>
      </div>

      {/* ── STATUS BAR ── */}
      <div className="mc-statusbar">
        <div className={`mc-stat-chip ${isManual ? 'chip-manual' : 'chip-auto'}`}>
          <span className="mc-stat-dot" />
          {robotStatus.mode}
        </div>
        <div className="mc-stat-chip chip-neutral">
          State: {stateName}
        </div>
        <div className={`mc-stat-chip ${wsConnected ? 'chip-ok' : 'chip-err'}`}>
          <span className="mc-stat-dot" />
          {wsConnected ? 'WS Connected' : 'WS Offline'}
        </div>
        {robotStatus.rssi !== null && (
          <div className="mc-stat-chip chip-neutral">
            RSSI: {robotStatus.rssi} dBm
          </div>
        )}
        {robotStatus.uptime > 0 && (
          <div className="mc-stat-chip chip-neutral">
            <FaClock className="mc-stat-icon" aria-hidden="true" />
            {Math.floor(robotStatus.uptime / 60)}m {robotStatus.uptime % 60}s
          </div>
        )}
      </div>
    </div>
  );
}

export default ManualControl;
