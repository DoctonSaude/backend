import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debug() {
  const user = await prisma.user.findFirst({
    where: { email: 'agenciaviajebus@gmail.com' },
    include: {
      Patient: true,
      Partner: true
    }
  });

  console.log('--- DEBUG USER ---');
  console.log(JSON.stringify(user, null, 2));
  process.exit(0);
}

debug();
