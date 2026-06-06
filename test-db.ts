import prisma from './src/lib/prisma.js';

async function test() {
  try {
    const user = await prisma.user.findFirst();
    console.log("DB Connection OK. User found:", user?.email);
  } catch (error) {
    console.error("DB Connection Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
