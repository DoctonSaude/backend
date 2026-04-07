const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const pharmacy = await prisma.pharmacy.findFirst({
    where: { name: { contains: 'sua unidade', mode: 'insensitive' } }
  });
  
  if (!pharmacy) {
    console.log('Farmácia não encontrada');
  } else {
    console.log({
      id: pharmacy.id,
      name: pharmacy.name,
      isApproved: pharmacy.isApproved
    });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
