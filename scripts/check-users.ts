import { PrismaClient } from '../lib/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking users in database...');
    const users = await prisma.user.findMany({
        include: {
            patient: true,
            admin: true
        }
    });
    console.log(`✅ Found ${users.length} users!`);
    users.forEach(u => {
        console.log(`  - ${u.email} (${u.name}) - Patient? ${!!u.patient}, Admin? ${!!u.admin}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
