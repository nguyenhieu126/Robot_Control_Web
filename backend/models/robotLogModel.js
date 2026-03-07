// Robot Log Model
const pool = require('../config/db');

class RobotLogModel {
    // Lấy tất cả logs
    static async getAllLogs(limit = 100, offset = 0) {
        const result = await pool.query(
            'SELECT * FROM robot_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        return result.rows;
    }

    // Lấy log theo ID
    static async getLogById(id) {
        const result = await pool.query(
            'SELECT * FROM robot_logs WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    // Lấy logs gần đây
    static async getRecentLogs(minutes = 60, limit = 100) {
        const result = await pool.query(
            `SELECT * FROM robot_logs
             WHERE created_at > NOW() - INTERVAL '${minutes} minutes'
             ORDER BY created_at DESC LIMIT $1`,
            [limit]
        );
        return result.rows;
    }

    // Lấy logs theo event
    static async getLogsByEvent(event, limit = 50) {
        const result = await pool.query(
            `SELECT * FROM robot_logs
             WHERE event = $1
             ORDER BY created_at DESC LIMIT $2`,
            [event, limit]
        );
        return result.rows;
    }

    // Tạo log mới
    static async createLog(event, message) {
        const result = await pool.query(
            `INSERT INTO robot_logs (event, message)
             VALUES ($1, $2)
             RETURNING *`,
            [event, message]
        );
        return result.rows[0];
    }

    // Thống kê logs
    static async getLogStats(hours = 24) {
        const result = await pool.query(
            `SELECT event, COUNT(*) as count
             FROM robot_logs
             WHERE created_at > NOW() - INTERVAL '${hours} hours'
             GROUP BY event
             ORDER BY count DESC`
        );
        return result.rows;
    }

    // Xóa logs cũ
    static async deleteOldLogs(days = 30) {
        const result = await pool.query(
            `DELETE FROM robot_logs WHERE created_at < NOW() - INTERVAL '${days} days'`
        );
        return result.rowCount;
    }

    // Lấy system status
    static async getSystemStatus() {
        const result = await pool.query(
            `SELECT event, message, created_at FROM robot_logs
             WHERE event IN ('SYSTEM_START', 'AUTO_MODE', 'MANUAL_MODE', 'SYSTEM_STOP')
             ORDER BY created_at DESC LIMIT 1`
        );
        return result.rows[0];
    }
}

module.exports = RobotLogModel;
