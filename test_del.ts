import prisma from './src/lib/prisma.js';

async function main() {
    const c = await prisma.challenge.findMany();
    console.log(c.map(x => x.title));
}
main().finally(() => prisma.$disconnect());
