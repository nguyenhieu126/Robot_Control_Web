const express = require('express');
const RobotGpsLogModel = require('../models/robotGpsLogModel');

const router = express.Router();

router.get('/latest', async (req, res) => {
    try {
        const robotId = req.query.robotId || null;
        const latest = await RobotGpsLogModel.getLatest(robotId);
        res.json({ success: true, data: latest });
    } catch (error) {
        console.error('[API] GET /gps/latest error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/history', async (req, res) => {
    try {
        const limitRaw = parseInt(req.query.limit || '200', 10);
        const limit = Number.isNaN(limitRaw) ? 200 : Math.max(1, Math.min(limitRaw, 2000));

        const rows = await RobotGpsLogModel.getHistory({
            limit,
            from: req.query.from || null,
            to: req.query.to || null,
            robotId: req.query.robotId || null,
        });

        res.json({ success: true, data: rows, count: rows.length });
    } catch (error) {
        console.error('[API] GET /gps/history error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
