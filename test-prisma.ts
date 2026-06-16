import prisma from './src/lib/prisma';

async function main() {
    try {
        const services = await prisma.partnerService.findMany({
            include: {
                Partner: {
                    select: { name: true }
                },
                ServiceCategory: {
                    select: { name: true, defaultMarkup: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log("Success! Found", services.length);
    } catch (e) {
        console.error("Prisma error:", e);
    }
}
main();
