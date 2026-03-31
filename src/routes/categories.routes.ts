import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';

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
                children: true,
                _count: {
                    select: { services: true }
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
            const servicesToUpdate = await prisma.partnerService.findMany({
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
                    partner: { select: { consultationPrice: true } }
                }
            });

            console.log(`[CategoryCascade] Found ${servicesToUpdate.length} services to update for category ${currentCategory.name}.`);

            // Atualizar cada serviço recalculando o preço
            for (const service of servicesToUpdate) {
                const payout = service.partnerPayout || service.partner?.consultationPrice || 0;
                const newMarkup = data.defaultMarkup || 0;
                const newPrice = payout * (1 + (newMarkup / 100));

                console.log(`[CategoryCascade] Updating service "${service.name}": price ${service.price} -> ${newPrice}, markup: ${newMarkup}%`);

                await prisma.partnerService.update({
                    where: { id: service.id },
                    data: {
                        price: newPrice,
                        basePrice: newPrice,
                        doctonFeePercent: newMarkup // Atualizar o markup do serviço também
                    }
                });
            }
        }

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
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
