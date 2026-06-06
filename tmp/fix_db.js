const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fixing orphan familyGroupId...');
  try {
    await prisma.$executeRawUnsafe(`UPDATE "Patient" SET "familyGroupId" = NULL WHERE "familyGroupId" NOT IN (SELECT id FROM "FamilyGroup")`);
    console.log('Successfully fixed database constraints.');
  } catch (err) {
    console.error('Error fixing database constraints', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
