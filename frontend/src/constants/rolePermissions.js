export const ROLES = Object.freeze({
  ADMIN: "admin",
  USER: "user",
});

export const PAGE_TO_PATH = Object.freeze({
  dashboard: "/dashboard",
  settings: "/settings",
  manual: "/manual",
  camera: "/camera",
  cameraView: "/camera-view",
  connect: "/connect",
  map: "/map",
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: {
    defaultPath: PAGE_TO_PATH.dashboard,
    allowedPaths: new Set([
      PAGE_TO_PATH.dashboard,
      PAGE_TO_PATH.settings,
      PAGE_TO_PATH.manual,
      PAGE_TO_PATH.camera,
      PAGE_TO_PATH.cameraView,
      PAGE_TO_PATH.connect,
      PAGE_TO_PATH.map,
    ]),
    dashboardMenuIds: ["connect", "manual", "cameraView", "map", "settings"],
  },
  [ROLES.USER]: {
    defaultPath: PAGE_TO_PATH.dashboard,
    allowedPaths: new Set([
      PAGE_TO_PATH.dashboard,
      PAGE_TO_PATH.cameraView,
      PAGE_TO_PATH.map,
    ]),
    dashboardMenuIds: ["cameraView", "map"],
  },
});

function toBasePath(path) {
  return String(path || "").split("?")[0].split("#")[0] || "/";
}

export function normalizeRole(role) {
  return role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER;
}

export function getDefaultPathForRole(role) {
  const normalizedRole = normalizeRole(role);
  return ROLE_PERMISSIONS[normalizedRole].defaultPath;
}

export function canAccessPath(role, path) {
  const normalizedRole = normalizeRole(role);
  const basePath = toBasePath(path);
  return ROLE_PERMISSIONS[normalizedRole].allowedPaths.has(basePath);
}

export function getAllowedDashboardMenuIds(role) {
  const normalizedRole = normalizeRole(role);
  return ROLE_PERMISSIONS[normalizedRole].dashboardMenuIds;
}
