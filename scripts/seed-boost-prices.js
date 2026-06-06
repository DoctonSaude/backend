
import { PrismaClient } from '../lib/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const defaultBoosts = [
    {
      type: 'SEARCH_TOP',
      price: 99.90,
      description: 'Seja o primeiro resultado nas buscas, aumente a visibilidade do seu perfil drasticamente!'
    },
    {
      type: 'REGIONAL_DOMAIN',
      price: 149.90,
      description: 'Domine a região, apareça em destaque para todos os pacientes da sua cidade ou estado.'
    },
    {
      type: 'BOOST_TEMPORARY',
      price: 49.90,
      description: 'Dê um impulso rápido! Aumente a visibilidade do seu perfil por um período limitado.'
    }
  ];

  console.log('Seeding BoostPrice...');
  
  for (const boostData of defaultBoosts) {
    const existing = await prisma.boostPrice.findUnique({
      where: { type: boostData.type }
    });

    if (existing) {
      console.log(`BoostPrice ${boostData.type} already exists, updating...`);
      await prisma.boostPrice.update({
        where: { type: boostData.type },
        data: boostData
      });
    } else {
      console.log(`Creating BoostPrice ${boostData.type}...`);
      await prisma.boostPrice.create({
        data: boostData
      });
    }
  }

  console.log('✅ BoostPrice seeded successfully!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Error seeding BoostPrice:', e);
    prisma.$disconnect();
  });
