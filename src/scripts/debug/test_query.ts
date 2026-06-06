
import prisma from './lib/prisma.js';

async function test() {
  try {
    console.log('Testing query with orderBy...');
    const result = await prisma.appointment.findMany({
      take: 1,
      include: {
        Partner: {
          include: {
            User: { select: { name: true, avatar: true } }
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });
    console.log('Query successful:', result);
  } catch (error: any) {
    console.error('Query failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
