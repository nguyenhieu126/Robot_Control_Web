// User Routes
const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const router = express.Router();
const UserModel = require('../models/userModel');
const {
    authMiddleware,
    adminMiddleware,
    selfOrAdminMiddleware
} = require('../middleware/authMiddleware');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const ALLOWED_ROLES = new Set(['admin', 'user', 'security']);
const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeRole(role) {
    if (typeof role !== 'string') return null;
    const normalized = role.trim().toLowerCase();
    return ALLOWED_ROLES.has(normalized) ? normalized : null;
}

// GET /api/users - Lấy tất cả users
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const roleFilter = normalizeRole(req.query.role);
        if (req.query.role && !roleFilter) {
            return res.status(400).json({ success: false, error: 'Invalid role filter' });
        }

        const users = await UserModel.getAllUsers(roleFilter);
        res.json({ success: true, data: users, count: users.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/users/:id - Lấy user theo ID
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await UserModel.getUserById(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/users - Tạo user mới
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const username = (req.body.username || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();
        const password = req.body.password;
        const role = normalizeRole(req.body.role || 'user');

        if (!USERNAME_REGEX.test(username)) {
            return res.status(400).json({ success: false, error: 'username must be 3-20 characters and contain only letters, numbers, underscore' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ success: false, error: 'invalid email format' });
        }
        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ success: false, error: 'password must be at least 6 characters' });
        }
        if (!role) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }

        const existingByUsername = await UserModel.getUserByUsername(username);
        if (existingByUsername) {
            return res.status(409).json({ success: false, error: 'username already exists' });
        }

        const existingByEmail = await UserModel.getUserByEmail(email);
        if (existingByEmail) {
            return res.status(409).json({ success: false, error: 'email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await UserModel.createUser(username, passwordHash, role, email);
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/users/:id/password - Đổi mật khẩu (self hoặc admin)
router.put('/:id/password', authMiddleware, selfOrAdminMiddleware, async (req, res) => {
    try {
        const targetUserId = Number(req.params.id);
        const requesterUserId = Number(req.user.sub);
        const isSelf = targetUserId === requesterUserId;
        const isAdmin = req.user.role === 'admin';

        if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid user id' });
        }

        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'newPassword must be at least 6 characters' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, error: 'confirmPassword does not match newPassword' });
        }

        const targetUser = await UserModel.getUserByIdWithPassword(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (isSelf) {
            if (!oldPassword) {
                return res.status(400).json({ success: false, error: 'oldPassword is required' });
            }

            const matched = await bcrypt.compare(oldPassword, targetUser.password_hash);
            if (!matched) {
                return res.status(400).json({ success: false, error: 'oldPassword is incorrect' });
            }
        } else if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await UserModel.updatePassword(targetUserId, newPasswordHash);

        return res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/users/:id/reset-password - admin reset mật khẩu
router.post('/:id/reset-password', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const targetUserId = Number(req.params.id);
        if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid user id' });
        }

        const targetUser = await UserModel.getUserById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const tempPassword = `Temp-${crypto.randomBytes(4).toString('hex')}!`;
        const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
        await UserModel.updatePassword(targetUserId, passwordHash);

        return res.json({
            success: true,
            message: 'Password reset successfully',
            data: {
                userId: targetUserId,
                tempPassword
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/users/:id - Update user
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid user id' });
        }

        const updates = {};
        if (typeof req.body.username === 'string') {
            const username = req.body.username.trim();
            if (!USERNAME_REGEX.test(username)) {
                return res.status(400).json({ success: false, error: 'username must be 3-20 characters and contain only letters, numbers, underscore' });
            }

            const existingByUsername = await UserModel.getUserByUsername(username);
            if (existingByUsername && Number(existingByUsername.id) !== userId) {
                return res.status(409).json({ success: false, error: 'username already exists' });
            }
            updates.username = username;
        }

        if (typeof req.body.email === 'string') {
            const email = req.body.email.trim().toLowerCase();
            if (!EMAIL_REGEX.test(email)) {
                return res.status(400).json({ success: false, error: 'invalid email format' });
            }

            const existingByEmail = await UserModel.getUserByEmail(email);
            if (existingByEmail && Number(existingByEmail.id) !== userId) {
                return res.status(409).json({ success: false, error: 'email already exists' });
            }
            updates.email = email;
        }

        if (typeof req.body.role === 'string') {
            const role = normalizeRole(req.body.role);
            if (!role) {
                return res.status(400).json({ success: false, error: 'Invalid role' });
            }
            updates.role = role;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const user = await UserModel.updateUser(userId, updates);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/users/:id - Xóa user
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid user id' });
        }

        if (Number(req.user.sub) === userId) {
            return res.status(400).json({ success: false, error: 'Cannot delete current logged in account' });
        }

        const deleted = await UserModel.deleteUser(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
