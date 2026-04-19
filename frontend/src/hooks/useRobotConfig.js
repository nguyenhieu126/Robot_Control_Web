import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRobotApi } from './useRobotApi';

export const DEFAULT_ROBOT_CONFIG = Object.freeze({
  minRunSpeed: 150,
  cruiseSpeed: 70,
  fastSpeed: 90,
  backSpeed: 170,
  escapeSpeed: 200,
  sharpTurnBoost: 220,
  mediumTurnBoost: 180,
  turnBoost: 160,
  lightTurnBoost: 145,
  emergencyDist: 35,
  stopDistance: 40,
  slowDistance: 50,
  turnDistance: 65,
  prepareDistance: 70,
  sideDangerDist: 45,
  backDangerDistance: 45,
  directionHysteresis: 8,
});

function normalizeConfigData(raw) {
  const source = raw?.source || 'unknown';
  const timestamp = raw?.timestamp || null;

  const config = { ...DEFAULT_ROBOT_CONFIG };
  Object.keys(DEFAULT_ROBOT_CONFIG).forEach((key) => {
    const value = Number(raw?.[key]);
    if (Number.isFinite(value)) {
      config[key] = value;
    }
  });

  return { config, source, timestamp };
}

export function useRobotConfig({ enabled = true } = {}) {
  const { getRobotConfig, updateRobotConfig, resetRobotConfig } = useRobotApi();

  const [config, setConfig] = useState({ ...DEFAULT_ROBOT_CONFIG });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('unknown');
  const [timestamp, setTimestamp] = useState(null);
  const [cached, setCached] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!enabled) return { success: false, error: 'disabled' };

    setLoading(true);
    setError('');

    const res = await getRobotConfig();
    setLoading(false);

    if (!res?.success) {
      setError(res?.error || 'Unable to fetch robot config');
      return { success: false, error: res?.error || 'Unable to fetch robot config' };
    }

    const normalized = normalizeConfigData(res.data);
    setConfig(normalized.config);
    setSource(normalized.source);
    setTimestamp(normalized.timestamp);
    setCached(Boolean(res.cached));
    setStatus(res.stale ? 'Loaded cached config (ESP32 offline)' : 'Config loaded');

    return { success: true, data: normalized.config };
  }, [enabled, getRobotConfig]);

  const updateConfig = useCallback(async (nextConfig) => {
    if (!enabled) return { success: false, error: 'disabled' };

    setSaving(true);
    setError('');

    const res = await updateRobotConfig(nextConfig);
    setSaving(false);

    if (!res?.success) {
      const message = res?.error || 'Failed to save config';
      setError(message);
      return { success: false, error: message };
    }

    const ackConfig = res?.data?.ack?.appliedConfig || nextConfig;
    const normalized = normalizeConfigData(ackConfig);
    setConfig(normalized.config);
    setSource(res?.data?.ack?.source || 'nvs');
    setTimestamp(new Date().toISOString());
    setCached(false);
    setStatus('Config saved to ESP32 flash');
    return { success: true, data: normalized.config };
  }, [enabled, updateRobotConfig]);

  const resetToDefaults = useCallback(async () => {
    if (!enabled) return { success: false, error: 'disabled' };

    setSaving(true);
    setError('');

    const res = await resetRobotConfig();
    setSaving(false);

    if (!res?.success) {
      const message = res?.error || 'Failed to reset config';
      setError(message);
      return { success: false, error: message };
    }

    const ackConfig = res?.data?.ack?.appliedConfig || DEFAULT_ROBOT_CONFIG;
    const normalized = normalizeConfigData(ackConfig);
    setConfig(normalized.config);
    setSource('default');
    setTimestamp(new Date().toISOString());
    setCached(false);
    setStatus('Config reset to defaults');
    return { success: true, data: normalized.config };
  }, [enabled, resetRobotConfig]);

  useEffect(() => {
    if (enabled) {
      fetchConfig();
    }
  }, [enabled, fetchConfig]);

  return useMemo(() => ({
    config,
    setConfig,
    loading,
    saving,
    error,
    status,
    source,
    timestamp,
    cached,
    fetchConfig,
    updateConfig,
    resetToDefaults,
  }), [
    config,
    loading,
    saving,
    error,
    status,
    source,
    timestamp,
    cached,
    fetchConfig,
    updateConfig,
    resetToDefaults,
  ]);
}
