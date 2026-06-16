const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany();
  console.log('Planos atuais:', JSON.stringify(plans, null, 2));

  for (const plan of plans) {
    let newFeatures = [];
    let newDescription = '';
    
    if (plan.name.toLowerCase().includes('básico') || plan.name.toLowerCase().includes('grátis') || plan.name.toLowerCase().includes('basic')) {
      newDescription = 'Acesso essencial à plataforma Docton Saúde.';
      newFeatures = [
        'Busca de serviços e profissionais',
        'Meus Agendamentos e Orçamentos',
        'Meu Prontuário e Histórico de Medicamentos',
        'Gamificação: Missões Básicas e Ranking'
      ];
    } else if (plan.name.toLowerCase().includes('gold')) {
      newDescription = 'Acesso avançado com prevenção e ferramentas.';
      newFeatures = [
        'Tudo do Plano Grátis',
        'Saúde IA (Luma) - Acesso ao chat IA',
        'Minha Família - Até 3 dependentes',
        'Conectar Wearables (Apple Health/Google Fit)',
        'Ferramentas de Saúde e Calculadoras',
        'Coach de Saúde - Jornadas Padronizadas',
        'Fidelidade - Recompensas exclusivas'
      ];
    } else if (plan.name.toLowerCase().includes('premium')) {
      newDescription = 'Acesso completo com Inteligência Artificial ilimitada e personalização.';
      newFeatures = [
        'Tudo do Plano Gold',
        'Insights de Saúde e Análises de IA',
        'Coach de Saúde - Chat IA Ilimitado',
        'Catálogo de Desafios Premium (Mais Pontos)',
        'Minha Família - Até 5 dependentes',
        'Uso irrestrito de todas as funcionalidades'
      ];
    }

    if (newFeatures.length > 0) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: {
          description: newDescription,
          featuresArray: newFeatures,
          features: JSON.stringify(newFeatures)
        }
      });
      console.log(`Atualizado plano ${plan.name}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
