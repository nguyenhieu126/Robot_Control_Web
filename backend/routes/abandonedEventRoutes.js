// Abandoned Event Routes
const express = require('express');
const router = express.Router();
const AbandonedEventModel = require('../models/abandonedEventModel');
const {
    authMiddleware,
    adminMiddleware,
    adminOrSecurityMiddleware
} = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET /api/events - Lấy tất cả events
router.get('/', async (req, res) => {
    try {
        const { limit = 100, offset = 0, status = null, from = null, to = null } = req.query;
        const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 100, 500));
        const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);
        const events = await AbandonedEventModel.getAllEvents({
            limit: parsedLimit,
            offset: parsedOffset,
            status,
            from,
            to,
        });
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

router.get('/stats', async (req, res) => {
    try {
        const hoursRaw = parseInt(req.query.hours || '24', 10);
        const hours = Number.isNaN(hoursRaw) ? 24 : Math.max(1, Math.min(hoursRaw, 24 * 30));
        const stats = await AbandonedEventModel.getEventStats(hours);
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
router.put('/:id/status', adminOrSecurityMiddleware, async (req, res) => {
    try {
        const { status, confirmedBy, note } = req.body;
        if (!status) return res.status(400).json({ success: false, error: 'Status required' });

        const normalizedStatus = String(status).trim();
        const allowedStatus = new Set(['pending', 'confirmed', 'false_alarm', 'resolved', 'processing', 'dismissed']);
        if (!allowedStatus.has(normalizedStatus)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const event = await AbandonedEventModel.updateStatus(
            req.params.id,
            normalizedStatus,
            confirmedBy || req.user.sub,
            note || null
        );
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        res.json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/events/:id/resolve - Đánh dấu đã xử lý
router.put('/:id/resolve', adminOrSecurityMiddleware, async (req, res) => {
    try {
        const { note } = req.body;
        const event = await AbandonedEventModel.resolveEvent(req.params.id, note);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        res.json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/events/:id - Xóa event
router.delete('/:id', adminMiddleware, async (req, res) => {
    try {
        const deleted = await AbandonedEventModel.deleteEvent(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        return res.json({ success: true, message: 'Event deleted' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
