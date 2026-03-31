
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying PartnerFinancialData table...');
    try {
        const count = await prisma.partnerFinancialData.count();
        console.log('Successfully connected. Current count:', count);
    } catch (error) {
        console.error('Table verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
