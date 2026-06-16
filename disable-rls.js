const { PrismaClient } = require('./lib/generated/prisma/index.js');
const prisma = new PrismaClient({ 
  datasources: { 
    db: { url: 'postgresql://postgres.ykilsibmhnctunafoayt:Docton%402026%2A%2A@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require' } 
  } 
});

async function run() { 
  await prisma.$executeRawUnsafe('ALTER TABLE "Challenge" DISABLE ROW LEVEL SECURITY;'); 
  await prisma.$executeRawUnsafe('ALTER TABLE "Reward" DISABLE ROW LEVEL SECURITY;'); 
  console.log('RLS DISABLED!'); 
} 

run().catch(console.error).finally(() => prisma.$disconnect());
