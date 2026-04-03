const express = require('express');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/authController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many login attempts, please try again later.'
    }
});

router.post('/register', AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.get('/me', authMiddleware, AuthController.me);
router.put('/me', authMiddleware, AuthController.updateMe);
router.put('/change-password', authMiddleware, AuthController.changePassword);
router.get('/admin-check', authMiddleware, adminMiddleware, AuthController.adminCheck);

module.exports = router;
