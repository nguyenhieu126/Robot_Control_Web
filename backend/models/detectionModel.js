// Detection Model
const pool = require('../config/db');

class DetectionModel {
    // Lấy tất cả detections
    static async getAllDetections(limit = 100, offset = 0) {
        const result = await pool.query(
            'SELECT * FROM detections ORDER BY detected_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        return result.rows;
    }

    // Lấy detection theo ID
    static async getDetectionById(id) {
        const result = await pool.query('SELECT * FROM detections WHERE id = $1', [id]);
        return result.rows[0];
    }

    // Lấy detections gần đây
    static async getRecentDetections(minutes = 30, limit = 50) {
        const result = await pool.query(
            `SELECT * FROM detections 
             WHERE detected_at > NOW() - INTERVAL '${minutes} minutes'
             ORDER BY detected_at DESC LIMIT $1`,
            [limit]
        );
        return result.rows;
    }

    // Tạo detection mới
    static async createDetection(objectType, confidence, imagePath, locationX, locationY) {
        const result = await pool.query(
            `INSERT INTO detections (object_type, confidence, image_path, location_x, location_y) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [objectType, confidence, imagePath, locationX, locationY]
        );
        return result.rows[0];
    }

    // Thống kê detections
    static async getDetectionStats(hours = 24) {
        const result = await pool.query(
            `SELECT object_type, COUNT(*) as count, AVG(confidence) as avg_confidence
             FROM detections
             WHERE detected_at > NOW() - INTERVAL '${hours} hours'
             GROUP BY object_type
             ORDER BY count DESC`
        );
        return result.rows;
    }

    // Xóa detections cũ
    static async deleteOldDetections(days = 30) {
        const result = await pool.query(
            `DELETE FROM detections WHERE detected_at < NOW() - INTERVAL '${days} days'`
        );
        return result.rowCount;
    }
}

module.exports = DetectionModel;
