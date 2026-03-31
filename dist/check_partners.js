"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const partners = await prisma.partner.findMany({
        take: 1,
        include: {
            user: true
        }
    });
    console.log(JSON.stringify(partners, null, 2));
}
main()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=check_partners.js.map