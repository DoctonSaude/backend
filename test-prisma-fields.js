import prisma from './src/lib/prisma.js';

async function test() {
  try {
    const pharmacy = await prisma.pharmacy.findFirst({
      select: {
        id: true,
        neighborhood: true,
        zipCode: true
      }
    });
    console.log('✅ Sucesso! Campos encontrados:', pharmacy ? 'Sim' : 'Nenhuma farmácia encontrada');
  } catch (error) {
    console.error('❌ Erro detectado:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
