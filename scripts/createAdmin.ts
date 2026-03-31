import { PrismaClient } from '../lib/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Criando administrador principal...');

  const email = 'doctonsaude@gmail.com';
  const plainPassword = '081126';
  const name = 'Rodrigo Vilela';

  const hashed = await bcrypt.hash(plainPassword, 10);

  // 1. Procurar Usuário
  let user = await prisma.user.findUnique({
    where: { email }
  });

  let personId = user?.personId;

  if (!personId) {
    const person = await prisma.person.create({
      data: {
        name,
        phone: '+5500000000000',
      }
    });
    personId = person.id;
  } else {
    await prisma.person.update({
      where: { id: personId },
      data: { name }
    });
  }

  // 2. Criar ou Atualizar Usuário
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: 'ADMIN',
        name,
        emailVerified: true,
        personId: personId
      }
    });
    console.log(`✅ Usuário criado: ${email} | Role: ADMIN`);
  } else {
    user = await prisma.user.update({
      where: { email },
      data: {
        password: hashed,
        role: 'ADMIN',
        name,
        personId: personId
      }
    });
    console.log(`ℹ️ Usuário já existia. Senha, Nome e Role (ADMIN) atualizados.`);
  }

  // 3. Criar ou Atualizar Entidade Admin
  let admin = await prisma.admin.findUnique({
    where: { userId: user.id }
  });

  if (!admin) {
    admin = await prisma.admin.create({
      data: {
        userId: user.id,
        permissions: ['*']
      }
    });
    console.log('✅ Entidade Admin criada com sucesso.');
  } else {
    admin = await prisma.admin.update({
      where: { userId: user.id },
      data: {
        permissions: ['*']
      }
    });
    console.log('ℹ️ Entidade Admin já existia. Permissões atualizadas.');
  }

  console.log('----------------------------------------------------');
  console.log(`✅ Admin Principal criado com sucesso!`);
  console.log(`Email: ${email}`);
  console.log(`Senha: ${plainPassword}`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Erro ao criar admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
