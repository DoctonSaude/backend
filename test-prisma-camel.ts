import prisma from './src/lib/prisma';

async function main() {
    try {
        const services = await prisma.partnerService.findMany({
            include: {
                partner: {
                    select: { name: true }
                },
                serviceCategory: {
                    select: { name: true, defaultMarkup: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log("Success with camelCase! Found", services.length);
    } catch (e) {
        console.error("Prisma error with camelCase:", e);
    }
}
main();
