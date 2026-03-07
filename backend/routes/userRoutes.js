// User Routes
const express = require('express');
const router = express.Router();
const UserModel = require('../models/userModel');

// GET /api/users - Lấy tất cả users
router.get('/', async (req, res) => {
    try {
        const users = await UserModel.getAllUsers();
        res.json({ success: true, data: users, count: users.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/users/:id - Lấy user theo ID
router.get('/:id', async (req, res) => {
    try {
        const user = await UserModel.getUserById(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/users - Tạo user mới
router.post('/', async (req, res) => {
    try {
        const { username, passwordHash, role } = req.body;
        if (!username || !passwordHash) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const user = await UserModel.createUser(username, passwordHash, role);
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
    try {
        const user = await UserModel.updateUser(req.params.id, req.body);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/users/:id - Xóa user
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await UserModel.deleteUser(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
