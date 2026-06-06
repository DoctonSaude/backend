import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('--- Database Connectivity Audit ---')
    const userCount = await prisma.user.count()
    console.log(`✅ Supabase Connection: SUCCESS`)
    console.log(`📊 Total Users in DB: ${userCount}`)
    
    // Check key tables
    const pharmacyCount = await prisma.pharmacy.count()
    console.log(`🏪 Total Pharmacies in DB: ${pharmacyCount}`)
    
    const roles = await prisma.role.count()
    console.log(`🔑 Total Roles defined: ${roles}`)
    
    console.log('--- CRUD Verification ---')
    console.log('✅ READ: Success')
  } catch (e: any) {
    console.error('❌ Connectivity Failure:', e.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
