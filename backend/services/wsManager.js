/**
 * services/wsManager.js
 * Quản lý 2 WebSocket path:
 *   /ws/robot     — ESP32 kết nối (bidirectional, realtime control)
 *   /ws/dashboard — Browser kết nối (nhận status, gửi DIRECT_COMMAND)
 *
 * Luồng:
 *   Browser → /ws/dashboard DIRECT_COMMAND → forward → ESP32 /ws/robot   (realtime, no DB)
 *   ESP32   → /ws/robot STATUS             → broadcast → tất cả /ws/dashboard clients
 */

const WebSocket = require('ws');

// ── State ──────────────────────────────────────────────────────
let robotWss     = null;
let dashboardWss = null;
/** @type {WebSocket|null} */
let robotClient  = null;
/** @type {Set<WebSocket>} */
const dashboardClients = new Set();

let robotStatus = {
  connected: false,
  device:    null,
  firmware:  null,
  mode:      'UNKNOWN',
  state:     -1,
  rssi:      null,
  uptime:    0,
  lastSeen:  null,
  front:     null,
  left:      null,
  right:     null,
  back:      null,
};

// ══════════════════════════════════════════════════════════════
//  Init — gắn vào HTTP server của Express
// ══════════════════════════════════════════════════════════════
function init(server) {

  // ── Tạo WebSocket servers ở noServer mode ─────────────────
  robotWss     = new WebSocket.Server({ noServer: true });
  dashboardWss = new WebSocket.Server({ noServer: true });

  // ── Handle HTTP upgrade request và route theo path ────────
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;

    if (pathname === '/ws/robot') {
      robotWss.handleUpgrade(request, socket, head, (ws) => {
        robotWss.emit('connection', ws, request);
      });
    } else if (pathname === '/ws/dashboard') {
      dashboardWss.handleUpgrade(request, socket, head, (ws) => {
        dashboardWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // ── /ws/robot — ESP32 ──────────────────────────────────────
  robotWss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[WS/robot] ESP32 connected from ${ip}`);

    if (robotClient && robotClient !== ws) {
      console.log('[WS/robot] Đóng kết nối ESP32 cũ');
      robotClient.close();
    }
    robotClient = ws;
    robotStatus.connected = true;
    robotStatus.lastSeen  = new Date().toISOString();

    _send(ws, { type: 'WELCOME', data: { message: 'Robot Control Server v1.0' } });
    _broadcastDashboard({ type: 'ROBOT_CONNECTED', data: { connected: true } });

    ws.on('message', (raw) => {
      try { _handleRobotMsg(ws, JSON.parse(raw.toString())); }
      catch (e) { console.error('[WS/robot] Parse error:', e.message); }
    });

    ws.on('close', () => {
      if (robotClient === ws) {
        robotClient = null;
        robotStatus.connected = false;
      }
      console.log('[WS/robot] ESP32 disconnected');
      _broadcastDashboard({ type: 'ROBOT_CONNECTED', data: { connected: false } });
    });

    ws.on('error', (e) => console.error('[WS/robot] Error:', e.message));
  });

  // ── /ws/dashboard — Browser ────────────────────────────────

  dashboardWss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[WS/dashboard] Browser connected from ${ip}`);
    dashboardClients.add(ws);

    // Gửi status hiện tại ngay khi kết nối
    _send(ws, {
      type: 'STATUS',
      data: { ...robotStatus, robotConnected: isRobotConnected() },
    });

    let lastCommandTime = 0;
    const COMMAND_INTERVAL = 100;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'DIRECT_COMMAND') {
          const now = Date.now();

          if (now - lastCommandTime < COMMAND_INTERVAL) {
            // console.log('[WS/dashboard] Command too frequent, skipping');
            return;
          }
          lastCommandTime = now;

          // Hỗ trợ nhiều shape để tránh lỗi từ client cũ.
          const direct = msg.data ?? msg;
          const command = direct?.command;
          const parameters = (direct?.parameters ?? null);

          if (!command) {
            _send(ws, {
              type: 'DIRECT_COMMAND_ACK',
              data: { success: false, error: 'Thiếu command trong DIRECT_COMMAND' },
            });
            return;
          }

          if (isRobotConnected()) {
            _send(robotClient, {
              type: 'COMMAND',
              data: { id: -1, command, parameters }, // id=-1 => realtime command, không markExecuted
            });
          } else {
            _send(ws, {
              type: 'DIRECT_COMMAND_ACK',
              data: { success: false, error: 'Robot chưa kết nối' },
            });
          }
          return;
        }

        console.log(`[WS/dashboard] Unknown type: ${msg.type}`);
      } catch (e) {
        console.error('[WS/dashboard] Parse error:', e.message);
      }
    });

    ws.on('close', () => {
      dashboardClients.delete(ws);
      console.log('[WS/dashboard] Browser disconnected');
    });

    ws.on('error', () => dashboardClients.delete(ws));
  });

  console.log('[WS] /ws/robot     — ESP32 endpoint ready');
  console.log('[WS] /ws/dashboard — Browser endpoint ready');
}

