
import { PrismaClient } from '../lib/generated/prisma/index.js';
const prisma = new PrismaClient();

async function main() {
  await prisma.boostPrice.updateMany({
    where: { type: 'SEARCH_TOP' },
    data: { price: 99.90 }
  });
  console.log('✅ SEARCH_TOP price reset to 99.90');
}

main().then(() => prisma.$disconnect());
