/**
 * routes/robotRoutes.js
 * Các endpoint trực tiếp tương tác với ESP32 qua WebSocket.
 */
const express    = require('express');
const router     = express.Router();
const wsManager  = require('../sockets/wsManager');
const RobotStateModel = require('../models/robotStateModel');

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
router.post('/mode', async (req, res) => {
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

module.exports = router;
