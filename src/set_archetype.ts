import prisma from './lib/prisma';

async function setArchetype() {
    const archetype = process.argv[2] || 'PREGNANT';

    const patient = await prisma.patient.findFirst();

    if (!patient) {
        console.error('Nenhum paciente encontrado no banco.');
        return;
    }

    await prisma.patient.update({
        where: { id: patient.id },
        data: { archetype }
    });

    console.log(`✅ Sucesso! O paciente ${patient.id} agora tem o arquétipo: ${archetype}`);
    console.log('Recarregue o seu Dashboard para ver as mudanças.');
}

setArchetype()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
