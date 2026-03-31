const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        user: 'postgres.ykilsibmhnctunafoayt',
        password: 'Doctonsaude123+',
        host: 'aws-1-sa-east-1.pooler.supabase.com',
        port: 5432,
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ SUCCESS!');
        await client.end();
    } catch (err) {
        console.log('❌ FAILED:', err.message);
    }
}
run();
