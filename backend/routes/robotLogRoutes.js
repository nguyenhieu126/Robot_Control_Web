// Robot Log Routes
const express = require('express');
const router = express.Router();
const RobotLogModel = require('../models/robotLogModel');

// GET /api/logs - Lấy tất cả logs
router.get('/', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const logs = await RobotLogModel.getAllLogs(parseInt(limit), parseInt(offset));
        res.json({ success: true, data: logs, count: logs.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/logs/recent - Lấy logs gần đây
router.get('/recent/:minutes', async (req, res) => {
    try {
        const logs = await RobotLogModel.getRecentLogs(parseInt(req.params.minutes), 100);
        res.json({ success: true, data: logs, count: logs.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/logs/event/:event - Lấy logs theo event
router.get('/event/:event', async (req, res) => {
    try {
        const logs = await RobotLogModel.getLogsByEvent(req.params.event);
        res.json({ success: true, data: logs, count: logs.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/logs/stats - Thống kê
router.get('/stats/all', async (req, res) => {
    try {
        const stats = await RobotLogModel.getLogStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/logs/status - Lấy system status
router.get('/status/system', async (req, res) => {
    try {
        const status = await RobotLogModel.getSystemStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/logs/:id - Lấy log theo ID
router.get('/:id', async (req, res) => {
    try {
        const log = await RobotLogModel.getLogById(req.params.id);
        if (!log) return res.status(404).json({ success: false, error: 'Log not found' });
        res.json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/logs - Tạo log mới
router.post('/', async (req, res) => {
    try {
        const { event, message } = req.body;
        if (!event || !message) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const log = await RobotLogModel.createLog(event, message);
        res.status(201).json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
