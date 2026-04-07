import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Buscando Pacientes para Teste ---');
    const patients = await prisma.patient.findMany({
        take: 5,
        include: {
            user: true
        }
    });

    patients.forEach(p => {
        console.log(`ID: ${p.id} | Email: ${p.user.email} | Nome: ${p.name}`);
    });

    console.log('\n--- Buscando Orçamentos Pendentes ---');
    const budgets = await prisma.appointmentBudget.findMany({
        where: { status: 'PENDING' },
        take: 5,
        include: {
            patient: true
        }
    });

    budgets.forEach(b => {
        console.log(`Budget ID: ${b.id} | Patient: ${b.patient.name} | Amount: ${b.amount}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
