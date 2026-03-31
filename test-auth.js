import { PrismaClient } from '@prisma/client';

async function testConnection(url, label) {
    console.log(`Testing ${label}...`);
    const prisma = new PrismaClient({
        datasources: {
            db: { url }
        }
    });

    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log(`✅ ${label}: SUCCESS`);
        return true;
    } catch (error) {
        console.log(`❌ ${label}: FAILED - ${error.message}`);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

async function run() {
    const projectRef = 'ykilsibmhnctunafoayt';

    // Test candidates
    const passwords = ['Kingro@1981', 'Docton.2026**'];
    const hosts = [
        `aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
        `aws-1-sa-east-1.pooler.supabase.com:5432/postgres`
    ];

    for (const pwd of passwords) {
        const encodedPwd = encodeURIComponent(pwd);
        for (const host of hosts) {
            const url = `postgresql://postgres.${projectRef}:${encodedPwd}@${host}`;
            await testConnection(url, `Password [${pwd}] on Host [${host}]`);
        }
    }
}

run();
