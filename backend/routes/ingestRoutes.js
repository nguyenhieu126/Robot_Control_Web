const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const DetectionModel = require('../models/detectionModel');
const AbandonedEventModel = require('../models/abandonedEventModel');
const wsManager = require('../sockets/wsManager');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'jetson');
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
]);

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ext && ext.length <= 10 ? ext : '.jpg';
        const random = Math.random().toString(36).slice(2, 10);
        cb(null, `${file.fieldname}_${Date.now()}_${random}${safeExt}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (!allowedMimeTypes.has(file.mimetype)) {
            cb(new Error('Invalid file type. Only jpg, jpeg, png, webp are allowed.'));
            return;
        }

        cb(null, true);
    },
});

function toFiniteNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function toIsoTimestamp(value) {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
}

function formatDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? value : dt.toISOString();
}

router.post('/abandoned-alert', (req, res) => {
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'snapshot', maxCount: 1 },
    ])(req, res, async (uploadError) => {
        if (uploadError) {
            const isMulterError = uploadError instanceof multer.MulterError;
            if (isMulterError && uploadError.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: 'File too large. Max size is 5MB per file.',
                });
            }

            return res.status(400).json({
                success: false,
                error: uploadError.message || 'Invalid multipart/form-data payload',
            });
        }

        try {
            const {
                objectType,
                confidence,
                locationX,
                locationY,
                firstSeen,
                lastSeen,
                duration,
            } = req.body;

            const imageFile = req.files?.image?.[0] || null;
            const snapshotFile = req.files?.snapshot?.[0] || null;

            if (!objectType || confidence === undefined || locationX === undefined || locationY === undefined || !firstSeen || !lastSeen || !imageFile) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields or image file',
                });
            }

            const parsedConfidence = toFiniteNumber(confidence);
            const parsedLocationX = toFiniteNumber(locationX);
            const parsedLocationY = toFiniteNumber(locationY);
            const firstSeenIso = toIsoTimestamp(firstSeen);
            const lastSeenIso = toIsoTimestamp(lastSeen);

            if (parsedConfidence === null || parsedConfidence < 0 || parsedConfidence > 1) {
                return res.status(400).json({
                    success: false,
                    error: 'confidence must be a number between 0 and 1',
                });
            }

            if (parsedLocationX === null || parsedLocationY === null) {
                return res.status(400).json({
                    success: false,
                    error: 'locationX and locationY must be valid numbers',
                });
            }

            if (!firstSeenIso || !lastSeenIso) {
                return res.status(400).json({
                    success: false,
                    error: 'firstSeen and lastSeen must be valid datetime values',
                });
            }

            const parsedDuration = duration === undefined || duration === null || duration === ''
                ? 0
                : Number.parseInt(duration, 10);

            if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'duration must be a non-negative integer',
                });
            }

            const normalizedObjectType = String(objectType).trim();
            const imagePath = `/uploads/jetson/${imageFile.filename}`;
            const snapshotPath = snapshotFile
                ? `/uploads/jetson/${snapshotFile.filename}`
                : imagePath;

            const detection = await DetectionModel.createDetection(
                normalizedObjectType,
                parsedConfidence,
                imagePath,
                parsedLocationX,
                parsedLocationY
            );

            const event = await AbandonedEventModel.createEvent(
                detection.id,
                firstSeenIso,
                lastSeenIso,
                parsedDuration,
                snapshotPath
            );

            const alertData = {
                eventId: event.id,
                objectType: detection.object_type || normalizedObjectType,
                confidence: Number(detection.confidence ?? parsedConfidence),
                imagePath,
                snapshotPath,
                status: event.status || 'pending',
                createdAt: formatDate(event.created_at) || new Date().toISOString(),
            };

            const wsSent = wsManager.sendDashboardEvent({
                type: 'ABANDONED_ALERT',
                data: alertData,
            });

            console.log(
                `[INGEST] saved abandoned alert eventId=${event.id} objectType=${alertData.objectType} wsSent=${wsSent}`
            );

            return res.status(201).json({
                success: true,
                data: {
                    detection: {
                        id: detection.id,
                        objectType: detection.object_type,
                        confidence: Number(detection.confidence),
                        imagePath: detection.image_path,
                        locationX: Number(detection.location_x),
                        locationY: Number(detection.location_y),
                    },
                    event: {
                        id: event.id,
                        detectionId: event.detection_id,
                        status: event.status,
                        firstSeen: formatDate(event.first_seen),
                        lastSeen: formatDate(event.last_seen),
                        duration: event.duration,
                        snapshotPath: event.snapshot_path,
                        createdAt: formatDate(event.created_at),
                    },
                },
            });
        } catch (error) {
            console.error('[INGEST] Failed to process abandoned alert:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Internal server error',
            });
        }
    });
});

module.exports = router;
