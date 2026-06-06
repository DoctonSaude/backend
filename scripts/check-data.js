
import { PrismaClient } from './../lib/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking BoostPrice...');
  const boostPrices = await prisma.boostPrice.findMany();
  console.log('BoostPrice count:', boostPrices.length);
  console.log('BoostPrice data:', boostPrices);

  console.log('\nChecking PartnerService...');
  const services = await prisma.partnerService.findMany({ take: 5 });
  console.log('PartnerService count:', services.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
