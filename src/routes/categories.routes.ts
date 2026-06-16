// @ts-nocheck
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { z } from 'zod';
import { syncPartnerServiceWithSupabase } from './prices.routes.js';
import { supabase } from '../lib/supabase.js';

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

const syncServiceCategoryWithSupabase = async (category: any, operation: 'create' | 'update' | 'delete') => {
    if (!supabase) return;
    try {
        console.log(`Syncing ServiceCategory with Supabase (operation: ${operation})`, category.id);
        if (operation === 'delete') {
            await supabase.from('ServiceCategory').delete().eq('id', category.id);
        } else {
            const supabaseData = {
                id: category.id,
                name: category.name,
                description: category.description,
                defaultMarkup: category.defaultMarkup,
                parentId: category.parentId,
                createdAt: category.createdAt?.toISOString ? category.createdAt.toISOString() : category.createdAt,
                updatedAt: category.updatedAt?.toISOString ? category.updatedAt.toISOString() : category.updatedAt
            };
            if (operation === 'create') {
                await supabase.from('ServiceCategory').insert([supabaseData]);
            } else {
                await supabase.from('ServiceCategory').update(supabaseData).eq('id', category.id);
            }
        }
    } catch (error) {
        console.error('Error syncing ServiceCategory with Supabase:', error);
    }
};

const router = Router();

const CategorySchema = z.object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    defaultMarkup: z.number().optional().nullable(),
    parentId: z.string().optional().nullable(),
});

// Listar categorias (formato plano ou árvore)
router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
    try {
        const categories = await prisma.serviceCategory.findMany({
            include: {
                other_ServiceCategory: true,
                _count: {
                    select: { PartnerService: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        next(error);
    }
});

// Criar categoria
router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
    try {
        const data = CategorySchema.parse(req.body);
        const category = await prisma.serviceCategory.create({
            data: {
                name: data.name,
                description: data.description,
                defaultMarkup: data.defaultMarkup,
                parentId: data.parentId
            }
        });
        await syncServiceCategoryWithSupabase(category, 'create');
        res.status(201).json(category);
    } catch (error) {
        next(error);
    }
});

// Atualizar categoria
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = CategorySchema.partial().parse(req.body);

        // Buscar categoria atual para ver se o markup mudou
        const currentCategory = await prisma.serviceCategory.findUnique({
            where: { id }
        });

        if (!currentCategory) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }

        const category = await prisma.serviceCategory.update({
            where: { id },
            data
        });

        // Se o markup mudou, cascatear para os serviços
        if (data.defaultMarkup !== undefined && data.defaultMarkup !== currentCategory.defaultMarkup) {
            console.log(`[CategoryCascade] Markup changed from ${currentCategory.defaultMarkup} to ${data.defaultMarkup}. Cascading...`);

            // Busca robusta: Por ID ou por Nome (se ID for null)
            const cleanName = currentCategory.name.replace(/s$/i, '').toLowerCase();

            // Buscar serviços desta categoria
            const servicesToUpdate = await prisma.PartnerService.findMany({
                where: {
                    AND: [
                        // Serviços que pertencem a esta categoria
                        {
                            OR: [
                                { serviceCategoryId: id },
                                {
                                    AND: [
                                        { serviceCategoryId: null },
                                        {
                                            category: {
                                                mode: 'insensitive',
                                                contains: cleanName
                                            }
                                        }
                                    ]
                                }
                            ]
                        },
                        // Serviços que não têm markup customizado ou tinham o markup antigo
                        {
                            OR: [
                                { doctonFeePercent: null },
                                { doctonFeePercent: currentCategory.defaultMarkup }
                            ]
                        }
                    ]
                },
                include: {
                    Partner: { select: { consultationPrice: true } }
                }
            });

            console.log(`[CategoryCascade] Found ${servicesToUpdate.length} services to update for category ${currentCategory.name}.`);

            // Atualizar cada serviço recalculando o preço em chunks para ser mais rápido
            await processInChunks(servicesToUpdate, 20, async (service) => {
                const payout = service.partnerPayout || service.partner?.consultationPrice || 0;
                const newMarkup = data.defaultMarkup || 0;
                const newPrice = payout * (1 + (newMarkup / 100));

                console.log(`[CategoryCascade] Updating service "${service.name}": price ${service.price} -> ${newPrice}, markup: ${newMarkup}%`);

                const updatedService = await prisma.PartnerService.update({
                    where: { id: service.id },
                    data: {
                        price: newPrice,
                        basePrice: newPrice,
                        doctonFeePercent: newMarkup // Atualizar o markup do serviço também
                    }
                });
                
                await syncPartnerServiceWithSupabase(updatedService, 'update');
            });
        }

        await syncServiceCategoryWithSupabase(category, 'update');
        res.json(category);
    } catch (error) {
        next(error);
    }
});

// Excluir categoria
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verificar se tem filhos
        const hasChildren = await prisma.serviceCategory.count({
            where: { parentId: id }
        });

        if (hasChildren > 0) {
            return res.status(400).json({
                error: 'Não é possível excluir uma categoria que possui subcategorias.'
            });
        }

        await prisma.serviceCategory.delete({ where: { id } });
        await syncServiceCategoryWithSupabase({ id }, 'delete');
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
