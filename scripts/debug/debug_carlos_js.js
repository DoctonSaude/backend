const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Carlos Augusto', mode: 'insensitive' } },
    include: { pharmacy: true }
  });
  
  if (!user) {
    console.log('Usuário não encontrado');
  } else {
    console.log('--- Usuário Encontrado ---');
    console.log('ID:', user.id);
    console.log('Nome:', user.name);
    console.log('Papel:', user.role);
    console.log('ID Farmácia no Usuário:', user.pharmacyId);
    
    if (user.pharmacy) {
      console.log('Farmácia vinculada (objeto):', user.pharmacy.name);
      console.log('Status Aprovação Farmácia:', user.pharmacy.isApproved);
    } else {
       // Tentar achar farmácia que contém esse usuário
       const phalt = await prisma.pharmacy.findFirst({
         where: { users: { some: { id: user.id } } }
       });
       if (phalt) {
         console.log('Farmácia vinculada (via relação N-N):', phalt.name);
         console.log('Status Aprovação Farmácia:', phalt.isApproved);
       } else {
         console.log('Nenhuma farmácia vinculada encontrada para este usuário.');
       }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
