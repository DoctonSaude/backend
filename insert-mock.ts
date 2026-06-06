import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst();
  if (!user) { console.log('No user found'); return; }
  
  await prisma.chatHistory.createMany({
    data: [
      { userId: user.id, message: 'Gostaria de agendar uma consulta médica', response: 'Ok', createdAt: new Date() },
      { userId: user.id, message: 'Preciso do orçamento de um exame de sangue urgência', response: 'Ok', createdAt: new Date(Date.now() - 3600000) },
      { userId: user.id, message: 'Meu filho está com dor no peito', response: 'Ok', createdAt: new Date(Date.now() - 7200000) },
    ]
  });
  console.log('Mock intents created');
}

run().finally(() => process.exit(0));
