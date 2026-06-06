
import prisma from './src/lib/prisma.js';

async function main() {
  const email = 'agenciaviajebus@gmail.com';
  console.log(`Checking user & profile for: ${email}`);
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        Patient: true,
        Partner: true
      }
    });
    
    if (user) {
      console.log('--- User Info ---');
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Phone (User table): ${user.phone}`);
      
      if (user.Patient) {
        console.log('--- Patient Profile ---');
        console.log(`Phone (Patient table): ${user.Patient.phone}`);
        console.log(`CPF: ${user.Patient.cpf}`);
      }

      // If user phone is empty but patient has it, sync them
      if (!user.phone && user.Patient?.phone) {
        console.log('Syncing phone from Patient to User table...');
        await prisma.user.update({
          where: { id: user.id },
          data: { phone: user.Patient.phone }
        });
        console.log('Phone synced successfully!');
      }
    } else {
      console.log('User not found.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
