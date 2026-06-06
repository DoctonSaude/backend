
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const patient = await prisma.patient.findFirst({
      select: {
        id: true,
        currentStreak: true,
        lastActiveDate: true,
      }
    });
    console.log('Success! Patient:', patient);
  } catch (err) {
    console.error('Error!', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
