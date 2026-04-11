import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const patient = await prisma.patient.findFirst({
    include: { user: true }
  });
  const partner = await prisma.partner.findFirst({
    include: { user: true }
  });

  console.log('--- PATIENT ---');
  console.log(JSON.stringify(patient, null, 2));
  console.log('--- PARTNER ---');
  console.log(JSON.stringify(partner, null, 2));

  // Create a test online appointment if they exist
  if (patient && partner) {
    const dateTime = new Date();
    dateTime.setHours(dateTime.getHours() + 1); // 1h from now
    
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        partnerId: partner.id,
        dateTime,
        duration: 60,
        isOnline: true,
        status: 'SCHEDULED'
      }
    });
    console.log('--- TEST APPOINTMENT CREATED ---');
    console.log(JSON.stringify(appointment, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
