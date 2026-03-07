// Abandoned Event Routes
const express = require('express');
const router = express.Router();
const AbandonedEventModel = require('../models/abandonedEventModel');

// GET /api/events - Lấy tất cả events
router.get('/', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const events = await AbandonedEventModel.getAllEvents(parseInt(limit), parseInt(offset));
        res.json({ success: true, data: events, count: events.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/events/status/:status - Lấy events theo status
router.get('/status/:status', async (req, res) => {
    try {
        const events = await AbandonedEventModel.getEventsByStatus(req.params.status);
        res.json({ success: true, data: events, count: events.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/events/pending - Lấy events chưa xử lý
router.get('/pending/all', async (req, res) => {
    try {
        const events = await AbandonedEventModel.getPendingEvents();
        res.json({ success: true, data: events, count: events.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/events/stats - Thống kê
router.get('/stats/all', async (req, res) => {
    try {
        const stats = await AbandonedEventModel.getEventStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/events/:id - Lấy event theo ID
router.get('/:id', async (req, res) => {
    try {
        const event = await AbandonedEventModel.getEventById(req.params.id);
        if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
        res.json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/events - Tạo event mới
router.post('/', async (req, res) => {
    try {
        const { detectionId, firstSeen, lastSeen, duration, snapshotPath } = req.body;
        if (!detectionId || !firstSeen || !lastSeen) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const event = await AbandonedEventModel.createEvent(detectionId, firstSeen, lastSeen, duration, snapshotPath);
        res.status(201).json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/events/:id/status - Cập nhật status
router.put('/:id/status', async (req, res) => {
    try {
        const { status, confirmedBy, note } = req.body;
        if (!status) return res.status(400).json({ success: false, error: 'Status required' });
        const event = await AbandonedEventModel.updateStatus(req.params.id, status, confirmedBy, note);
        res.json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/events/:id/resolve - Đánh dấu đã xử lý
router.put('/:id/resolve', async (req, res) => {
    try {
        const { note } = req.body;
        const event = await AbandonedEventModel.resolveEvent(req.params.id, note);
        res.json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
