import prisma from './src/lib/prisma.js';

async function main() {
  console.log('Seeding templates...');
  
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
    },
    {
       name: 'Promoção de Saúde Mental',
       category: 'Saúde Mental',
       type: 'WHATSAPP',
       objective: 'RECURRENCE',
       content: 'Olá {{name}}, como está seu bem-estar hoje? Estamos com horários disponíveis para psicoterapia. Vamos conversar?',
       baseContent: 'Olá {{name}}, como está seu bem-estar hoje? Estamos com horários disponíveis para psicoterapia. Vamos conversar?'
    }
  ];

  for (const t of templates) {
    const id = t.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '-');
    await prisma.campaignTemplate.upsert({
      where: { id },
      update: t,
      create: {
        id,
        ...t
      }
    });
  }

  console.log('Templates seeded successfully');
}

main()
  .catch(e => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
