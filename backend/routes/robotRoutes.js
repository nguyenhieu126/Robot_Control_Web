/**
 * routes/robotRoutes.js
 * Các endpoint trực tiếp tương tác với ESP32 qua WebSocket.
 */
const express    = require('express');
const router     = express.Router();
const wsManager  = require('../services/wsManager');

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

// POST /api/robot/mode — Yêu cầu ESP32 đổi chế độ
// Body: { "mode": "AUTONOMOUS" | "MANUAL" }
router.post('/mode', (req, res) => {
    const { mode } = req.body;
    if (!mode || !['AUTONOMOUS', 'MANUAL'].includes(mode)) {
        return res.status(400).json({
            success: false,
            error: 'mode phải là "AUTONOMOUS" hoặc "MANUAL"',
        });
    }

    const sent = wsManager.sendModeChange(mode);
    res.json({
        success: true,
        wsSent:  sent,
        message: sent
            ? `Đã gửi yêu cầu đổi mode → ${mode}`
            : 'ESP32 chưa kết nối — lệnh sẽ áp dụng khi ESP32 poll HTTP',
    });
});

module.exports = router;
