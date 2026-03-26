const express = require('express');
const cameraController = require('../controllers/cameraController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();
const shouldRequireAuth = String(process.env.CAMERA_REQUIRE_AUTH || 'false').toLowerCase() === 'true';

if (shouldRequireAuth) {
    router.get('/health', authMiddleware, cameraController.getHealth);
    router.get('/stream', authMiddleware, cameraController.getStream);
} else {
    router.get('/health', cameraController.getHealth);
    router.get('/stream', cameraController.getStream);
}

module.exports = router;
