// User Model
const pool = require('../config/db');

class UserModel {
    // Lấy tất cả users
    static async getAllUsers() {
        const result = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
        return result.rows;
    }

    // Lấy user theo ID
    static async getUserById(id) {
        const result = await pool.query('SELECT id, username, role, created_at FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }

    // Lấy user theo username
    static async getUserByUsername(username) {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return result.rows[0];
    }

    // Tạo user mới
    static async createUser(username, passwordHash, role = 'operator') {
        const result = await pool.query(
            'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
            [username, passwordHash, role]
        );
        return result.rows[0];
    }

    // Update user
    static async updateUser(id, updates) {
        const allowedFields = ['role'];
        const updates_arr = [];
        const values = [id];
        let paramCount = 2;

        for (const key in updates) {
            if (allowedFields.includes(key)) {
                updates_arr.push(`${key} = $${paramCount}`);
                values.push(updates[key]);
                paramCount++;
            }
        }

        if (updates_arr.length === 0) return null;

        const query = `UPDATE users SET ${updates_arr.join(', ')} WHERE id = $1 RETURNING id, username, role, created_at`;
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Xóa user
    static async deleteUser(id) {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        return result.rowCount > 0;
    }
}

module.exports = UserModel;
