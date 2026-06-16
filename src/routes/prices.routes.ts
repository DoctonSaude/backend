// @ts-nocheck
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { supabase } from '../lib/supabase.js';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

// Helper para executar em chunks (evitar gargalos)
const processInChunks = async <T, R>(items: T[], chunkSize: number, processor: (item: T) => Promise<R>) => {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(chunk.map(processor));
        results.push(...chunkResults);
    }
    return results;
};

// Sync PartnerService with Supabase
export const syncPartnerServiceWithSupabase = async (service: any, operation: 'create' | 'update' | 'delete') => {
    if (!supabase) {
        console.warn('Supabase client not initialized - skipping PartnerService sync');
        return;
    }

    try {
        console.log(`Syncing PartnerService with Supabase (operation: ${operation})`, service.id);

        if (operation === 'delete') {
            const { error } = await supabase.from('PartnerService').delete().eq('id', service.id);
            if (error) {
                console.error('Error deleting PartnerService from Supabase:', error);
                throw error;
            }
            console.log('PartnerService deleted from Supabase successfully');
        } else {
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
                createdAt: service.createdAt?.toISOString ? service.createdAt.toISOString() : service.createdAt,
                updatedAt: service.updatedAt?.toISOString ? service.updatedAt.toISOString() : service.updatedAt
            };

            console.log('Supabase PartnerService data:', supabaseService);

            if (operation === 'create') {
                const { error } = await supabase.from('PartnerService').insert([supabaseService]);
                if (error) {
                    console.error('Error inserting PartnerService into Supabase:', error);
                    throw error;
                }
                console.log('PartnerService created in Supabase successfully');
            } else if (operation === 'update') {
                const { error } = await supabase.from('PartnerService').update(supabaseService).eq('id', service.id);
                if (error) {
                    console.error('Error updating PartnerService in Supabase:', error);
                    throw error;
                }
                console.log('PartnerService updated in Supabase successfully');
            }
        }
    } catch (error) {
        console.error('Error syncing PartnerService with Supabase:', error);
    }
};

// Sync BoostPrice with Supabase
const syncBoostPriceWithSupabase = async (boostPrice: any, operation: 'create' | 'update' | 'delete') => {
    if (!supabase) {
        console.warn('Supabase client not initialized - skipping BoostPrice sync');
        return;
    }

    try {
        console.log(`Syncing BoostPrice with Supabase (operation: ${operation})`, boostPrice.id);

        if (operation === 'delete') {
            const { error } = await supabase.from('BoostPrice').delete().eq('id', boostPrice.id);
            if (error) {
                console.error('Error deleting BoostPrice from Supabase:', error);
                throw error;
            }
            console.log('BoostPrice deleted from Supabase successfully');
        } else {
            const supabaseBoostPrice = {
                id: boostPrice.id,
                type: boostPrice.type,
                price: boostPrice.price,
                description: boostPrice.description,
                updatedAt: boostPrice.updatedAt?.toISOString ? boostPrice.updatedAt.toISOString() : boostPrice.updatedAt
            };

            console.log('Supabase BoostPrice data:', supabaseBoostPrice);

            if (operation === 'create') {
                const { error } = await supabase.from('BoostPrice').insert([supabaseBoostPrice]);
                if (error) {
                    console.error('Error inserting BoostPrice into Supabase:', error);
                    throw error;
                }
                console.log('BoostPrice created in Supabase successfully');
            } else if (operation === 'update') {
                const { error } = await supabase.from('BoostPrice').update(supabaseBoostPrice).eq('id', boostPrice.id);
                if (error) {
                    console.error('Error updating BoostPrice in Supabase:', error);
                    throw error;
                }
                console.log('BoostPrice updated in Supabase successfully');
            }
        }
    } catch (error) {
        console.error('Error syncing BoostPrice with Supabase:', error);
    }
};

