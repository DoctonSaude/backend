"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Verifying Quote table schema with Dates...');
    try {
        const quote = await prisma.quote.create({
            data: {
                patientName: "Test Schema Date",
                patientPhone: "000000000",
                examType: "Test Exam Date",
                crmStatus: "novo",
                crmNextContact: new Date(), // Testing Date writing
                crmNotes: "Test Note"
            }
        });
        console.log('Successfully created Quote with CRM Date:', quote.id);
        // Update it
        await prisma.quote.update({
            where: { id: quote.id },
            data: {
                crmNextContact: new Date("2026-01-01")
            }
        });
        console.log('Successfully updated Quote date.');
        // Clean up
        await prisma.quote.delete({ where: { id: quote.id } });
        console.log('Cleanup successful.');
    }
    catch (error) {
        console.error('Schema verification failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=verify_db.js.map