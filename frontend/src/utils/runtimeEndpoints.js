const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function getRuntimeHost() {
  if (typeof window === 'undefined') {
    return {
      protocol: 'http:',
      hostname: 'localhost',
      isLocal: true,
    };
  }

  const { protocol, hostname } = window.location;
  return {
    protocol,
    hostname,
    isLocal: LOCAL_HOSTS.has(hostname),
  };
}

function buildOrigin(protocol, hostname, port) {
  return `${protocol}//${hostname}:${port}`;
}

export function getApiBaseUrl() {
  const explicitApiUrl = process.env.REACT_APP_API_URL;
  if (explicitApiUrl) {
    return trimTrailingSlash(explicitApiUrl);
  }

  const { protocol, hostname, isLocal } = getRuntimeHost();
  const localPort = process.env.REACT_APP_LOCAL_API_PORT || '5000';
  const domainPort = process.env.REACT_APP_DOMAIN_API_PORT || '5000';
  const apiProtocol = protocol === 'https:' ? 'https:' : 'http:';
  const port = isLocal ? localPort : domainPort;

  return trimTrailingSlash(buildOrigin(apiProtocol, hostname, port));
}

export function getWsDashboardUrl() {
  const explicitWsUrl = process.env.REACT_APP_WS_DASHBOARD;
  if (explicitWsUrl) {
    return trimTrailingSlash(explicitWsUrl);
  }

  const { protocol, hostname, isLocal } = getRuntimeHost();
  const localPort = process.env.REACT_APP_LOCAL_API_PORT || '5000';
  const domainPort = process.env.REACT_APP_DOMAIN_API_PORT || '5000';
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const port = isLocal ? localPort : domainPort;

  return `${buildOrigin(wsProtocol, hostname, port)}/ws/dashboard`;
}