
import prisma from './src/lib/prisma.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function createUser() {
  const email = 'doctonsaude@gmail.com';
  const password = await bcrypt.hash('081126', 12);
  
  console.log(`Checking if user ${email} exists...`);
  
  const existing = await prisma.user.findUnique({ where: { email } });
  
  if (existing) {
    console.log('User already exists. Updating password...');
    await prisma.user.update({
      where: { email },
      data: { password }
    });
  } else {
    console.log('Creating admin user...');
    await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        password,
        role: 'ADMIN',
        name: 'Rodrigo Vilela',
        updatedAt: new Date()
      }
    });
  }
  
  console.log('Done.');
}

createUser().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
