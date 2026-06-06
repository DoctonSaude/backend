
import prisma from './src/lib/prisma';

async function main() {
  const partnersCount = await prisma.partner.count()
  const usersCount = await prisma.user.count()
  console.log(`Partners: ${partnersCount}`)
  console.log(`Users: ${usersCount}`)
  
  if (partnersCount > 0) {
    const samples = await prisma.partner.findMany({
      take: 2,
      include: { User: { select: { name: true } } }
    })
    console.log('Sample Partners:', JSON.stringify(samples, null, 2))
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
