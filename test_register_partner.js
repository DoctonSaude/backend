const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function testPartner() {
  console.log('--- STARTING PARTNER REGISTRATION TEST ---');
  try {
    const email = `partner_${Date.now()}@example.com`;
    
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: 'hashedpassword',
          name: 'Partner Test',
          role: 'PARTNER'
        }
      });
      
      const partner = await tx.partner.create({
        data: {
          userId: user.id,
          name: user.name,
          type: 'INDIVIDUAL',
          specialty: 'Cardiology',
          isApproved: false
        }
      });
      return { user, partner };
    });
    console.log('Partner OK:', result.partner.id);

  } catch (error) {
    console.error('PARTNER REGISTRATION FAILED:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testPartner();
