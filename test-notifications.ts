import prisma from './src/lib/prisma.js';

async function main() {
  const notifications = await prisma.notification.findMany({
    where: { userId: null },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('--- NOTIFICAÇÕES ADMIN (userId: null) ---');
  console.log(JSON.stringify(notifications, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
