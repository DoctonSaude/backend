const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function test() {
  console.log('--- STARTING MANUAL REGISTRATION TEST ---');
  try {
    const email = `test_${Date.now()}@example.com`;
    
    // Teste 1: Verification Token
    console.log('Testing VerificationToken create...');
    await prisma.verificationToken.create({
      data: {
        token: 'test-token',
        email: email,
        expiresAt: new Date(Date.now() + 3600000)
      }
    });
    console.log('VerificationToken OK');

    // Teste 2: User + Patient Transaction
    console.log('Testing User + Patient creation...');
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: 'hashedpassword',
          name: 'Test User',
          role: 'PATIENT'
        }
      });
      
      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          cpf: `TEMP-${Date.now()}`,
          birthDate: new Date()
        }
      });
      return { user, patient };
    });
    console.log('User + Patient OK:', result.user.id);

  } catch (error) {
    console.error('REGISTRATION TEST FAILED:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
