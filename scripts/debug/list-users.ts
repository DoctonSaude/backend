
import prisma from './src/lib/prisma.js';
async function run() {
  const users = await prisma.user.findMany({ select: { email: true, role: true } });
  console.log(JSON.stringify(users, null, 2));
}
run().then(() => process.exit(0));
