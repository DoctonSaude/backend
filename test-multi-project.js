const { Client } = require('pg');
require('dotenv').config();

const PROJECTS = [
    'ykilsibmhnctunafoayt',
    'eoxigdwgnzjqxcxtigqw'
];
const PASSWORD = 'Doctonsaude123+';

async function testProject(project) {
    const user = `postgres.${project}`;
    const host = 'aws-1-sa-east-1.pooler.supabase.com';
    const port = 5432;
    const db = 'postgres';

    console.log(`\nTesting project: ${project} with user: ${user}`);

    const client = new Client({
        user: user,
        password: PASSWORD,
        host: host,
        port: port,
        database: db,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(`✅ SUCCESS with project: ${project}`);
        await client.end();
        return true;
    } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
        return false;
    }
}

async function run() {
    for (const p of PROJECTS) {
        if (await testProject(p)) {
            process.exit(0);
        }
    }
}

run();
