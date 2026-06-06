const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUpdate() {
  try {
    console.log('Testando UPDATE no Prisma...');
    // Busca a primeira farmácia para testar
    const pharmacy = await prisma.pharmacy.findFirst();
    if (!pharmacy) {
      console.log('Nenhuma farmácia encontrada para teste.');
      return;
    }

    const testData = {
      neighborhood: 'Bairro Teste ' + Date.now(),
      zipCode: '12345-678',
      acceptedPayments: ['PIX', 'CREDIT_CARD']
    };

    const updated = await prisma.pharmacy.update({
      where: { id: pharmacy.id },
      data: testData
    });
    
    console.log('✅ Sucesso! Farmácia atualizada:', updated.id);
    console.log('DADOS:', {
      neighborhood: updated.neighborhood,
      zipCode: updated.zipCode,
      acceptedPayments: updated.acceptedPayments
    });
  } catch (error) {
    console.error('❌ Erro detectado no UPDATE:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdate();