// Get Prices (PartnerServices)
router.get('/', async (req, res) => {
    try {
        let services = [];
        try {
            // First attempt with Partner include
            services = await prisma.partnerService.findMany({
                include: { partner: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        } catch (includeError) {
            console.warn('[Prices] Warning: Query with include failed, falling back to basic query.', includeError);
            // Fallback without include
            services = await prisma.partnerService.findMany({
                orderBy: { createdAt: 'desc' }
            });
        }

        // Map uppercase Prisma relations to lowercase for the frontend
        const mappedServices = services.map((s: any) => {
            const mapped = { ...s };
            if (mapped.Partner) {
                mapped.partner = { name: mapped.Partner.name };
                delete mapped.Partner;
            }
            if (mapped.ServiceCategory) {
                mapped.serviceCategory = mapped.ServiceCategory;
                delete mapped.ServiceCategory;
            }
            return mapped;
        });

        res.json({ data: mappedServices });
    } catch (error: any) {
        console.error('[Prices] Critical Error getting prices:', error);
        res.status(500).json({ error: 'Failed to fetch prices', details: error?.message || 'Unknown error' });
    }
});

// Create Price (PartnerService)
router.post('/', async (req, res) => {
    try {
        const schema = z.object({
            partnerId: z.string(),
            name: z.string(),
            category: z.string().optional(),
            description: z.string().optional(),
            basePrice: z.number().min(0),
            partnerPayout: z.number().min(0).optional(),
            doctonFeePercent: z.number().min(0).optional(),
            discountBasic: z.number().min(0).optional(),
            discountPremium: z.number().min(0).optional(),
            discountEnterprise: z.number().min(0).optional(),
            serviceCategoryId: z.string().optional().nullable(),
        });

        const data = schema.parse(req.body);
        console.log('[Prices] Creating with data:', JSON.stringify(data));

        // Calcular preço final (venda) se tiver repasse e markup (como PERCENTUAL)
        let calculatedPrice = data.basePrice;
        if (data.partnerPayout !== undefined && data.doctonFeePercent !== undefined) {
            calculatedPrice = data.partnerPayout * (1 + data.doctonFeePercent / 100);
        }

        const service = await prisma.partnerService.create({
            data: {
                partnerId: data.partnerId,
                name: data.name,
                category: data.category || 'Consultas',
                description: data.description,
                price: calculatedPrice,
                basePrice: calculatedPrice,
                partnerPayout: data.partnerPayout,
                doctonFeePercent: data.doctonFeePercent,
                discountBasic: data.discountBasic || 0,
                discountPremium: data.discountPremium || 0,
                discountEnterprise: data.discountEnterprise || 0,
                duration: 30,
                isOnline: false,
                isPresencial: true,
                isActive: true,
                appointments: 0,
                serviceCategoryId: data.serviceCategoryId
            },
            include: { partner: { select: { name: true } },
                ServiceCategory: { select: { name: true } }
            }
        });

        // Sync with Supabase
        await syncPartnerServiceWithSupabase(service, 'create');

        res.json({ data: service });
    } catch (error) {
        console.error('Error creating price:', error);
        res.status(400).json({ error: 'Failed to create price' });
    }
});

// Update Price
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const schema = z.object({
            name: z.string().optional(),
            category: z.string().optional(),
            description: z.string().optional(),
            basePrice: z.number().min(0).optional(),
            partnerPayout: z.number().min(0).optional(),
            doctonFeePercent: z.number().min(0).max(100).optional(),
            discountBasic: z.number().min(0).max(100).optional(),
            discountPremium: z.number().min(0).max(100).optional(),
            discountEnterprise: z.number().min(0).max(100).optional(),
            isActive: z.boolean().optional(),
            serviceCategoryId: z.string().optional().nullable(),
        });

        const data = schema.parse(req.body);
        console.log('[Prices] Updating ID:', id, 'with data:', JSON.stringify(data, null, 2));

        // Buscar serviço atual para cálculo se necessário
        const current = await prisma.partnerService.findUnique({ where: { id } });
        const currentService = await prisma.partnerService.findUnique({ where: { id } });
        if (!currentService) return res.status(404).json({ error: 'Serviço não encontrado' });

        const updateData: any = { ...data };

        // Recalcular preço se repasse ou markup mudarem
        let payoutValue = data.partnerPayout !== undefined ? data.partnerPayout : (currentService.partnerPayout || currentService.price);
        let markupValue = data.doctonFeePercent !== undefined ? data.doctonFeePercent : currentService.doctonFeePercent;

        if (payoutValue !== null && markupValue !== null && markupValue !== undefined) {
            const calculatedPrice = payoutValue * (1 + markupValue / 100);
            updateData.price = calculatedPrice;
            updateData.basePrice = calculatedPrice;
        } else if (data.basePrice !== undefined) {
            updateData.price = data.basePrice;
        }

        const service = await prisma.partnerService.update({
            where: { id },
            data: updateData,
            include: { partner: { select: { name: true } },
                ServiceCategory: { select: { name: true } }
            }
        });

        // Sync with Supabase
        await syncPartnerServiceWithSupabase(service, 'update');

        res.json({ data: service });
    } catch (error) {
        console.error('Error updating price:', error);
        res.status(500).json({ error: 'Failed to update price' });
    }
});

