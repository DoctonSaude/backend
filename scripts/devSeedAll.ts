import { PrismaClient } from '../lib/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding development data...');

  const hashed = await bcrypt.hash('123456', 10);

  // 1. Create Patient User
  let patientUser = await prisma.user.findUnique({
    where: { email: 'patient.dev@docton.com' }
  });

  if (!patientUser) {
    const person = await prisma.person.create({
      data: {
        name: 'Paciente Dev',
        phone: '+5511999999999'
      }
    });

    patientUser = await prisma.user.create({
      data: {
        email: 'patient.dev@docton.com',
        password: hashed,
        role: 'PATIENT',
        emailVerified: true,
        personId: person.id
      }
    });

    await prisma.patient.create({
      data: {
        personId: person.id,
        userId: patientUser.id,
        bloodType: 'A+',
        archetype: 'GENERAL',
        healthPoints: 100,
        experiencePoints: 50,
        level: 1,
        onboardingCompleted: true
      }
    });
    console.log('✅ Patient user created: patient.dev@docton.com / 123456');
  } else {
    console.log('ℹ️ Patient user already exists');
  }

  // 2. Create Partner User
  let partnerUser = await prisma.user.findUnique({
    where: { email: 'partner.dev@docton.com' }
  });

  if (!partnerUser) {
    const person = await prisma.person.create({
      data: {
        name: 'Dr. Parceiro Dev',
        phone: '+5511888888888'
      }
    });

    partnerUser = await prisma.user.create({
      data: {
        email: 'partner.dev@docton.com',
        password: hashed,
        role: 'PARTNER',
        emailVerified: true,
        personId: person.id
      }
    });

    await prisma.partner.create({
      data: {
        personId: person.id,
        userId: partnerUser.id,
        isApproved: true,
        type: 'INDIVIDUAL',
        specialty: 'Médico Geral'
      }
    });
    console.log('✅ Partner user created: partner.dev@docton.com / 123456');
  } else {
    console.log('ℹ️ Partner user already exists');
  }

  // 3. Create a Challenge
  const challenge = await prisma.challenge.upsert({
    where: { id: 'dev-challenge-1' },
    update: {},
    create: {
      id: 'dev-challenge-1',
      title: 'Desafio Dev de Boas-vindas',
      description: 'Complete este desafio para testar a gamificação.',
      type: 'DAILY',
      points: 50,
      category: 'health',
      isActive: true
    }
  });
  console.log('✅ Challenge created: dev-challenge-1');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
