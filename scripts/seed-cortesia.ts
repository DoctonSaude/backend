import { PrismaClient } from '../lib/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Adicionando o plano Cortesia...');

  const cortesiaPlan = {
    key: 'cortesia',
    name: 'Cortesia',
    description: 'Plano de Cortesia para Parceiros e VIPS com acesso integral',
    price: 0,
    interval: 'MONTHLY' as const,
    features: JSON.stringify(['Acesso integral gratuito', 'Uso vitalício', 'Isenção de taxas']),
    isActive: true,
  };

  const existing = await (prisma as any).plan.findFirst({ where: { key: cortesiaPlan.key } });
  
  if (existing) {
    console.log(`ℹ️  Plano "${cortesiaPlan.name}" já existe (ID: ${existing.id}).`);
  } else {
    const created = await (prisma as any).plan.create({ data: cortesiaPlan });
    console.log(`✅ Plano "${cortesiaPlan.name}" criado com sucesso (ID: ${created.id}).`);
  }
}

main()
  .catch(e => { console.error('Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
