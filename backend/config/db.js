const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'robot_control',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

// Test connection
pool.query('SELECT NOW()', (err, result) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        // Don't exit - let the server continue running
    } else {
        console.log('✅ Database connected at:', result.rows[0].now);
    }
});

module.exports = pool;
