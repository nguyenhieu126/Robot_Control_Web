// Script tự động chạy tất cả migration files
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runMigrations() {
    console.log('🔄 Starting database migrations...\n');

    const dbClient = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'robot_control',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    });

    try {
        await dbClient.connect();
        console.log('✅ Connected to database\n');

        // Lấy tất cả migration files
        const migrationsDir = path.join(__dirname, '..', 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Chạy theo thứ tự tên file

        console.log(`📂 Found ${files.length} migration file(s):\n`);

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            console.log(`📝 Running migration: ${file}`);

            const sql = fs.readFileSync(filePath, 'utf8');
            
            try {
                await dbClient.query(sql);
                console.log(`   ✅ ${file} completed\n`);
            } catch (error) {
                // Ignore "already exists" errors
                if (error.code === '42P07' || error.code === '42710') {
                    console.log(`   ⚠️  ${file} - objects already exist (skipped)\n`);
                } else {
                    console.error(`   ❌ ${file} failed:`, error.message);
                    throw error;
                }
            }
        }

        // Kiểm tra số lượng bảng
        const result = await dbClient.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📊 Database tables:');
        result.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });

        console.log('\n✅ All migrations completed successfully!');

    } catch (error) {
        console.error('❌ Migration error:', error.message);
        process.exit(1);
    } finally {
        await dbClient.end();
    }
}

// Run migrations
runMigrations().catch(console.error);
