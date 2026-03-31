const { Client } = require('pg');

const variants = [
    {
        name: 'Direct (5432) + ssl: { rejectUnauthorized: false }',
        url: 'postgresql://postgres.ykilsibmhnctunafoayt:Doctonsaude2026@aws-1-sa-east-1.pooler.supabase.com:5432/postgres',
        ssl: { rejectUnauthorized: false }
    },
    {
        name: 'Pooler (6543) + pgbouncer=true + ssl: { rejectUnauthorized: false }',
        url: 'postgresql://postgres.ykilsibmhnctunafoayt:Doctonsaude2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
        ssl: { rejectUnauthorized: false }
    }
];

async function test() {
    for (const variant of variants) {
        console.log(`Testing: ${variant.name}...`);
        const client = new Client({
            connectionString: variant.url,
            ssl: variant.ssl
        });
        try {
            await client.connect();
            console.log(`✅ SUCCESS: ${variant.name}`);
            await client.end();
        } catch (err) {
            console.log(`❌ FAILURE: ${variant.name} -> ${err.message}`);
        }
    }
}

test();
