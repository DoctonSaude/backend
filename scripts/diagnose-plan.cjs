const { PrismaClient } = require('./src/generated/client/index.js');

const prisma = new PrismaClient();

async function main() {
  // 1. Listar planos
  const plans = await prisma.plan.findMany({ select: { id: true, key: true, name: true, isActive: true } });
  console.log('=== PLANOS CADASTRADOS ===');
  console.log(JSON.stringify(plans, null, 2));

  // 2. Verificar usuario Ana Paula e subscriptions
  const anaUser = await prisma.user.findFirst({
    where: { name: { contains: 'Ana', mode: 'insensitive' } },
    include: {
      patient: {
        include: {
          subscriptions: {
            include: { plan: true },
            orderBy: { startedAt: 'desc' }
          }
        }
      }
    }
  });

  if (anaUser) {
    console.log('\n=== Usuário encontrado ===');
    console.log('Nome:', anaUser.name);
    console.log('Email:', anaUser.email);
    console.log('PatientId:', anaUser.patient?.id);
    const subs = anaUser.patient?.subscriptions || [];
    console.log(`Subscriptions (${subs.length}):`);
    subs.forEach(s => {
      console.log(` - planId: ${s.planId}, planKey: ${s.plan?.key}, status: ${s.status}`);
    });
  } else {
    console.log('\nNenhum usuário com nome "Ana" encontrado no banco.');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
