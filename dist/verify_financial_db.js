"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Verifying PartnerFinancialData table...');
    try {
        const count = await prisma.partnerFinancialData.count();
        console.log('Successfully connected. Current count:', count);
    }
    catch (error) {
        console.error('Table verification failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=verify_financial_db.js.map