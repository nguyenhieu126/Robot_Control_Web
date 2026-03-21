-- ===================================
-- ADD ROBOT STATE TABLE FOR MODE PERSISTENCE
-- ===================================

-- Bảng lưu trạng thái robot (mode, last seen, etc.)
CREATE TABLE IF NOT EXISTS robot_state (
    id SERIAL PRIMARY KEY,
    mode VARCHAR(20) NOT NULL DEFAULT 'AUTONOMOUS' CHECK (mode IN ('AUTONOMOUS', 'MANUAL')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    note TEXT
);

-- Insert default state
INSERT INTO robot_state (mode, note) 
VALUES ('AUTONOMOUS', 'Initial state')
ON CONFLICT DO NOTHING;

-- Chỉ giữ 1 row (singleton pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_robot_state_singleton ON robot_state((id IS NOT NULL));

COMMENT ON TABLE robot_state IS 'Singleton table storing current robot operation mode';
