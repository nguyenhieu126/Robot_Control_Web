const STORAGE_KEYS = {
  dashboardSize: 'kalivega-dashboard-size',
  alertToastDurationMs: 'kalivega-alert-toast-duration-ms',
  notificationClickOpensEvents: 'kalivega-notification-click-opens-events',
};

const DASHBOARD_SIZES = new Set(['SM', 'MD', 'LG', 'XL']);
const DEFAULT_TOAST_DURATION_MS = 5000;

function readStorage(key) {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, String(value));
}

export function getDashboardSizePreference() {
  const raw = readStorage(STORAGE_KEYS.dashboardSize);
  if (!raw || !DASHBOARD_SIZES.has(raw)) {
    return 'XL';
  }
  return raw;
}

export function setDashboardSizePreference(size) {
  const normalized = String(size || '').toUpperCase();
  if (!DASHBOARD_SIZES.has(normalized)) {
    return;
  }
  writeStorage(STORAGE_KEYS.dashboardSize, normalized);
}

export function getAlertToastDurationMsPreference() {
  const raw = readStorage(STORAGE_KEYS.alertToastDurationMs);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_TOAST_DURATION_MS;
  }

  return Math.max(2000, Math.min(parsed, 15000));
}

export function setAlertToastDurationMsPreference(durationMs) {
  const parsed = Number(durationMs);
  if (!Number.isFinite(parsed)) {
    return;
  }

  const normalized = Math.max(2000, Math.min(Math.round(parsed), 15000));
  writeStorage(STORAGE_KEYS.alertToastDurationMs, normalized);
}

export function getNotificationClickOpensEventsPreference() {
  const raw = readStorage(STORAGE_KEYS.notificationClickOpensEvents);
  if (raw === null) {
    return true;
  }
  return raw === 'true';
}

export function setNotificationClickOpensEventsPreference(value) {
  writeStorage(STORAGE_KEYS.notificationClickOpensEvents, Boolean(value));
}

export function resetAppPreferences() {
  setDashboardSizePreference('XL');
  setAlertToastDurationMsPreference(DEFAULT_TOAST_DURATION_MS);
  setNotificationClickOpensEventsPreference(true);
}
