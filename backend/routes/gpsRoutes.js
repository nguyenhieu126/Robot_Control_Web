const express = require('express');
const RobotGpsLogModel = require('../models/robotGpsLogModel');

const router = express.Router();

router.post('/batch', async (req, res) => {
    try {
        const { gps_log } = req.body;
        
        if (!Array.isArray(gps_log) || gps_log.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'gps_log must be non-empty array' 
            });
        }
        
        if (gps_log.length > 100) {
            return res.status(400).json({ 
                success: false, 
                error: 'gps_log exceeds max 100 entries' 
            });
        }
        
        const robotId = req.query.robotId || 'kali-vega-01';
        let inserted = 0;
        
        for (const entry of gps_log) {
            try {
                await RobotGpsLogModel.createLog({
                    robotId,
                    lat: entry.lat,
                    lng: entry.lng,
                    altitude_m: entry.altitude_m,
                    speed_kmh: entry.speed_kmh,
                    course_deg: entry.course_deg,
                    satellites: entry.satellites,
                    hdop: entry.hdop,
                    fix: entry.fix,
                    source_timestamp: entry.gps_time_utc,
                });
                inserted++;
            } catch (e) {
                console.error('[GPS/batch] Failed to insert entry:', e.message);
            }
        }
        
        res.status(201).json({ 
            success: true, 
            data: { 
                submitted: gps_log.length, 
                inserted 
            } 
        });
    } catch (error) {
        console.error('[API] POST /gps/batch error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

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
