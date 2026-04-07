const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const pharmacies = await prisma.pharmacy.findMany({
    select: { id: true, name: true, isApproved: true }
  });
  console.log(pharmacies);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