// Delete Price
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Get service before deleting
        const service = await prisma.partnerService.findUnique({ where: { id } });
        await prisma.partnerService.delete({ where: { id } });

        // Sync with Supabase
        if (service) {
            await syncPartnerServiceWithSupabase(service, 'delete');
        }

        res.json({ data: { success: true } });
    } catch (error) {
        console.error('Error deleting price:', error);
        res.status(500).json({ error: 'Failed to delete price' });
    }
});

// Sincronizar descontos Gold/Premium para TODOS os serviços
router.post('/sync-discounts', async (req, res) => {
    try {
        const schema = z.object({
            discountGold: z.number().min(0).optional(),
            discountPremium: z.number().min(0).optional(),
        });

        const data = schema.parse(req.body);
        console.log('[Prices] Syncing discounts to all services:', JSON.stringify(data));

        const updateData: Record<string, number> = {};
        if (data.discountGold !== undefined) {
            updateData.discountBasic = data.discountGold; // Gold = discountBasic no esquema
        }
        if (data.discountPremium !== undefined) {
            updateData.discountPremium = data.discountPremium;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Nenhum desconto fornecido' });
        }

        // Primeiro, buscar todos os serviços para depois sincronizar individualmente
        const services = await prisma.partnerService.findMany();
        
        // Atualizar cada serviço em chunks para ser muito mais rápido
        let syncCount = 0;
        await processInChunks(services, 20, async (service) => {
            const updated = await prisma.partnerService.update({
                where: { id: service.id },
                data: updateData,
                include: { partner: { select: { name: true } },
                    ServiceCategory: { select: { name: true } }
                }
            });
            
            await syncPartnerServiceWithSupabase(updated, 'update');
            syncCount++;
        });

        console.log(`[Prices] Synced discounts to ${syncCount} services`);

        res.json({
            data: {
                success: true,
                updated: syncCount,
                message: `Descontos aplicados a ${syncCount} serviços`
            }
        });
    } catch (error) {
        console.error('Error syncing discounts:', error);
        res.status(500).json({ error: 'Falha ao sincronizar descontos' });
    }
});

// Sincronizar Markup Padrão para TODOS os serviços
router.post('/sync-markup', async (req, res) => {
    try {
        const schema = z.object({
            globalMarkup: z.number().min(0).optional().nullable(),
        });

        const { globalMarkup } = schema.parse(req.body);
        console.log(`[Prices] Syncing markup (globalMarkup=${globalMarkup})`);

        const services = await prisma.partnerService.findMany({
            include: { ServiceCategory: true, Partner: true }
        });
        
        let syncCount = 0;
        let skipCount = 0;

        await processInChunks(services, 20, async (service) => {
            let targetMarkup: number | null | undefined = undefined;

            if (globalMarkup !== undefined && globalMarkup !== null) {
                targetMarkup = globalMarkup;
            } else if (service.ServiceCategory && service.ServiceCategory.defaultMarkup !== null) {
                targetMarkup = service.ServiceCategory.defaultMarkup;
            }

            if (targetMarkup === undefined || targetMarkup === null) {
                skipCount++;
                return;
            }

            // Calculando novo preco (partnerPayout + targetMarkup como percentual)
            const payout = service.partnerPayout || service.price || 0;
            const calculatedPrice = payout * (1 + targetMarkup / 100);

            const updated = await prisma.partnerService.update({
                where: { id: service.id },
                data: {
                    doctonFeePercent: targetMarkup,
                    price: calculatedPrice,
                    basePrice: calculatedPrice
                },
                include: { partner: { select: { name: true } },
                    ServiceCategory: { select: { name: true } }
                }
            });
            
            await syncPartnerServiceWithSupabase(updated, 'update');
            syncCount++;
        });

        console.log(`[Prices] Synced markup to ${syncCount} services. Skipped ${skipCount}.`);

        res.json({
            data: {
                success: true,
                updated: syncCount,
                skipped: skipCount,
                message: `Markup sincronizado em ${syncCount} serviços`
            }
        });
    } catch (error) {
        console.error('Error syncing markup:', error);
        res.status(500).json({ error: 'Falha ao sincronizar markup' });
    }
});

