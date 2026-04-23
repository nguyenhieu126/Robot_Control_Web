// Script tự động khởi tạo database
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { seedDefaultUsers } = require('./seed-admin');
require('dotenv').config();

async function initDatabase() {
    console.log('🚀 Starting database initialization...\n');

    // Kết nối tới postgres database (default)
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: 'postgres', // Kết nối tới postgres database trước
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    });

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL\n');

        // Tạo database robot_control nếu chưa tồn tại
        const dbName = process.env.DB_NAME || 'robot_control';
        
        console.log(`📦 Creating database: ${dbName}...`);
        try {
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`✅ Database ${dbName} created\n`);
        } catch (error) {
            if (error.code === '42P04') {
                console.log(`⚠️  Database ${dbName} already exists\n`);
            } else {
                throw error;
            }
        }

        await client.end();

        // Kết nối tới database robot_control mới tạo
        const dbClient = new Client({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: dbName,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
        });

        await dbClient.connect();
        console.log(`✅ Connected to ${dbName} database\n`);

        const migrationsDir = path.join(__dirname, '..', 'migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        if (migrationFiles.length === 0) {
            throw new Error('No migration files found');
        }

        console.log(`📝 Running ${migrationFiles.length} migration file(s)...\n`);

        for (const file of migrationFiles) {
            const sqlFile = path.join(migrationsDir, file);
            console.log(`➡️  ${file}`);

            const sql = fs.readFileSync(sqlFile, 'utf8');
            await dbClient.query(sql);
        }

        console.log('✅ Migration completed successfully\n');

        console.log('🔐 Seeding default users with bcrypt...');
        await seedDefaultUsers();
        console.log('✅ Default users seeded\n');

        // Kiểm tra số lượng bảng
        const result = await dbClient.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📊 Tables created:');
        result.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });

        // Kiểm tra dữ liệu mẫu
        const userCount = await dbClient.query('SELECT COUNT(*) FROM users');
        const detectionCount = await dbClient.query('SELECT COUNT(*) FROM detections');
        const eventCount = await dbClient.query('SELECT COUNT(*) FROM abandoned_events');

        console.log('\n📈 Sample data:');
        console.log(`   Users: ${userCount.rows[0].count}`);
        console.log(`   Detections: ${detectionCount.rows[0].count}`);
        console.log(`   Events: ${eventCount.rows[0].count}`);

        await dbClient.end();

        console.log('\n🎉 Database initialization completed successfully!');
        console.log('\n🚀 You can now run: npm run dev');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\n🔍 Troubleshooting:');
        console.error('   1. Check PostgreSQL is running');
        console.error('   2. Check credentials in .env file');
        console.error('   3. Check database connection settings');
        process.exit(1);
    }
}

// Run
initDatabase();
