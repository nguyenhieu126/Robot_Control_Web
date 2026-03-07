// Abandoned Event Model
const pool = require('../config/db');

class AbandonedEventModel {
    // Lấy tất cả events
    static async getAllEvents(limit = 100, offset = 0) {
        const result = await pool.query(
            `SELECT ae.*, d.object_type, d.confidence, u.username as confirmed_by_username
             FROM abandoned_events ae
             LEFT JOIN detections d ON ae.detection_id = d.id
             LEFT JOIN users u ON ae.confirmed_by = u.id
             ORDER BY ae.created_at DESC LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows;
    }

    // Lấy event theo ID
    static async getEventById(id) {
        const result = await pool.query(
            `SELECT ae.*, d.object_type, d.confidence, u.username as confirmed_by_username
             FROM abandoned_events ae
             LEFT JOIN detections d ON ae.detection_id = d.id
             LEFT JOIN users u ON ae.confirmed_by = u.id
             WHERE ae.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    // Lấy events theo status
    static async getEventsByStatus(status, limit = 50) {
        const result = await pool.query(
            `SELECT ae.*, d.object_type, d.confidence, u.username as confirmed_by_username
             FROM abandoned_events ae
             LEFT JOIN detections d ON ae.detection_id = d.id
             LEFT JOIN users u ON ae.confirmed_by = u.id
             WHERE ae.status = $1
             ORDER BY ae.created_at DESC LIMIT $2`,
            [status, limit]
        );
        return result.rows;
    }

    // Tạo abandoned event mới
    static async createEvent(detectionId, firstSeen, lastSeen, duration, snapshotPath) {
        const result = await pool.query(
            `INSERT INTO abandoned_events (detection_id, first_seen, last_seen, duration, snapshot_path)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [detectionId, firstSeen, lastSeen, duration, snapshotPath]
        );
        return result.rows[0];
    }

    // Cập nhật status
    static async updateStatus(id, status, confirmedBy = null, note = null) {
        const query = confirmedBy
            ? `UPDATE abandoned_events SET status = $1, confirmed_by = $2, note = $3 WHERE id = $4 RETURNING *`
            : `UPDATE abandoned_events SET status = $1, note = $3 WHERE id = $4 RETURNING *`;
        
        const params = confirmedBy ? [status, confirmedBy, note, id] : [status, null, note, id];
        const result = await pool.query(query, params);
        return result.rows[0];
    }

    // Đánh dấu event đã xử lý
    static async resolveEvent(id, note = null) {
        const result = await pool.query(
            `UPDATE abandoned_events 
             SET status = 'resolved', resolved_at = NOW(), note = $1
             WHERE id = $2
             RETURNING *`,
            [note, id]
        );
        return result.rows[0];
    }

    // Lấy events chưa xử lý
    static async getPendingEvents() {
        const result = await pool.query(
            `SELECT ae.*, d.object_type, d.confidence
             FROM abandoned_events ae
             LEFT JOIN detections d ON ae.detection_id = d.id
             WHERE ae.status IN ('pending', 'confirmed')
             ORDER BY ae.created_at ASC`
        );
        return result.rows;
    }

    // Thống kê events
    static async getEventStats(hours = 24) {
        const result = await pool.query(
            `SELECT status, COUNT(*) as count
             FROM abandoned_events
             WHERE created_at > NOW() - INTERVAL '${hours} hours'
             GROUP BY status`
        );
        return result.rows;
    }
}

module.exports = AbandonedEventModel;
