import { PrismaClient } from '../lib/generated/prisma/index.js';
import { supabase } from '../src/lib/supabase.js';

const prisma = new PrismaClient();

async function syncPlans() {
  console.log('\n🔄 Sincronizando Planos com o Supabase...');
  const Plan = await prisma.plan.findMany();
  console.log(`📋 Encontrados ${Plan.length} planos no banco de dados`);

  for (const plan of Plan) {
    try {
      console.log(`\n🔄 Sincronizando plano: ${plan.name} (ID: ${plan.id})`);
      
      const supabasePlan = {
        id: plan.id,
        key: plan.key,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        interval: plan.interval,
        features: plan.features,
        featuresArray: plan.featuresArray,
        isActive: plan.isActive,
        isPopular: plan.isPopular,
        displayPrice: plan.displayPrice,
        order: plan.order,
        ctaLink: plan.ctaLink,
        ctaText: plan.ctaText,
        createdAt: plan.createdAt?.toISOString(),
        updatedAt: plan.updatedAt?.toISOString()
      };

      const { data: existing, error: findError } = await supabase
        .from('Plan')
        .select('id')
        .eq('id', plan.id)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar plano existente:', findError);
        continue;
      }

      let result;
      if (existing) {
        result = await supabase.from('Plan').update(supabasePlan).eq('id', plan.id);
      } else {
        result = await supabase.from('Plan').insert([supabasePlan]);
      }

      if (result.error) {
        console.error('❌ Erro ao sincronizar plano:', result.error);
      } else {
        console.log('✅ Plano sincronizado com sucesso!');
      }

    } catch (error) {
      console.error(`❌ Falha ao sincronizar plano ${plan.id}:`, error);
    }
  }
}

async function syncPartnerServices() {
  console.log('\n🔄 Sincronizando PartnerServices com o Supabase...');
  const services = await prisma.partnerService.findMany();
  console.log(`📋 Encontrados ${services.length} serviços no banco de dados`);

  for (const service of services) {
    try {
      console.log(`\n🔄 Sincronizando serviço: ${service.name} (ID: ${service.id})`);
      
      const supabaseService = {
        id: service.id,
        partnerId: service.partnerId,
        name: service.name,
        category: service.category,
        description: service.description,
        basePrice: service.basePrice,
        partnerPayout: service.partnerPayout,
        doctonFeePercent: service.doctonFeePercent,
        discountBasic: service.discountBasic,
        discountPremium: service.discountPremium,
        discountEnterprise: service.discountEnterprise,
        isActive: service.isActive,
        duration: service.duration,
        isOnline: service.isOnline,
        isPresencial: service.isPresencial,
        price: service.price,
        appointments: service.appointments,
        serviceCategoryId: service.serviceCategoryId,
        createdAt: service.createdAt?.toISOString(),
        updatedAt: service.updatedAt?.toISOString()
      };

      const { data: existing, error: findError } = await supabase
        .from('PartnerService')
        .select('id')
        .eq('id', service.id)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar serviço existente:', findError);
        continue;
      }

      let result;
      if (existing) {
        result = await supabase.from('PartnerService').update(supabaseService).eq('id', service.id);
      } else {
        result = await supabase.from('PartnerService').insert([supabaseService]);
      }

      if (result.error) {
        console.error('❌ Erro ao sincronizar serviço:', result.error);
      } else {
        console.log('✅ Serviço sincronizado com sucesso!');
      }

    } catch (error) {
      console.error(`❌ Falha ao sincronizar serviço ${service.id}:`, error);
    }
  }
}

async function syncBoostPrices() {
  console.log('\n🔄 Sincronizando BoostPrices com o Supabase...');
  const boostPrices = await prisma.boostPrice.findMany();
  console.log(`📋 Encontrados ${boostPrices.length} boost prices no banco de dados`);

  for (const boostPrice of boostPrices) {
    try {
      console.log(`\n🔄 Sincronizando boost price: ${boostPrice.type} (ID: ${boostPrice.id})`);
      
      const supabaseBoostPrice = {
        id: boostPrice.id,
        type: boostPrice.type,
        price: boostPrice.price,
        description: boostPrice.description,
        updatedAt: boostPrice.updatedAt?.toISOString()
      };

      const { data: existing, error: findError } = await supabase
        .from('BoostPrice')
        .select('id')
        .eq('id', boostPrice.id)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar boost price existente:', findError);
        continue;
      }

      let result;
      if (existing) {
        result = await supabase.from('BoostPrice').update(supabaseBoostPrice).eq('id', boostPrice.id);
      } else {
        result = await supabase.from('BoostPrice').insert([supabaseBoostPrice]);
      }

      if (result.error) {
        console.error('❌ Erro ao sincronizar boost price:', result.error);
      } else {
        console.log('✅ Boost price sincronizado com sucesso!');
      }

    } catch (error) {
      console.error(`❌ Falha ao sincronizar boost price ${boostPrice.id}:`, error);
    }
  }
}

async function main() {
  console.log('🔄 Testando sincronização completa com o Supabase...');

  if (!supabase) {
    console.error('❌ Cliente Supabase não inicializado!');
    process.exit(1);
  }

  console.log('✅ Cliente Supabase inicializado com sucesso!');

  await syncPlans();
  await syncPartnerServices();
  await syncBoostPrices();

  // Verificar todos os dados no Supabase
  const { data: supabasePlans, error: PlanError } = await supabase.from('Plan').select('*');
  const { data: supabaseServices, error: servicesError } = await supabase.from('PartnerService').select('*');
  const { data: supabaseBoostPrices, error: boostError } = await supabase.from('BoostPrice').select('*');

  console.log('\n=== Resumo Final ===');
  if (PlanError) {
    console.error('❌ Erro ao listar planos:', PlanError);
  } else {
    console.log(`✅ ${supabasePlans?.length || 0} planos no Supabase`);
  }
  if (servicesError) {
    console.error('❌ Erro ao listar serviços:', servicesError);
  } else {
    console.log(`✅ ${supabaseServices?.length || 0} serviços no Supabase`);
  }
  if (boostError) {
    console.error('❌ Erro ao listar boost prices:', boostError);
  } else {
    console.log(`✅ ${supabaseBoostPrices?.length || 0} boost prices no Supabase`);
  }

  console.log('\n=== Sincronização concluída! ===');
}

main()
  .catch(e => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
