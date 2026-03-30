// Manual Command Routes
const express    = require('express');
const router     = express.Router();
const ManualCommandModel = require('../models/manualCommandModel');
const wsManager  = require('../sockets/wsManager');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/commands - Lấy tất cả commands
router.get('/', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const commands = await ManualCommandModel.getAllCommands(parseInt(limit), parseInt(offset));
        res.json({ success: true, data: commands, count: commands.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/commands/pending - Lấy commands chưa thực thi
router.get('/pending/all', async (req, res) => {
    try {
        const commands = await ManualCommandModel.getPendingCommands();
        res.json({ success: true, data: commands, count: commands.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/commands/user/:userId - Lấy commands của user
router.get('/user/:userId', async (req, res) => {
    try {
        const commands = await ManualCommandModel.getCommandsByUserId(req.params.userId);
        res.json({ success: true, data: commands, count: commands.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/commands/stats - Thống kê
router.get('/stats/all', async (req, res) => {
    try {
        const stats = await ManualCommandModel.getCommandStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/commands/:id - Lấy command theo ID
router.get('/:id', async (req, res) => {
    try {
        const command = await ManualCommandModel.getCommandById(req.params.id);
        if (!command) return res.status(404).json({ success: false, error: 'Command not found' });
        res.json({ success: true, data: command });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/commands - Tạo command mới (và push realtime tới ESP32 qua WS)
router.post('/', async (req, res) => {
    try {
        const { userId, command, parameters } = req.body;
        if (!userId || !command) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const newCommand = await ManualCommandModel.createCommand(userId, command, parameters);

        // Thử gửi ngay qua WebSocket — nếu ESP32 đang kết nối, lệnh tới trong <1ms
        const wsSent = wsManager.sendCommandToRobot(newCommand);

        res.status(201).json({
            success: true,
            data: newCommand,
            wsSent,   // true nếu ESP32 đang kết nối và đã nhận qua WS
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/commands/:id/execute - Đánh dấu đã thực thi
router.put('/:id/execute', async (req, res) => {
    try {
        const command = await ManualCommandModel.markExecuted(req.params.id);
        res.json({ success: true, data: command });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/commands/:id - Xóa command
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await ManualCommandModel.deleteCommand(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, error: 'Command not found' });
        res.json({ success: true, message: 'Command deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
