
import { PrismaClient } from '../lib/generated/prisma/index.js';
import { supabase } from '../src/lib/supabase.js';
import { syncBoostPriceWithSupabase } from '../src/routes/prices.routes.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Fetching first BoostPrice...');
  const boost = await prisma.boostPrice.findFirst();
  if (!boost) {
    console.log('❌ No BoostPrice found');
    return;
  }
  console.log('✅ Found BoostPrice:', JSON.stringify(boost, null, 2));

  console.log('\n📝 Updating price to 129.99...');
  const updated = await prisma.boostPrice.update({
    where: { id: boost.id },
    data: { price: 129.99 }
  });
  console.log('✅ Updated BoostPrice:', JSON.stringify(updated, null, 2));

  console.log('\n🔄 Syncing to Supabase...');
  await syncBoostPriceWithSupabase(updated, 'update');

  console.log('\n✅ Test complete!');
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error('❌ Error:', e);
    prisma.$disconnect();
  });
