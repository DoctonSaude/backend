import { PrismaClient } from '../lib/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const totalUsers = await prisma.user.count();
  console.log(`Total de usuários: ${totalUsers}`);

  const userRoles = await prisma.user.groupBy({
    by: ['role'],
    _count: { _all: true }
  });
  console.log('Contagem por Role:');
  console.log(JSON.stringify(userRoles, null, 2));

  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    take: 10
  });
  console.log('Exemplos de usuários (Top 10):');
  console.log(JSON.stringify(allUsers, null, 2));
}

main()
  .catch(e => { console.error('Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
