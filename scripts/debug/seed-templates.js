import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const templates = [
    {
      name: 'Check-up Preventivo',
      category: 'Preventivo',
      type: 'WHATSAPP',
      objective: 'RECURRENCE',
      content: 'Olá {{name}}! Faz tempo que não nos vemos. Que tal agendar um check-up preventivo para manter sua saúde em dia?',
      baseContent: 'Olá {{name}}! Faz tempo que não nos vemos. Que tal agendar um check-up preventivo para manter sua saúde em dia?'
    },
    {
      name: 'Campanha de Diabetes',
      category: 'Crônicos',
      type: 'WHATSAPP',
      objective: 'RETENTION',
      content: 'Olá {{name}}, notamos que você não realiza seu acompanhamento de glicemia há algum tempo. Vamos agendar uma consulta?',
      baseContent: 'Olá {{name}}, notamos que você não realiza seu acompanhamento de glicemia há algum tempo. Vamos agendar uma consulta?'
    },
    {
       name: 'Recuperação de Pacientes Sumidos',
       category: 'Retenção',
       type: 'WHATSAPP',
       objective: 'RECOVERY',
       content: 'Sentimos sua falta, {{name}}! Volte a cuidar da sua saúde com uma condição especial neste mês.',
       baseContent: 'Sentimos sua falta, {{name}}! Volte a cuidar da sua saúde com uma condição especial neste mês.'
    }
  ];

  for (const t of templates) {
    await prisma.campaignTemplate.upsert({
      where: { id: t.name.toLowerCase().replace(/ /g, '-') },
      update: t,
      create: {
        id: t.name.toLowerCase().replace(/ /g, '-'),
        ...t
      }
    });
  }

  console.log('Templates seeded successfully');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
