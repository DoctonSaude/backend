
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    const profile = await prisma.patient.findFirst({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            avatar: true,
            phone: true
          }
        },
        subscriptions: {
          include: { plan: true },
          where: { status: 'ACTIVE' },
          take: 1
        }
      }
    });
    
    console.log('Profile found:', !!profile);
    if (profile) {
      console.log('planType:', (profile as any).planType);
      
      const profileJson = JSON.parse(JSON.stringify(profile));
      if ((profile as any).planType && (profile as any).planType !== 'Gratuito' && (profile as any).planType !== 'Básico') {
        profileJson.plan = (profile as any).planType;
      } else if (profile.subscriptions?.[0]?.plan?.key) {
        profileJson.plan = (profile.subscriptions[0] as any).plan.key;
      } else {
        profileJson.plan = (profile as any).planType || 'basic';
      }
      console.log('Resulting plan:', profileJson.plan);
    }
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
