import prisma from './src/lib/prisma.js';
import { z } from 'zod';

async function main() {
    try {
        const reqBody = { percent: 10 };
        const schema = z.object({
            percent: z.number(),
        });

        const { percent } = schema.parse(reqBody);
        console.log(`[Prices] Syncing classifications (percent=${percent}%)`);

        const services = await prisma.partnerService.findMany();
        
        let syncCount = 0;

        for (const service of services) {
            const newBasePrice = service.basePrice * (1 + percent / 100);
            
            const updated = await prisma.partnerService.update({
                where: { id: service.id },
                data: {
                    basePrice: newBasePrice,
                    price: service.price === service.basePrice ? newBasePrice : undefined
                },
                include: {
                    Partner: { select: { name: true } },
                    ServiceCategory: { select: { name: true } }
                }
            });
            console.log(`Updated ${service.id} successfully`);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

main().finally(() => prisma.$disconnect());
