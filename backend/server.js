const http    = require('http');
const path    = require('path');
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const pool      = require('./config/db');
const wsManager = require('./sockets/wsManager');

// Import routes
const userRoutes          = require('./routes/userRoutes');
const authRoutes          = require('./routes/authRoutes');
const detectionRoutes     = require('./routes/detectionRoutes');
const abandonedEventRoutes = require('./routes/abandonedEventRoutes');
const manualCommandRoutes = require('./routes/manualCommandRoutes');
const robotLogRoutes      = require('./routes/robotLogRoutes');
const robotRoutes         = require('./routes/robotRoutes');
const cameraRoutes        = require('./routes/cameraRoutes');
const gpsRoutes           = require('./routes/gpsRoutes');
const ingestRoutes        = require('./routes/ingestRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin(origin, callback) {
        // Allow server-to-server requests (curl/postman) without origin header.
        if (!origin) {
            return callback(null, true);
        }

        // Keep previous permissive behavior when no allow-list is configured.
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logger: in console for every incoming HTTP request
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
            `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - ${req.ip}`
        );
    });

    next();
});

// API Routes
app.use('/api/users',    userRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/detections', detectionRoutes);
app.use('/api/events',   abandonedEventRoutes);
app.use('/api/commands', manualCommandRoutes);
app.use('/api/logs',     robotLogRoutes);
app.use('/api/robot',    robotRoutes);
app.use('/api/camera',   cameraRoutes);
app.use('/api/gps',      gpsRoutes);
app.use('/api/ingest',   ingestRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Database health check
app.get('/api/db-health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            status: 'OK',
            database: 'Connected',
            timestamp: result.rows[0].now
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            database: 'Disconnected',
            error: error.message
        });
    }
});

// API overview
app.get('/api', (req, res) => {
    res.json({
        name: 'Robot Control System API',
        version: '1.0.0',
        endpoints: {
            users: '/api/users',
            auth: '/api/auth',
            detections: '/api/detections',
            events: '/api/events',
            commands: '/api/commands',
            logs: '/api/logs',
            gps: '/api/gps',
            camera: '/api/camera',
            ingest: '/api/ingest',
            health: '/api/health',
            dbHealth: '/api/db-health'
        }
    });
});

// WebSocket path — chặn HTTP request vào /ws/* để tránh 404 khó hiểu
app.get('/ws/robot', (req, res) => {
    const connected = wsManager.isRobotConnected();
    const protocol = (req.headers['x-forwarded-proto'] || req.protocol) === 'https' ? 'wss' : 'ws';
    const host = req.headers.host || `localhost:${PORT}`;
    res.json({
        info: 'Đây là WebSocket endpoint — không thể truy cập bằng HTTP.',
        usage: `Kết nối bằng: ${protocol}://${host}/ws/robot`,
        robotConnected: connected,
        status: wsManager.getRobotStatus(),
    });
});

app.get('/ws/dashboard', (req, res) => {
    const connected = wsManager.isRobotConnected();
    const protocol = (req.headers['x-forwarded-proto'] || req.protocol) === 'https' ? 'wss' : 'ws';
    const host = req.headers.host || `localhost:${PORT}`;
    res.json({
        info: 'Đây là WebSocket endpoint dành cho Dashboard — không thể truy cập bằng HTTP.',
        usage: `Kết nối bằng: ${protocol}://${host}/ws/dashboard`,
        robotConnected: connected,
        status: wsManager.getRobotStatus(),
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// Start server — dùng http.createServer để gắn WebSocket cùng port
const server = http.createServer(app);

// Khởi tạo WebSocket server tại ws://HOST:PORT/ws/robot
wsManager.init(server);

if (require.main === module) {
    server.listen(PORT, HOST, () => {
        const localHttp = `http://localhost:${PORT}`;
        const localWs = `ws://localhost:${PORT}/ws/robot`;

        console.log(`Server listening on ${HOST}:${PORT}`);
        console.log(`Local API     : ${localHttp}`);
        console.log(`Local WebSocket: ${localWs}`);
        console.log(`API Overview  : ${localHttp}/api`);
        console.log(`Health Check  : ${localHttp}/api/health`);
        console.log(`Database Health: ${localHttp}/api/db-health`);

        if (allowedOrigins.length > 0) {
            console.log(`CORS allow-list: ${allowedOrigins.join(', ')}`);
        } else {
            console.log('CORS allow-list: not set (allowing all origins)');
        }
    });
}

module.exports = { app, server };
