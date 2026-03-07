// Manual Command Model
const pool = require('../config/db');

class ManualCommandModel {
    // Lấy tất cả commands
    static async getAllCommands(limit = 100, offset = 0) {
        const result = await pool.query(
            `SELECT mc.*, u.username FROM manual_commands mc
             LEFT JOIN users u ON mc.user_id = u.id
             ORDER BY mc.created_at DESC LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows;
    }

    // Lấy command theo ID
    static async getCommandById(id) {
        const result = await pool.query(
            `SELECT mc.*, u.username FROM manual_commands mc
             LEFT JOIN users u ON mc.user_id = u.id
             WHERE mc.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    // Lấy commands chưa thực thi
    static async getPendingCommands() {
        const result = await pool.query(
            `SELECT mc.*, u.username FROM manual_commands mc
             LEFT JOIN users u ON mc.user_id = u.id
             WHERE mc.executed = FALSE
             ORDER BY mc.created_at ASC`
        );
        return result.rows;
    }

    // Lấy commands của user
    static async getCommandsByUserId(userId, limit = 50) {
        const result = await pool.query(
            `SELECT mc.*, u.username FROM manual_commands mc
             LEFT JOIN users u ON mc.user_id = u.id
             WHERE mc.user_id = $1
             ORDER BY mc.created_at DESC LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    }

    // Tạo command mới
    static async createCommand(userId, command, parameters = null) {
        const result = await pool.query(
            `INSERT INTO manual_commands (user_id, command, parameters)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [userId, command, parameters]
        );
        return result.rows[0];
    }

    // Đánh dấu command đã thực thi
    static async markExecuted(id) {
        const result = await pool.query(
            `UPDATE manual_commands
             SET executed = TRUE, executed_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [id]
        );
        return result.rows[0];
    }

    // Xóa command
    static async deleteCommand(id) {
        const result = await pool.query(
            'DELETE FROM manual_commands WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rowCount > 0;
    }

    // Thống kê commands
    static async getCommandStats(hours = 24) {
        const result = await pool.query(
            `SELECT command, COUNT(*) as total, SUM(CASE WHEN executed = TRUE THEN 1 ELSE 0 END) as executed
             FROM manual_commands
             WHERE created_at > NOW() - INTERVAL '${hours} hours'
             GROUP BY command`
        );
        return result.rows;
    }
}

module.exports = ManualCommandModel;
