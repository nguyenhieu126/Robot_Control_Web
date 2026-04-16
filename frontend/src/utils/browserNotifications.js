const STORAGE_KEYS = {
  enabled: 'kalivega-notifications-enabled',
  notifyWhenFocused: 'kalivega-notify-when-focused',
};

function readBoolean(key, fallbackValue) {
  if (typeof window === 'undefined') return fallbackValue;

  const raw = localStorage.getItem(key);
  if (raw === null) return fallbackValue;
  return raw === 'true';
}

function writeBoolean(key, value) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value ? 'true' : 'false');
}

export function getNotificationSettings() {
  return {
    enabled: readBoolean(STORAGE_KEYS.enabled, true),
    notifyWhenFocused: readBoolean(STORAGE_KEYS.notifyWhenFocused, false),
  };
}

export function setNotificationEnabled(value) {
  writeBoolean(STORAGE_KEYS.enabled, Boolean(value));
}

export function setNotifyWhenFocused(value) {
  writeBoolean(STORAGE_KEYS.notifyWhenFocused, Boolean(value));
}

export function isBrowserNotificationSupported() {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;

  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  if (!window.isSecureContext && !isLocalhost) return false;

  return true;
}

export function getBrowserNotificationPermission() {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestBrowserNotificationPermission() {
  if (!isBrowserNotificationSupported()) return 'unsupported';

  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}
