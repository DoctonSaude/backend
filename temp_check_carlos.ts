import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Carlos Augusto', mode: 'insensitive' } },
    include: { pharmacy: true }
  });
  
  if (!user) {
    console.log('Usuário não encontrado');
  } else {
    console.log({
      id: user.id,
      name: user.name,
      role: user.role,
      pharmacyId: user.pharmacyId,
      pharmacyName: user.pharmacy?.name,
      pharmacyApproved: user.pharmacy?.isApproved
    });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
