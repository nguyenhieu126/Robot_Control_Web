-- ===================================
-- GPS TRACKING LOGS
-- ===================================

CREATE TABLE IF NOT EXISTS robot_gps_logs (
    id BIGSERIAL PRIMARY KEY,
    robot_id VARCHAR(64) NOT NULL DEFAULT 'kali-vega-01',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    altitude_m REAL,
    speed_kmh REAL,
    course_deg REAL,
    satellites INT,
    hdop REAL,
    fix BOOLEAN NOT NULL DEFAULT TRUE,
    source_timestamp TIMESTAMPTZ,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_robot_gps_logs_received_at
    ON robot_gps_logs (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_robot_gps_logs_robot_id_received_at
    ON robot_gps_logs (robot_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_robot_gps_logs_lat_lng
    ON robot_gps_logs (lat, lng);