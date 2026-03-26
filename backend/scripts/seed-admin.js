const bcrypt = require('bcrypt');
const pool = require('../config/db');
require('dotenv').config();

function getDefaultUsers() {
    return [
        {
            username: process.env.ADMIN_USERNAME || 'admin',
            email: process.env.ADMIN_EMAIL || 'admin@robot.local',
            plainPassword: process.env.ADMIN_PASSWORD || 'Admin@123',
            role: 'admin'
        },
        {
            username: process.env.OPERATOR_USERNAME || 'operator',
            email: process.env.OPERATOR_EMAIL || 'operator@robot.local',
            plainPassword: process.env.OPERATOR_PASSWORD || 'Operator@123',
            role: 'user'
        },
        {
            username: process.env.SECURITY_USERNAME || 'security',
            email: process.env.SECURITY_EMAIL || 'security@robot.local',
            plainPassword: process.env.SECURITY_PASSWORD || 'Security@123',
            role: 'user'
        }
    ].map((user) => ({
        ...user,
        username: String(user.username).trim(),
        email: String(user.email).trim().toLowerCase()
    }));
}

async function seedDefaultUsers(options = {}) {
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
    const closePool = options.closePool !== false;
    const users = getDefaultUsers();

    try {
        for (const user of users) {
            const passwordHash = await bcrypt.hash(user.plainPassword, saltRounds);
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
                [user.username, user.email, passwordHash, user.role]
            );

            console.log(`✅ Seeded user: ${result.rows[0].email} (${result.rows[0].role})`);
        }

        console.log('✅ Default users are ready.');
    } catch (error) {
        console.error('❌ Failed to seed default users:', error.message);
        process.exitCode = 1;
    } finally {
        if (closePool) {
            await pool.end();
        }
    }
}

if (require.main === module) {
    seedDefaultUsers();
}

module.exports = {
    seedDefaultUsers
};
