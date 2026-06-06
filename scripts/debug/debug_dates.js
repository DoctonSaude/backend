const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const pharmacies = await prisma.pharmacy.findMany({
    select: { id: true, name: true, createdAt: true, isApproved: true }
  });
  
  console.log('--- Farmácias no Banco ---');
  pharmacies.forEach(p => {
    console.log(`Nome: ${p.name}, Criada em: ${p.createdAt}, Status: ${p.isApproved}`);
  });

  const users = await prisma.user.findMany({
    where: { role: 'PHARMACY' },
    select: { id: true, name: true, createdAt: true, role: true }
  });

  console.log('\n--- Usuários com papel PHARMACY ---');
  users.forEach(u => {
    console.log(`Nome: ${u.name}, Criado em: ${u.createdAt}`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
