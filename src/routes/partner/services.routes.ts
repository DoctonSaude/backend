// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();

/**
 * @route GET /api/partners/services
 */
router.get('/services', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const services = await prisma.partnerService.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ data: services || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar serviços' });
  }
});

/**
 * @route POST /api/partners/services
 */
router.post('/services', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const {
      name, description, duration, price, isOnline,
      isPresencial, category, discountBasic, discountPremium,
      discountEnterprise, basePrice
    } = req.body;

    if (!name || price === undefined || duration === undefined) {
      return res.status(400).json({ error: 'Nome, preço e duração são obrigatórios' });
    }

    const service = await prisma.partnerService.create({
      data: {
        partnerId: partner.id,
        name,
        description: description || '',
        duration: Number(duration),
        price: Number(price),
        basePrice: basePrice ? Number(basePrice) : Number(price),
        isOnline: !!isOnline,
        isPresencial: !!isPresencial,
        category: category || 'Consulta',
        isActive: true,
        discountBasic: Number(discountBasic || 0),
        discountPremium: Number(discountPremium || 0),
        discountEnterprise: Number(discountEnterprise || 0),
      }
    });

    return res.status(201).json(service);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar serviço' });
  }
});

/**
 * @route PUT /api/partners/services/:serviceId
 */
router.put('/services/:serviceId', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const {
      name, description, duration, price, isOnline,
      isPresencial, category, isActive, discountBasic,
      discountPremium, discountEnterprise, basePrice
    } = req.body;

    const service = await prisma.partnerService.update({
      where: { id: req.params.serviceId, partnerId: partner.id },
      data: {
        name, description, category,
        duration: duration !== undefined ? Number(duration) : undefined,
        price: price !== undefined ? Number(price) : undefined,
        basePrice: basePrice !== undefined ? Number(basePrice) : undefined,
        isOnline: isOnline !== undefined ? !!isOnline : undefined,
        isPresencial: isPresencial !== undefined ? !!isPresencial : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
        discountBasic: discountBasic !== undefined ? Number(discountBasic) : undefined,
        discountPremium: discountPremium !== undefined ? Number(discountPremium) : undefined,
        discountEnterprise: discountEnterprise !== undefined ? Number(discountEnterprise) : undefined,
      }
    });

    return res.json(service);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

/**
 * @route DELETE /api/partners/services/:serviceId
 */
router.delete('/services/:serviceId', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    await prisma.partnerService.delete({
      where: { id: req.params.serviceId, partnerId: partner.id }
    });

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir serviço' });
  }
});

/**
 * @route PUT /api/partners/services/:serviceId/toggle-status
 */
router.put('/services/:serviceId/toggle-status', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const service = await prisma.partnerService.findUnique({
      where: { id: req.params.serviceId, partnerId: partner.id }
    });

    if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });

    const updated = await prisma.partnerService.update({
      where: { id: service.id },
      data: { isActive: !service.isActive }
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao alternar status do serviço' });
  }
});

/**
 * @route GET /api/partners/combos
 */
router.get('/combos', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const combos = await prisma.combo?.findMany({
      where: { partnerId: partner.id },
      include: { services: true }
    }) || [];

    return res.json({ data: combos });
  } catch (error) {
    return res.json({ data: [] });
  }
});

export default router;
