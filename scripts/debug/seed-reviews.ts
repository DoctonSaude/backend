import prisma from './src/lib/prisma.js';

async function main() {
  console.log('Seeding reviews...');

  // Get first partner
  const partner = await prisma.partner.findFirst({
     include: { User: true }
  });

  if (!partner) {
    console.error('No partner found. Please run main seed first.');
    return;
  }

  // Get some patients or create one
  let patient = await prisma.patient.findFirst({
      include: { User: true }
  });

  if (!patient) {
      console.log('Creating dummy patient for review...');
      const user = await prisma.user.create({
          data: {
              email: 'patient.review@test.com',
              password: 'password123',
              role: 'PATIENT',
              name: 'Ricardo Silva',
              updatedAt: new Date()
          }
      });
      patient = await prisma.patient.create({
          data: {
              userId: user.id,
              updatedAt: new Date()
          }
      });
  }

  // Create an appointment for the review (Review needs a unique appointmentId)
  const appointment = await prisma.appointment.create({
      data: {
          patientId: patient.id,
          partnerId: partner.id,
          dateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          status: 'COMPLETED',
          updatedAt: new Date()
      }
  });

  const reviews = [
    {
      appointmentId: appointment.id,
      partnerId: partner.id,
      patientId: patient.id,
      rating: 5,
      comment: 'Excelente atendimento! A Dra. foi muito atenciosa e esclareceu todas as minhas dúvidas sobre o tratamento.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  ];

  for (const r of reviews) {
    await prisma.review.upsert({
      where: { appointmentId: r.appointmentId },
      update: r,
      create: r
    });
  }

  // Create another one
  const app2 = await prisma.appointment.create({
      data: {
          patientId: patient.id,
          partnerId: partner.id,
          dateTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          status: 'COMPLETED',
          updatedAt: new Date()
      }
  });

  await prisma.review.create({
      data: {
          appointmentId: app2.id,
          partnerId: partner.id,
          patientId: patient.id,
          rating: 4,
          comment: 'Muito bom, mas o tempo de espera na recepção foi um pouco longo. O atendimento médico compensou.',
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
      }
  });

  console.log('Reviews seeded successfully for partner:', partner.User.name);
}

main()
  .catch(e => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
