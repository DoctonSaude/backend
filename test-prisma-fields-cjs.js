const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testando campos no Prisma...');
    const pharmacy = await prisma.pharmacy.findFirst({
      select: {
        id: true,
        neighborhood: true,
        zipCode: true
      }
    });
    console.log('✅ Sucesso! Campos encontrados:', pharmacy ? 'ID: ' + pharmacy.id : 'Nenhuma farmácia encontrada');
  } catch (error) {
    console.error('❌ Erro detectado:', error.message);
    if (error.message.includes('Unknown column')) {
      console.log('DICA: O banco de dados não tem a coluna.');
    } else if (error.message.includes('unknown field')) {
      console.log('DICA: O Prisma Client não conhece o campo.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

test();
