/**
 * routes/robotRoutes.js
 * Các endpoint trực tiếp tương tác với ESP32 qua WebSocket.
 */
const express    = require('express');
const router     = express.Router();
const wsManager  = require('../sockets/wsManager');
const RobotStateModel = require('../models/robotStateModel');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const CONFIG_SCHEMA = [
    ['minRunSpeed', 0, 255],
    ['cruiseSpeed', 0, 255],
    ['fastSpeed', 0, 255],
    ['backSpeed', 0, 255],
    ['escapeSpeed', 0, 255],
    ['sharpTurnBoost', 0, 255],
    ['mediumTurnBoost', 0, 255],
    ['turnBoost', 0, 255],
    ['lightTurnBoost', 0, 255],
    ['emergencyDist', 10, 200],
    ['stopDistance', 10, 200],
    ['slowDistance', 10, 200],
    ['turnDistance', 10, 200],
    ['prepareDistance', 10, 200],
    ['sideDangerDist', 10, 200],
    ['backDangerDistance', 10, 200],
    ['directionHysteresis', 1, 50],
];

function validateConfigPayload(rawBody) {
    const payload = {};

    if (!rawBody || typeof rawBody !== 'object') {
        return {
            valid: false,
            error: 'Request body must be a JSON object',
            field: 'body',
        };
    }

    for (const [field, minValue, maxValue] of CONFIG_SCHEMA) {
        const raw = rawBody[field];
        if (raw === undefined || raw === null || raw === '') {
            return {
                valid: false,
                error: `Invalid parameter: ${field} is required`,
                field,
            };
        }

        const num = Number(raw);
        if (!Number.isInteger(num)) {
            return {
                valid: false,
                error: `Invalid parameter: ${field} must be an integer`,
                field,
            };
        }

        if (num < minValue || num > maxValue) {
            return {
                valid: false,
                error: `Invalid parameter: ${field} must be ${minValue}-${maxValue}`,
                field,
            };
        }

        payload[field] = num;
    }

    if (!(payload.emergencyDist <= payload.stopDistance
        && payload.stopDistance <= payload.slowDistance
        && payload.slowDistance <= payload.turnDistance
        && payload.turnDistance <= payload.prepareDistance)) {
        return {
            valid: false,
            error: 'Invalid parameter order: emergencyDist <= stopDistance <= slowDistance <= turnDistance <= prepareDistance',
            field: 'distanceOrder',
        };
    }

    return { valid: true, payload };
}

// GET /api/robot/status — Trạng thái robot hiện tại (cache từ WS heartbeat)
router.get('/status', (req, res) => {
    res.json({
        success:  true,
        data: {
            ...wsManager.getRobotStatus(),
            wsConnected: wsManager.isRobotConnected(),
        },
    });
});

// GET /api/robot/mode — Lấy mode hiện tại từ database (cho ESP32 polling)
router.get('/mode', async (req, res) => {
    try {
        const state = await RobotStateModel.getCurrentMode();
        res.json({
            success: true,
            data: {
                mode: state.mode,
                updated_at: state.updated_at,
            },
        });
    } catch (error) {
        console.error('[API] GET /mode error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// POST /api/robot/mode — Yêu cầu ESP32 đổi chế độ
// Body: { "mode": "AUTONOMOUS" | "MANUAL", "userId": 1 (optional) }
router.post('/mode', authMiddleware, adminMiddleware, async (req, res) => {
    const { mode, userId = null } = req.body;
    if (!mode || !['AUTONOMOUS', 'MANUAL'].includes(mode)) {
        return res.status(400).json({
            success: false,
            error: 'mode phải là "AUTONOMOUS" hoặc "MANUAL"',
        });
    }

    try {
        // 1. Lưu vào database TRƯỚC
        const updated = await RobotStateModel.setMode(mode, userId, 'Mode change via API');
        console.log(`[API] Mode saved to DB: ${mode} at ${updated.updated_at}`);

        // 2. Gửi qua WebSocket (nếu connected)
        const sent = wsManager.sendModeChange(mode);
        
        res.json({
            success: true,
            wsSent:  sent,
            dbSaved: true,
            mode: updated.mode,
            message: sent
                ? `Đã gửi yêu cầu đổi mode → ${mode} (WebSocket + DB)`
                : `Mode đã lưu DB → ${mode}. ESP32 sẽ sync khi kết nối lại.`,
        });
    } catch (error) {
        console.error('[API] POST /mode error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// GET /api/robot/config — Lấy cấu hình runtime từ ESP32 (hoặc cache fallback)
router.get('/config', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const result = await wsManager.requestRobotConfig({ timeoutMs: 5000, cacheTtlMs: 8000 });

        if (!result.success) {
            return res.status(result.status || 503).json({
                success: false,
                error: result.error || 'Unable to fetch config from ESP32',
            });
        }

        return res.json({
            success: true,
            data: result.data,
            cached: Boolean(result.cached),
            stale: Boolean(result.stale),
        });
    } catch (error) {
        console.error('[API] GET /config error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// POST /api/robot/config — Gửi cấu hình mới xuống ESP32 và chờ ACK
router.post('/config', authMiddleware, adminMiddleware, async (req, res) => {
    const validation = validateConfigPayload(req.body);
    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            error: validation.error,
            field: validation.field,
        });
    }

    try {
        const result = await wsManager.sendConfigUpdate(validation.payload, { timeoutMs: 5000 });
        if (!result.success) {
            return res.status(result.status || 502).json({
                success: false,
                error: result.error || 'Failed to apply config',
            });
        }

        return res.json({
            success: true,
            message: 'Config update command sent to ESP32',
            data: {
                configId: `cfg-${Date.now()}`,
                sentAt: new Date().toISOString(),
                ack: result.data || null,
            },
        });
    } catch (error) {
        console.error('[API] POST /config error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// POST /api/robot/config/reset — Reset về default Config.h trên ESP32
router.post('/config/reset', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const result = await wsManager.sendConfigReset({ timeoutMs: 5000 });
        if (!result.success) {
            return res.status(result.status || 502).json({
                success: false,
                error: result.error || 'Failed to reset config',
            });
        }

        return res.json({
            success: true,
            message: 'Config reset command sent to ESP32',
            data: {
                sentAt: new Date().toISOString(),
                ack: result.data || null,
            },
        });
    } catch (error) {
        console.error('[API] POST /config/reset error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;
