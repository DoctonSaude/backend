
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const patient = await prisma.user.findFirst({
    where: { role: 'PATIENT' },
    select: { email: true }
  });
  console.log('PATIENT_EMAIL:', patient?.email);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
