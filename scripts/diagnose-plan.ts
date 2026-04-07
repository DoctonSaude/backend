import { PrismaClient } from '../lib/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  // 1. Listar planos
  const plans = await prisma.plan.findMany({ select: { id: true, key: true, name: true, isActive: true } });
  console.log('=== PLANOS CADASTRADOS ===');
  console.log(JSON.stringify(plans, null, 2));

  // 2. Verificar usuario Ana Paula e subscriptions
  const anaUser = await (prisma as any).user.findFirst({
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
    subs.forEach((s: any) => {
      console.log(` - planId: ${s.planId}, planKey: ${s.plan?.key}, planName: ${s.plan?.name}, status: ${s.status}`);
    });
    if (subs.length === 0) {
      console.log('  -> Nenhuma subscription encontrada! O plano foi atribuído incorretamente.');
    }
  } else {
    console.log('\nNenhum usuário com nome "Ana" encontrado no banco.');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
