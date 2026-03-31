const { Client } = require('pg');
require('dotenv').config();

const PASSWORDS = [
    'Doctonsaude123+',
    'Doctonsaude123%2B'
];

async function testCombination(password) {
    const user = `postgres.ykilsibmhnctunafoayt`;
    const host = 'aws-1-sa-east-1.pooler.supabase.com';
    const port = 5432;
    const db = 'postgres';

    console.log(`\nTesting password: ${password}`);

    const client = new Client({
        user: user,
        password: password,
        host: host,
        port: port,
        database: db,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(`✅ SUCCESS with password: ${password}`);
        await client.end();
        return true;
    } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
        return false;
    }
}

async function run() {
    for (const pw of PASSWORDS) {
        if (await testCombination(pw)) {
            process.exit(0);
        }
    }
}

run();
