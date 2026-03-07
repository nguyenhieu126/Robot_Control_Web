// Detection Routes
const express = require('express');
const router = express.Router();
const DetectionModel = require('../models/detectionModel');

// GET /api/detections - Lấy tất cả detections
router.get('/', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const detections = await DetectionModel.getAllDetections(parseInt(limit), parseInt(offset));
        res.json({ success: true, data: detections, count: detections.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/detections/recent - Lấy detections gần đây
router.get('/recent/:minutes', async (req, res) => {
    try {
        const detections = await DetectionModel.getRecentDetections(parseInt(req.params.minutes), 50);
        res.json({ success: true, data: detections, count: detections.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/detections/stats - Thống kê
router.get('/stats/all', async (req, res) => {
    try {
        const stats = await DetectionModel.getDetectionStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/detections/:id - Lấy detection theo ID
router.get('/:id', async (req, res) => {
    try {
        const detection = await DetectionModel.getDetectionById(req.params.id);
        if (!detection) return res.status(404).json({ success: false, error: 'Detection not found' });
        res.json({ success: true, data: detection });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/detections - Tạo detection mới
router.post('/', async (req, res) => {
    try {
        const { objectType, confidence, imagePath, locationX, locationY } = req.body;
        if (!objectType || confidence === undefined || !imagePath || locationX === undefined || locationY === undefined) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const detection = await DetectionModel.createDetection(objectType, confidence, imagePath, locationX, locationY);
        res.status(201).json({ success: true, data: detection });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
