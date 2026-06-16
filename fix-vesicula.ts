import prisma from './src/lib/prisma.js';
import { syncPartnerServiceWithSupabase } from './src/routes/prices.routes.js';

async function main() {
  const service = await prisma.partnerService.findFirst({
    where: { name: 'Retirada de Vesícula' }
  });
  
  if (service) {
    const updated = await prisma.partnerService.update({
      where: { id: service.id },
      data: {
        partnerPayout: 1500,
        doctonFeePercent: 0,
        basePrice: 1500,
        price: 1500
      }
    });
    console.log('Updated service:', updated);
    
    try {
        await syncPartnerServiceWithSupabase(updated, 'update');
        console.log('Synced with Supabase successfully.');
    } catch (e) {
        console.error('Failed to sync with Supabase:', e);
    }
  } else {
    console.log('Service not found.');
  }
}

main().finally(() => prisma.$disconnect());
