-- ===================================
-- ROBOT CONTROL SYSTEM DATABASE
-- ===================================

-- Drop existing tables if exist (for clean reset)
DROP TABLE IF EXISTS robot_logs CASCADE;
DROP TABLE IF EXISTS manual_commands CASCADE;
DROP TABLE IF EXISTS abandoned_events CASCADE;
DROP TABLE IF EXISTS detections CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1️⃣ BẢNG USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator', 'security')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);

-- 2️⃣ BẢNG DETECTIONS (AI phát hiện vật thể)
CREATE TABLE detections (
    id SERIAL PRIMARY KEY,
    object_type VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    image_path TEXT NOT NULL,
    location_x FLOAT NOT NULL,
    location_y FLOAT NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_detections_object_type ON detections(object_type);
CREATE INDEX idx_detections_detected_at ON detections(detected_at);

-- 3️⃣ BẢNG ABANDONED_EVENTS (Sự kiện vật bị bỏ quên)
CREATE TABLE abandoned_events (
    id SERIAL PRIMARY KEY,
    detection_id INT NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'false_alarm', 'resolved')),
    confirmed_by INT REFERENCES users(id) ON DELETE SET NULL,
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    duration INT NOT NULL DEFAULT 0,
    snapshot_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    note TEXT,
    CONSTRAINT check_resolved_time CHECK (resolved_at IS NULL OR resolved_at >= created_at)
);

CREATE INDEX idx_abandoned_events_status ON abandoned_events(status);
CREATE INDEX idx_abandoned_events_detection_id ON abandoned_events(detection_id);
CREATE INDEX idx_abandoned_events_created_at ON abandoned_events(created_at);

-- 4️⃣ BẢNG MANUAL_COMMANDS (Lệnh điều khiển thủ công)
CREATE TABLE manual_commands (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    command VARCHAR(50) NOT NULL CHECK (command IN ('MOVE_FORWARD', 'MOVE_BACKWARD', 'TURN_LEFT', 'TURN_RIGHT', 'STOP', 'GO_TO_POINT', 'EMERGENCY_STOP')),
    parameters TEXT,
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP
);

CREATE INDEX idx_manual_commands_user_id ON manual_commands(user_id);
CREATE INDEX idx_manual_commands_created_at ON manual_commands(created_at);

-- 5️⃣ BẢNG ROBOT_LOGS (Log hoạt động robot)
CREATE TABLE robot_logs (
    id SERIAL PRIMARY KEY,
    event VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_robot_logs_event ON robot_logs(event);
CREATE INDEX idx_robot_logs_created_at ON robot_logs(created_at);

-- ===================================
-- SEED DATA (Dữ liệu mẫu)
-- ===================================

-- Tạo user mẫu
INSERT INTO users (username, password_hash, role) VALUES
    ('admin', '$2b$10$abcdefghijklmnop', 'admin'),
    ('operator', '$2b$10$abcdefghijklmnop', 'operator'),
    ('security', '$2b$10$abcdefghijklmnop', 'security');

-- Tạo detection mẫu
INSERT INTO detections (object_type, confidence, image_path, location_x, location_y) VALUES
    ('backpack', 0.95, '/images/frame_001.jpg', 150.5, 200.3),
    ('bag', 0.87, '/images/frame_002.jpg', 300.2, 250.8),
    ('suitcase', 0.92, '/images/frame_003.jpg', 500.1, 150.4);

-- Tạo abandoned event mẫu
INSERT INTO abandoned_events (detection_id, status, confirmed_by, first_seen, last_seen, duration, snapshot_path, note) VALUES
    (1, 'pending', NULL, NOW() - INTERVAL '5 minutes', NOW(), 300, '/snapshots/event_001.jpg', NULL),
    (2, 'confirmed', 3, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '1 minute', 540, '/snapshots/event_002.jpg', 'Bag found near entrance');

-- Tạo log mẫu
INSERT INTO robot_logs (event, message) VALUES
    ('SYSTEM_START', 'Robot system started'),
    ('AUTO_MODE', 'Autonomous patrol enabled'),
    ('OBJECT_DETECTED', 'Backpack detected at 150, 200'),
    ('ABANDONED_OBJECT', 'Backpack stationary for 300 seconds');