// Sincronizar Classificações (Reajuste em Massa)
router.post('/sync-classifications', async (req, res) => {
    try {
        const schema = z.object({
            percent: z.preprocess((val) => Number(val), z.number()),
        });

        const { percent } = schema.parse(req.body);
        console.log(`[Prices] Syncing classifications (percent=${percent}%)`);

        const services = await prisma.partnerService.findMany();
        
        let syncCount = 0;

        await processInChunks(services, 20, async (service) => {
            const currentBase = service.basePrice ?? service.price ?? 0;
            const newBasePrice = currentBase * (1 + percent / 100);
            
            const updated = await prisma.partnerService.update({
                where: { id: service.id },
                data: {
                    basePrice: newBasePrice,
                    // Atualizar price caso basePrice mude
                    price: newBasePrice
                },
                include: { partner: { select: { name: true } },
                    ServiceCategory: { select: { name: true } }
                }
            });
            
            await syncPartnerServiceWithSupabase(updated, 'update');
            syncCount++;
        });

        console.log(`[Prices] Synced classifications to ${syncCount} services`);

        res.json({
            data: {
                success: true,
                updated: syncCount,
                message: `Reajuste aplicado a ${syncCount} serviços`
            }
        });
    } catch (error) {
        console.error('Error syncing classifications:', error);
        res.status(500).json({ error: 'Falha ao aplicar reajuste em massa' });
    }
});

// Boost Prices Routes
router.get('/boost-prices', async (req, res) => {
    try {
        const boostPrices = await prisma.boostPrice.findMany();
        res.json({ data: boostPrices });
    } catch (error) {
        console.error('Error getting boost prices:', error);
        res.status(500).json({ error: 'Failed to fetch boost prices' });
    }
});

router.put('/boost-prices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const schema = z.object({
            price: z.number().min(0).optional(),
            description: z.string().optional(),
        });
        const data = schema.parse(req.body);

        const updatedBoostPrice = await prisma.boostPrice.update({
            where: { id },
            data
        });

        // Sync with Supabase
        await syncBoostPriceWithSupabase(updatedBoostPrice, 'update');

        res.json({ data: updatedBoostPrice });
    } catch (error) {
        console.error('Error updating boost price:', error);
        res.status(500).json({ error: 'Failed to update boost price' });
    }
});

// Sync all PartnerServices and BoostPrices with Supabase
router.post('/sync-all', async (req, res) => {
    try {
        console.log('Iniciando sincronização completa de serviços e boost prices com Supabase...');
        
        // Sync PartnerServices
        const services = await prisma.partnerService.findMany();
        console.log(`Encontrados ${services.length} serviços para sincronizar`);

        for (const service of services) {
            try {
                await syncPartnerServiceWithSupabase(service, 'update');
            } catch (error) {
                console.error(`Falha ao sincronizar serviço ${service.id}:`, error);
            }
        }

        // Sync BoostPrices
        const boostPrices = await prisma.boostPrice.findMany();
        console.log(`Encontrados ${boostPrices.length} boost prices para sincronizar`);

        for (const boostPrice of boostPrices) {
            try {
                await syncBoostPriceWithSupabase(boostPrice, 'update');
            } catch (error) {
                console.error(`Falha ao sincronizar boost price ${boostPrice.id}:`, error);
            }
        }

        console.log('Sincronização completa concluída!');
        res.json({
            success: true,
            data: {
                services: services.length,
                boostPrices: boostPrices.length
            }
        });
    } catch (error) {
        console.error('Erro ao sincronizar tudo:', error);
        res.status(500).json({ error: 'Failed to sync all' });
    }
});

export default router;
