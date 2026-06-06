const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Carlos Augusto', mode: 'insensitive' } }
  });
  
  if (!user) {
    console.log('Usuário Carlos Augusto não encontrado.');
    return;
  }

  // 1. Criar a farmácia
  const newPharmacy = await prisma.pharmacy.create({
    data: {
      name: 'sua unidade',
      cnpj: '00000000000000', // Placeholder, o usuário pode editar depois
      address: 'Endereço a completar',
      isApproved: false // Começa como pendente para o admin aprovar
    }
  });

  // 2. Vincular o usuário à farmácia
  await prisma.user.update({
    where: { id: user.id },
    data: { pharmacyId: newPharmacy.id }
  });

  console.log(`Sucesso! Farmácia 'sua unidade' (ID: ${newPharmacy.id}) criada e vinculada ao usuário ${user.name}.`);
  console.log('Agora você pode aprová-la no painel administrativo.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
