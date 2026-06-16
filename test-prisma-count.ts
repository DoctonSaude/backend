import prisma from './src/lib/prisma';
async function main() {
    try {
        const count = await prisma.partnerService.count();
        console.log("PartnerService count:", count);
        
        const countCategories = await prisma.serviceCategory.count();
        console.log("ServiceCategory count:", countCategories);

        const partners = await prisma.partner.count();
        console.log("Partners count:", partners);
    } catch (e) {
        console.error("Prisma error:", e);
    }
}
main();
