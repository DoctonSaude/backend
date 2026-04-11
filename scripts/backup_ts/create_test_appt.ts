import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const patientId = 'cmngasjui0002gt54r3f5ro3i';
  const partnerId = 'cmnhtyi2900109jlwufg799er';
  
  const dateTime = new Date();
  dateTime.setMinutes(dateTime.getMinutes() + 5); // 5 minutes from now
  
  const appt = await prisma.appointment.create({
    data: {
      patientId,
      partnerId,
      dateTime,
      duration: 60,
      isOnline: true,
      status: 'SCHEDULED'
    }
  });
  console.log('Test appointment created:', appt.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
