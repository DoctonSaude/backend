"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const CategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional().nullable(),
    defaultMarkup: zod_1.z.number().optional().nullable(),
    parentId: zod_1.z.string().optional().nullable(),
});
// Listar categorias (formato plano ou árvore)
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const categories = await prisma_1.default.serviceCategory.findMany({
            include: {
                children: true,
                _count: {
                    select: { services: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    }
    catch (error) {
        next(error);
    }
});
// Criar categoria
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const data = CategorySchema.parse(req.body);
        const category = await prisma_1.default.serviceCategory.create({
            data: {
                name: data.name,
                description: data.description,
                defaultMarkup: data.defaultMarkup,
                parentId: data.parentId
            }
        });
        res.status(201).json(category);
    }
    catch (error) {
        next(error);
    }
});
// Atualizar categoria
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = CategorySchema.partial().parse(req.body);
        // Buscar categoria atual para ver se o markup mudou
        const currentCategory = await prisma_1.default.serviceCategory.findUnique({
            where: { id }
        });
        if (!currentCategory) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        const category = await prisma_1.default.serviceCategory.update({
            where: { id },
            data
        });
        // Se o markup mudou, cascatear para os serviços
        if (data.defaultMarkup !== undefined && data.defaultMarkup !== currentCategory.defaultMarkup) {
            console.log(`[CategoryCascade] Markup changed from ${currentCategory.defaultMarkup} to ${data.defaultMarkup}. Cascading...`);
            // Busca robusta: Por ID ou por Nome (se ID for null)
            const cleanName = currentCategory.name.replace(/s$/i, '').toLowerCase();
            // Buscar serviços desta categoria
            const servicesToUpdate = await prisma_1.default.partnerService.findMany({
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
                await prisma_1.default.partnerService.update({
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
    }
    catch (error) {
        next(error);
    }
});
// Excluir categoria
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        // Verificar se tem filhos
        const hasChildren = await prisma_1.default.serviceCategory.count({
            where: { parentId: id }
        });
        if (hasChildren > 0) {
            return res.status(400).json({
                error: 'Não é possível excluir uma categoria que possui subcategorias.'
            });
        }
        await prisma_1.default.serviceCategory.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=categories.routes.js.map