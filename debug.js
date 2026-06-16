const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const patient = await prisma.patient.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log('Patient healthPoints:', patient?.healthPoints, 'XP:', patient?.experiencePoints);

  const reward = await prisma.reward.findUnique({ where: { id: 'cmq9s8z4x000010pe9b4q1q9l' } });
  console.log('Reward cost:', reward?.pointsCost, 'stock:', reward?.stockQuantity);
}

main().finally(() => prisma.$disconnect());
