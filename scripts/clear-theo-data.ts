
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTheoNotifications() {
  const email = 'agenciaviajebus@gmail.com';
  
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('Usuário Theo não encontrado.');
      return;
    }

    const { count } = await prisma.notification.deleteMany({
      where: { userId: user.id }
    });

    console.log(`Sucesso: ${count} notificações removidas para o usuário Theo (${user.id}).`);
    
    // Opcional: Limpar carrinho se necessário (já solicitado anteriormente, mas bom assegurar)
    const cartRes = await prisma.cartItem.deleteMany({
      where: { userId: user.id }
    });
    console.log(`Sucesso: ${cartRes.count} itens de carrinho removidos.`);

  } catch (error) {
    console.error('Erro ao limpar notificações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTheoNotifications();
