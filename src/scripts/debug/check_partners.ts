
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
