
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const templates = [
    {
      id: 'reativacao_90_dias',
      name: 'Reativação de Inativos (90 dias)',
      category: 'Retenção',
      type: 'WHATSAPP',
      objective: 'RETENTION',
      content: 'Olá [NOME]! Faz tempo que não nos vemos. Preparamos uma condição especial para seu retorno este mês. Vamos agendar uma revisão?',
      baseContent: 'Mensagem padrão de reativação via WhatsApp.',
      isActive: true
    },
    {
      id: 'checkup_preventivo',
      name: 'Check-up Preventivo',
      category: 'Saúde',
      type: 'PUSH',
      objective: 'REVENUE',
      content: 'Seu último check-up foi há 6 meses. Manter os exames em dia é a melhor forma de prevenir complicações. Agende agora!',
      isActive: true
    },
    {
      id: 'aniversario_premiado',
      name: 'Presente de Aniversário',
      category: 'Fidelização',
      type: 'WHATSAPP',
      objective: 'RETENTION',
      content: 'Parabéns, [NOME]! 🎂 No seu mês de aniversário, a Docton e sua clínica te dão 20% de desconto em qualquer procedimento estético ou preventivo!',
      isActive: true
    },
    {
      id: 'recuperacao_critica',
      name: 'Recuperação Crítica (180+ dias)',
      category: 'Retenção',
      type: 'WHATSAPP',
      objective: 'RETENTION',
      content: 'Sentimos sua falta pelo canal [NOME]! Notamos que seu tratamento foi interrompido. Que tal conversarmos para retomar sua saúde?',
      isActive: true
    },
    {
      id: 'novos_procedimentos',
      name: 'Novidades na Clínica',
      category: 'Vendas',
      type: 'PUSH',
      objective: 'REVENUE',
      content: 'Novos equipamentos e procedimentos chegaram! Conheça as tecnologias que trouxemos para melhorar seu atendimento.',
      isActive: true
    }
  ];

  console.log('Seeding templates...');
  for (const t of templates) {
    await prisma.campaignTemplate.upsert({
      where: { id: t.id },
      update: t,
      create: t
    });
  }

  console.log('Successfully seeded 5 campaign templates.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
