// Abandoned Event Model
const pool = require('../config/db');

class AbandonedEventModel {
    // Lấy tất cả events
    static async getAllEvents({ limit = 100, offset = 0, status = null, from = null, to = null } = {}) {
        const where = [];
        const values = [];

        if (status) {
            values.push(status);
            where.push(`ae.status = $${values.length}`);
        }

        if (from) {
            values.push(from);
            where.push(`ae.created_at >= $${values.length}`);
        }

        if (to) {
            values.push(to);
            where.push(`ae.created_at <= $${values.length}`);
        }

        values.push(limit);
        const limitSlot = values.length;
        values.push(offset);
        const offsetSlot = values.length;

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const result = await pool.query(
            `SELECT ae.*, d.object_type, d.confidence, d.location_x, d.location_y, d.image_path AS detection_image_path, u.username as confirmed_by_username
             FROM abandoned_events ae
             LEFT JOIN detections d ON ae.detection_id = d.id
             LEFT JOIN users u ON ae.confirmed_by = u.id
             ${whereClause}
             ORDER BY ae.created_at DESC
             LIMIT $${limitSlot} OFFSET $${offsetSlot}`,
            values
        );
        return result.rows;
    }

    // Lấy event theo ID
    static async getEventById(id) {
        const result = await pool.query(
            `SELECT ae.*, d.object_type, d.confidence, d.location_x, d.location_y, d.image_path AS detection_image_path, u.username as confirmed_by_username
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
        return this.getAllEvents({ status, limit, offset: 0 });
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
        const hasConfirmedBy = confirmedBy !== null && confirmedBy !== undefined && String(confirmedBy).trim() !== '';
        const updates = [
            'status = $1::VARCHAR',
            'note = $2',
            "resolved_at = CASE WHEN $1::VARCHAR = 'resolved' THEN NOW() ELSE resolved_at END"
        ];
        const params = [status, note];

        if (hasConfirmedBy) {
            params.push(Number(confirmedBy));
            updates.push(`confirmed_by = $${params.length}`);
        }

        params.push(Number(id));

        const query = `UPDATE abandoned_events
               SET ${updates.join(',\n                   ')}
               WHERE id = $${params.length}
               RETURNING *`;

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
            `SELECT ae.*, d.object_type, d.confidence, d.location_x, d.location_y, d.image_path AS detection_image_path
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
             WHERE created_at > NOW() - ($1::INT * INTERVAL '1 hour')
             GROUP BY status`,
            [hours]
        );
        return result.rows;
    }

    static async deleteEvent(id) {
        const result = await pool.query('DELETE FROM abandoned_events WHERE id = $1 RETURNING id', [id]);
        return result.rowCount > 0;
    }
}

module.exports = AbandonedEventModel;
