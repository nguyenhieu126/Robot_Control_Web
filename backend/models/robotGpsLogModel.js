const pool = require('../config/db');

class RobotGpsLogModel {
    static async createLog(payload) {
        const {
            robotId = 'kali-vega-01',
            lat,
            lng,
            altitude_m = null,
            speed_kmh = null,
            course_deg = null,
            satellites = null,
            hdop = null,
            fix = true,
            source_timestamp = null,
        } = payload;

        const result = await pool.query(
            `INSERT INTO robot_gps_logs
            (robot_id, lat, lng, altitude_m, speed_kmh, course_deg, satellites, hdop, fix, source_timestamp)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING *`,
            [robotId, lat, lng, altitude_m, speed_kmh, course_deg, satellites, hdop, fix, source_timestamp]
        );

        return result.rows[0];
    }

    static async getLatest(robotId = null) {
        const query = robotId
            ? 'SELECT * FROM robot_gps_logs WHERE robot_id = $1 ORDER BY received_at DESC LIMIT 1'
            : 'SELECT * FROM robot_gps_logs ORDER BY received_at DESC LIMIT 1';
        const values = robotId ? [robotId] : [];

        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }

    static async getHistory({ limit = 200, from = null, to = null, robotId = null }) {
        const where = [];
        const values = [];

        if (robotId) {
            values.push(robotId);
            where.push(`robot_id = $${values.length}`);
        }
        if (from) {
            values.push(from);
            where.push(`received_at >= $${values.length}`);
        }
        if (to) {
            values.push(to);
            where.push(`received_at <= $${values.length}`);
        }

        values.push(limit);
        const limitSlot = values.length;

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        const sql = `
            SELECT *
            FROM robot_gps_logs
            ${whereClause}
            ORDER BY received_at DESC
            LIMIT $${limitSlot}
        `;

        const result = await pool.query(sql, values);
        return result.rows;
    }
}

module.exports = RobotGpsLogModel;
