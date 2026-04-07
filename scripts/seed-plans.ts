import { PrismaClient } from '../lib/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Criando planos base no banco de dados...');

  // Criar os 3 planos padrão do sistema
  const plans = [
    {
      key: 'basic',
      name: 'Gratuito',
      description: 'Plano gratuito com acesso básico ao Docton Saúde',
      price: 0,
      interval: 'MONTHLY' as const,
      features: JSON.stringify(['Consulta de profissionais', 'Solicitação de orçamentos']),
      isActive: true,
    },
    {
      key: 'gold',
      name: 'Plano Gold',
      description: 'Plano Gold com acesso a prontuário digital e insights',
      price: 1999,
      interval: 'MONTHLY' as const,
      features: JSON.stringify(['Prontuário Digital Completo', 'Insights de Saúde Avançados', 'Sistema de Gamificação']),
      isActive: true,
    },
    {
      key: 'premium',
      name: 'Plano Premium',
      description: 'Plano Premium com acesso completo a todas as funcionalidades',
      price: 29999,
      interval: 'MONTHLY' as const,
      features: JSON.stringify(['Tudo do Plano Gold', 'Até 5 Dependentes', 'Coordenador de Saúde', 'Atendimento prioritário']),
      isActive: true,
    }
  ];

  for (const plan of plans) {
    const existing = await (prisma as any).plan.findFirst({ where: { key: plan.key } });
    if (existing) {
      console.log(`ℹ️  Plano "${plan.name}" já existe (ID: ${existing.id}). Pulando.`);
    } else {
      const created = await (prisma as any).plan.create({ data: plan });
      console.log(`✅ Plano "${plan.name}" criado com ID: ${created.id}`);
    }
  }

  // Verificar se Ana Paula existe e atribuir plano Premium
  const anaUser = await (prisma as any).user.findFirst({
    where: { name: { contains: 'Ana', mode: 'insensitive' } },
    include: { patient: true }
  });

  if (anaUser?.patient) {
    const premiumPlan = await (prisma as any).plan.findFirst({ where: { key: 'premium' } });
    if (premiumPlan) {
      // Cancelar subscriptions anteriores
      await (prisma as any).subscription.updateMany({
        where: { patientId: anaUser.patient.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED', cancelledAt: new Date() }
      });
      // Criar subscription ativa
      await (prisma as any).subscription.create({
        data: {
          patientId: anaUser.patient.id,
          planId: premiumPlan.id,
          status: 'ACTIVE',
          paymentMethod: 'ADMIN_MANUAL',
          startedAt: new Date(),
        }
      });
      console.log(`\n✅ Plano Premium atribuído com sucesso para ${anaUser.name}!`);
    }
  }

  console.log('\n=== Seed concluído com sucesso! ===');
}

main()
  .catch(e => { console.error('Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
