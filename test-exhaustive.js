const { Client } = require('pg');
require('dotenv').config();

const PASSWORDS = [
    'Docton.2026**',
    'Docton.2026%2A%2A',
    'Kingro.2026**',
    'Kingro.2026%2A%2A'
];

async function testCombination(password) {
    const user = `postgres`;
    const host = 'aws-1-sa-east-1.pooler.supabase.com';
    const port = 5432;
    const db = 'postgres';

    console.log(`\nTesting password: ${password}`);

    // We don't use connectionString to avoid URI parsing issues during test
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
            console.log('\nFOUND CORRECT PASSWORD!');
            process.exit(0);
        }
    }
    console.log('\nNone of the common variations worked.');
}

run();
