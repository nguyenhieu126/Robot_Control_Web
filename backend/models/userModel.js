// User Model
const pool = require('../config/db');

class UserModel {
    // Lấy tất cả users
    static async getAllUsers(role = null) {
        const hasRoleFilter = typeof role === 'string' && role.trim().length > 0;
        const result = hasRoleFilter
            ? await pool.query(
                'SELECT id, username, email, role, created_at, updated_at FROM users WHERE role = $1 ORDER BY created_at DESC',
                [role.trim()]
            )
            : await pool.query('SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY created_at DESC');
        return result.rows;
    }

    // Lấy user theo ID
    static async getUserById(id) {
        const result = await pool.query('SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }

    // Lấy user theo ID (bao gồm password hash)
    static async getUserByIdWithPassword(id) {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }

    // Lấy user theo username
    static async getUserByUsername(username) {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return result.rows[0];
    }

    // Lấy user theo email
    static async getUserByEmail(email) {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    }

    // Lấy user theo email hoặc username
    static async getUserByEmailOrUsername(identifier) {
        const result = await pool.query(
            'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1',
            [identifier]
        );
        return result.rows[0];
    }

    // Tạo user mới
    static async createUser(username, passwordHash, role = 'user', email = null) {
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at, updated_at',
            [username, email, passwordHash, role]
        );
        return result.rows[0];
    }

    // Update user
    static async updateUser(id, updates) {
        const allowedFields = ['role', 'email', 'username'];
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

        updates_arr.push('updated_at = CURRENT_TIMESTAMP');

        const query = `UPDATE users SET ${updates_arr.join(', ')} WHERE id = $1 RETURNING id, username, email, role, created_at, updated_at`;
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async updatePassword(id, passwordHash) {
        const result = await pool.query(
            `UPDATE users
             SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING id, username, email, role, created_at, updated_at`,
            [id, passwordHash]
        );
        return result.rows[0];
    }

    // Xóa user
    static async deleteUser(id) {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        return result.rowCount > 0;
    }
}

module.exports = UserModel;
