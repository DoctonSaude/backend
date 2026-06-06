import prisma from '../lib/prisma.js';

async function main() {
  console.log('🌱 Semeando preços de Boosts...');

  const boosts = [
    { type: 'SEARCH_TOP', price: 149.90, description: 'Sua clínica aparece nos 3 primeiros resultados.' },
    { type: 'REGIONAL_DOMAIN', price: 299.00, description: 'Exclusividade de destaque no seu bairro e arredores.' },
    { type: 'TEMPORARY', price: 49.90, description: 'Aceleração máxima por 48h. Perfeito para preencher lacunas.' },
  ];

  for (const boost of boosts) {
    await prisma.boostPrice.upsert({
      where: { type: boost.type },
      update: { price: boost.price, description: boost.description },
      create: { type: boost.type, price: boost.price, description: boost.description },
    });
  }

  console.log('✅ Preços semeados com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
