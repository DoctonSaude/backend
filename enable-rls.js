const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  console.log('Reabilitando RLS para tabelas migradas...');
  
  const tables = [
    'AiInsight',
    'BlogPost',
    'VideoContent',
    'Report',
    'AutomatedReport',
    'boost_prices',
    'Challenge',
    'Reward'
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`RLS habilitado para: ${table}`);
    } catch (e) {
      console.error(`Erro ao habilitar RLS para ${table}:`, e.message);
    }
  }

  console.log('Finalizado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
