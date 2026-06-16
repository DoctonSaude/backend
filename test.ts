import prisma from './src/lib/prisma.js';

async function main() {
  const service = await prisma.partnerService.findFirst({
    where: { name: 'Retirada de Vesícula' }
  });
  console.log('Result:', service);
}

main().finally(() => prisma.$disconnect());
