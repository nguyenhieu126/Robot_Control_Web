import { getApiBaseUrl } from './runtimeEndpoints';

function isAbsoluteHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

export function resolveMediaUrl(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return '';

  const value = inputPath.trim();
  if (!value) return '';

  if (value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  if (isAbsoluteHttpUrl(value)) {
    return value;
  }

  if (value.startsWith('//')) {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}${value}`;
    }
    return `http:${value}`;
  }

  const apiBase = getApiBaseUrl();

  if (value.startsWith('/')) {
    return `${apiBase}${value}`;
  }

  return `${apiBase}/${value}`;
}
