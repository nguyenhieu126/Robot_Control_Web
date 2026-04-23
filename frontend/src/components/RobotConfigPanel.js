import React, { useEffect, useMemo, useState } from 'react';
import { DEFAULT_ROBOT_CONFIG, useRobotConfig } from '../hooks/useRobotConfig';
import './styles/RobotConfigPanel.css';

const SPEED_FIELDS = [
  ['minRunSpeed', 'Min Run Speed', 0, 255, 'PWM'],
  ['cruiseSpeed', 'Cruise Speed', 0, 255, 'PWM'],
  ['fastSpeed', 'Fast Speed', 0, 255, 'PWM'],
  ['backSpeed', 'Back Speed', 0, 255, 'PWM'],
  ['escapeSpeed', 'Escape Speed', 0, 255, 'PWM'],
  ['sharpTurnBoost', 'Sharp Turn Boost', 0, 255, 'PWM'],
  ['mediumTurnBoost', 'Medium Turn Boost', 0, 255, 'PWM'],
  ['turnBoost', 'Turn Boost', 0, 255, 'PWM'],
  ['lightTurnBoost', 'Light Turn Boost', 0, 255, 'PWM'],
];

const DISTANCE_FIELDS = [
  ['emergencyDist', 'Emergency Distance', 10, 200, 'cm'],
  ['stopDistance', 'Stop Distance', 10, 200, 'cm'],
  ['slowDistance', 'Slow Distance', 10, 200, 'cm'],
  ['turnDistance', 'Turn Distance', 10, 200, 'cm'],
  ['prepareDistance', 'Prepare Distance', 10, 200, 'cm'],
  ['sideDangerDist', 'Side Danger Distance', 10, 200, 'cm'],
  ['backDangerDistance', 'Back Danger Distance', 10, 200, 'cm'],
  ['directionHysteresis', 'Direction Hysteresis', 1, 50, 'cm'],
];

function RobotConfigField({ id, label, min, max, unit, value, onChange }) {
  return (
    <label className="robot-config-field" htmlFor={id}>
      <div className="robot-config-field-label-wrap">
        <span className="robot-config-field-label">{label}</span>
        <span className="robot-config-field-range">{min} - {max} {unit}</span>
      </div>
      <div className="robot-config-input-wrap">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="robot-config-unit">{unit}</span>
      </div>
    </label>
  );
}

function RobotConfigPanel({ isAdmin = false }) {
  const {
    config,
    loading,
    saving,
    error,
    status,
    timestamp,
    setConfig,
    fetchConfig,
    updateConfig,
    resetToDefaults,
  } = useRobotConfig({ enabled: isAdmin });

  const [draft, setDraft] = useState({ ...DEFAULT_ROBOT_CONFIG });

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const hasDistanceOrderError = useMemo(() => {
    return !(
      draft.emergencyDist <= draft.stopDistance
      && draft.stopDistance <= draft.slowDistance
      && draft.slowDistance <= draft.turnDistance
      && draft.turnDistance <= draft.prepareDistance
    );
  }, [draft]);

  const updateField = (key, min, max, value) => {
    if (!Number.isFinite(value)) {
      return;
    }

    const next = Math.max(min, Math.min(max, Math.round(value)));
    setDraft((prev) => ({ ...prev, [key]: next }));
  };

  const handleSave = async () => {
    if (hasDistanceOrderError) return;
    const result = await updateConfig(draft);
    if (result.success) {
      setConfig(result.data);
    }
  };

  const handleReset = async () => {
    const result = await resetToDefaults();
    if (result.success) {
      setDraft(result.data);
      setConfig(result.data);
    }
  };

  if (!isAdmin) {
    return (
      <div className="robot-config-panel robot-config-panel--readonly">
        <p className="robot-config-note">Robot configuration is available for admin accounts only.</p>
      </div>
    );
  }

  return (
    <div className="robot-config-panel">
      <div className="robot-config-head">
        <div>
          <h3>Robot Configuration</h3>
          <p>Edit speed and distance thresholds, then save to ESP32 flash memory.</p>
        </div>
        <button type="button" className="robot-config-refresh" onClick={fetchConfig} disabled={loading || saving}>
          {loading ? 'Loading...' : 'Reload'}
        </button>
      </div>

      <div className="robot-config-meta">
        <span>{timestamp ? `Updated: ${new Date(timestamp).toLocaleString()}` : 'Updated: -'}</span>
      </div>

      <div className="robot-config-section">
        <h4>Speed Parameters</h4>
        <div className="robot-config-grid">
          {SPEED_FIELDS.map(([key, label, min, max, unit]) => (
            <RobotConfigField
              key={key}
              id={`cfg-${key}`}
              label={label}
              min={min}
              max={max}
              unit={unit}
              value={draft[key]}
              onChange={(value) => updateField(key, min, max, value)}
            />
          ))}
        </div>
      </div>

      <div className="robot-config-section">
        <h4>Distance Thresholds</h4>
        <div className="robot-config-grid">
          {DISTANCE_FIELDS.map(([key, label, min, max, unit]) => (
            <RobotConfigField
              key={key}
              id={`cfg-${key}`}
              label={label}
              min={min}
              max={max}
              unit={unit}
              value={draft[key]}
              onChange={(value) => updateField(key, min, max, value)}
            />
          ))}
        </div>
      </div>

      {hasDistanceOrderError ? (
        <div className="robot-config-alert robot-config-alert--error">
          Distance order invalid: emergency &lt;= stop &lt;= slow &lt;= turn &lt;= prepare.
        </div>
      ) : null}

      {error ? <div className="robot-config-alert robot-config-alert--error">{error}</div> : null}
      {status ? <div className="robot-config-alert robot-config-alert--success">{status}</div> : null}

      <div className="robot-config-actions">
        <button type="button" onClick={handleReset} disabled={saving || loading}>
          Reset to Defaults
        </button>
        <button type="button" className="primary" onClick={handleSave} disabled={saving || loading || hasDistanceOrderError}>
          {saving ? 'Saving...' : 'Save to ESP32'}
        </button>
      </div>
    </div>
  );
}

export default RobotConfigPanel;
