// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import inAppNotificationService from '../../services/inAppNotification.service.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/approvals/pending
 */
router.get('/approvals/pending', ...adminAuth, async (req, res) => {
  try {
    const [pendingPartners, pendingPharmacies] = await Promise.all([
      prisma.partner.findMany({
        where: { isApproved: false },
        include: { User: true, PartnerDocument: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pharmacy.findMany({
        where: { isApproved: false },
        include: { User: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const mappedPartners = pendingPartners.map((p) => ({
      id: p.id,
      type: 'PARTNER',
      name: p.User?.name || p.user?.name || p.name || 'Parceiro',
      cnpj: p.cnpj || 'Sob consulta',
      contactEmail: p.User?.email || p.user?.email || '',
      requestDate: p.createdAt.toISOString(),
      documents: (p.PartnerDocument || p.documents || []).map(d => ({ id: d.id, type: d.type, name: d.name, url: d.url }))
    }));

    const mappedPharmacies = pendingPharmacies.map((p) => ({
      id: p.id,
      type: 'PHARMACY',
      name: p.name || 'Farmácia',
      cnpj: p.cnpj || 'Não informado',
      contactEmail: p.User?.[0]?.email || '',
      requestDate: p.createdAt.toISOString(),
    }));

    res.json([...mappedPartners, ...mappedPharmacies].sort((a, b) => 
      new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
    ));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pendências' });
  }
});

/**
 * @route PUT /api/admin/partners/:id/approve
 */
router.put('/partners/:id/approve', ...adminAuth, async (req, res) => {
  try {
    const updated = await prisma.partner.update({
      where: { id: req.params.id },
      data: { isApproved: true, updatedAt: new Date() },
    });

    await inAppNotificationService.createNotification({
      userId: updated.userId,
      type: 'system',
      title: '✅ Cadastro Aprovado!',
      message: 'Seu cadastro foi aprovado. Bem-vindo!',
      priority: 'high',
      link: '/partner/dashboard'
    }).catch(() => {});

    res.json({ message: 'Parceiro aprovado', partner: updated });
  } catch (err) {
    console.error('[APPROVE_PARTNER] Error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Parceiro não encontrado' });
    }
    res.status(500).json({ error: 'Erro ao aprovar parceiro', details: err.message });
  }
});

/**
 * @route PUT /api/admin/pharmacies/:id/approve
 */
router.put('/pharmacies/:id/approve', ...adminAuth, async (req, res) => {
  try {
    const updated = await prisma.pharmacy.update({
      where: { id: req.params.id },
      data: { isApproved: true },
      include: { User: true }
    });

    const pharmacyUsers = updated.User || [];
    for (const user of pharmacyUsers) {
      await inAppNotificationService.createNotification({
        userId: user.id,
        type: 'system',
        title: '✅ Cadastro Aprovado!',
        message: 'O cadastro da sua farmácia foi aprovado.',
        priority: 'high',
        link: '/pharmacy/dashboard'
      }).catch(() => {});
    }

    res.json({ message: 'Farmácia aprovada', pharmacy: updated });
  } catch (err) {
    console.error('[APPROVE_PHARMACY] Error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Farmácia não encontrada' });
    }
    res.status(500).json({ error: 'Erro ao aprovar farmácia', details: err.message });
  }
});

export default router;
