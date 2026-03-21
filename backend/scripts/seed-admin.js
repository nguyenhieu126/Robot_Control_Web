const bcrypt = require('bcrypt');
const pool = require('../config/db');
require('dotenv').config();

async function seedAdmin() {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const email = (process.env.ADMIN_EMAIL || 'admin@robot.local').toLowerCase();
    const plainPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const role = 'admin';
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

    try {
        const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (email)
             DO UPDATE SET
                 username = EXCLUDED.username,
                 password_hash = EXCLUDED.password_hash,
                 role = EXCLUDED.role,
                 updated_at = CURRENT_TIMESTAMP
             RETURNING id, username, email, role, created_at, updated_at`,
            [username, email, passwordHash, role]
        );

        console.log('✅ Admin account is ready:', result.rows[0]);
    } catch (error) {
        console.error('❌ Failed to seed admin:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

seedAdmin();
