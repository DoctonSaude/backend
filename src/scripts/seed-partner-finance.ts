import prisma from '../lib/prisma.js';
import { subMonths, startOfMonth, addDays } from 'date-fns';

async function main() {
  console.log('🚀 Iniciando sementeira de dados financeiros do parceiro...');

  const partner = await prisma.partner.findFirst({
    include: { User: true }
  });

  if (!partner) {
    console.error('❌ Nenhum parceiro encontrado para popular dados.');
    return;
  }

  const patient = await prisma.patient.findFirst();
  if (!patient) {
      console.error('❌ Nenhum paciente encontrado para os agendamentos.');
      return;
  }

  console.log(`📡 Populando dados para o parceiro: ${partner.User.name} (${partner.id})`);

  // Limpar transações e agendamentos anteriores para este teste (opcional, mas bom para reset)
  // await prisma.transaction.deleteMany({ where: { partnerId: partner.id } });
  // await prisma.appointment.deleteMany({ where: { partnerId: partner.id } });

  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED', 'CONFIRMED'];
  const transactions = [];
  const appointments = [];

  // Criar dados para os últimos 6 meses
  for (let i = 0; i < 6; i++) {
    const monthDate = subMonths(new Date(), i);
    const monthStart = startOfMonth(monthDate);
    
    // Entre 5 a 10 atendimentos por mês
    const count = Math.floor(Math.random() * 6) + 5;
    
    for (let j = 0; j < count; j++) {
      const apptDate = addDays(monthStart, Math.floor(Math.random() * 25));
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const amount = Math.floor(Math.random() * 100) + 150; // R$ 150 - 250

      const appt = await (prisma as any).appointment.create({
        data: {
          Partner: { connect: { id: partner.id } },
          Patient: { connect: { id: patient.id } },
          dateTime: apptDate,
          status: status,
          duration: 30,
          notes: 'Consulta de rotina (Sistema de Teste)',
          updatedAt: new Date()
        }
      });
      appointments.push(appt);

      if (status === 'COMPLETED') {
        const tx = await (prisma as any).transaction.create({
          data: {
            Partner: { connect: { id: partner.id } },
            Patient: { connect: { id: patient.id } },
            amount: amount * 0.85, // Líquido (desconto de 15% taxa)
            type: 'CREDIT',
            status: 'COMPLETED',
            category: 'APPOINTMENT',
            description: `Repasse - Consulta ${j+1}`,
            createdAt: apptDate,
            updatedAt: new Date(),
            metadata: JSON.stringify({
                grossAmount: amount,
                platformFee: amount * 0.15,
                appointmentId: appt.id
            })
          }
        });
        transactions.push(tx);
      }
    }

    // Criar um saque por mês
    await (prisma as any).transaction.create({
        data: {
            Partner: { connect: { id: partner.id } },
            amount: Math.floor(Math.random() * 500) + 200,
            type: 'DEBIT',
            status: 'COMPLETED',
            category: 'WITHDRAWAL',
            description: `Saque Mensal - Período ${i+1}`,
            createdAt: monthDate,
            updatedAt: new Date()
        }
    });
  }

  console.log(`✅ Sementeira concluída!`);
  console.log(`📊 Agendamentos criados: ${appointments.length}`);
  console.log(`💰 Transações criadas: ${transactions.length + 6}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
