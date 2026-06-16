const { PrismaClient } = require('./lib/generated/prisma/index.js');

const prisma = new PrismaClient({ 
  datasources: { 
    db: { url: 'postgresql://postgres.ykilsibmhnctunafoayt:Docton%402026%2A%2A@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require' } 
  } 
});

async function run() { 
  const tables = ['AiInsight', 'BlogPost', 'VideoContent', 'Report', 'AutomatedReport', 'boost_prices'];
  for (const table of tables) {
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = '${table}';
    `);
    console.log('TABLE:', table);
    console.log(columns);
  }
} 

run().catch(console.error).finally(() => prisma.$disconnect());