// ══════════════════════════════════════════════════════════════
//  Xử lý message từ ESP32
// ══════════════════════════════════════════════════════════════
function _handleRobotMsg(ws, msg) {
  const { type, data } = msg;

  switch (type) {
    case 'REGISTER':
      console.log('[WS/robot] ESP32 registered:', data);
      robotStatus = {
        ...robotStatus,
        device: data?.device ?? robotStatus.device,
        firmware: data?.firmware ?? robotStatus.firmware,
        lastSeen: new Date().toISOString(),
      };
      break;

    case 'STATUS':
      if (data) {
        robotStatus = {
          ...robotStatus,
          mode:     data.mode    ?? robotStatus.mode,
          state:    data.state   ?? robotStatus.state,
          rssi:     data.rssi    ?? robotStatus.rssi,
          uptime:   data.uptime  ?? robotStatus.uptime,
          front:    data.front   ?? robotStatus.front,
          left:     data.left    ?? robotStatus.left,
          right:    data.right   ?? robotStatus.right,
          back:     data.back    ?? robotStatus.back,
          lastSeen: new Date().toISOString(),
        };
      }
      _broadcastDashboard({
        type: 'STATUS',
        data: { ...robotStatus, robotConnected: true },
      });
      break;

    case 'PING':
      _send(ws, { type: 'PONG' });
      break;

    case 'PONG':
      break;

    default:
      console.log(`[WS/robot] Unknown type: ${type}`);
  }
}

// ══════════════════════════════════════════════════════════════
//  Public API
// ══════════════════════════════════════════════════════════════

/** Gửi lệnh đến ESP32 (dùng từ routes sau khi lưu DB) */
function sendCommandToRobot(commandObj) {
  if (!isRobotConnected()) return false;
  _send(robotClient, { type: 'COMMAND', data: commandObj });
  console.log(`[WS] Sent command id=${commandObj.id} → ESP32`);
  return true;
}

/** Yêu cầu ESP32 đổi mode */
function sendModeChange(mode) {
  if (!isRobotConnected()) return false;
  _send(robotClient, { type: 'MODE_CHANGE', data: { mode } });
  console.log(`[WS] Mode change → ${mode}`);
  return true;
}

function isRobotConnected() {
  return robotClient !== null && robotClient.readyState === WebSocket.OPEN;
}

function getRobotStatus() {
  return { ...robotStatus, robotConnected: isRobotConnected() };
}

// ── Helpers ────────────────────────────────────────────────────
function _send(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function _broadcastDashboard(payload) {
  const str = JSON.stringify(payload);
  dashboardClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(str);
  });
}

module.exports = { init, sendCommandToRobot, sendModeChange, isRobotConnected, getRobotStatus };
