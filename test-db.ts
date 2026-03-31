import { PrismaClient } from './src/lib/generated/prisma/index.js';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log('Testing connection to:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
    try {
        const result = await prisma.$queryRaw`SELECT 1 as connected`;
        console.log('✅ Connection successful:', result);
    } catch (error: any) {
        console.error('❌ Connection failed:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Meta:', error.meta);
    } finally {
        await prisma.$disconnect();
    }
}

main();
