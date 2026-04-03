const http    = require('http');
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

const app  = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
            health: '/api/health',
            dbHealth: '/api/db-health'
        }
    });
});

// WebSocket path — chặn HTTP request vào /ws/* để tránh 404 khó hiểu
app.get('/ws/robot', (req, res) => {
    const connected = wsManager.isRobotConnected();
    res.json({
        info: 'Đây là WebSocket endpoint — không thể truy cập bằng HTTP.',
        usage: 'Kết nối bằng: ws://localhost:5000/ws/robot',
        robotConnected: connected,
        status: wsManager.getRobotStatus(),
    });
});

app.get('/ws/dashboard', (req, res) => {
    const connected = wsManager.isRobotConnected();
    res.json({
        info: 'Đây là WebSocket endpoint dành cho Dashboard — không thể truy cập bằng HTTP.',
        usage: 'Kết nối bằng: ws://localhost:5000/ws/dashboard',
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
    server.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`WebSocket    at ws://localhost:${PORT}/ws/robot`);
        console.log(`API Overview: http://localhost:${PORT}/api`);
        console.log(`Health Check: http://localhost:${PORT}/api/health`);
        console.log(`Database Health: http://localhost:${PORT}/api/db-health`);
    });
}

module.exports = { app, server };
