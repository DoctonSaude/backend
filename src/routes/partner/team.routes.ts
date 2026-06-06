// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import multer from 'multer';
import { storageService } from '../../services/storage.service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * @route GET /api/partners/team
 */
router.get('/team', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const team = await prisma.teamMember.findMany({
      where: { partnerId: partner.id },
      orderBy: { name: 'asc' }
    });

    res.json({ data: team });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar equipe' });
  }
});

/**
 * @route POST /api/partners/team
 */
router.post('/team', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const { name, specialty, crm, email, phone } = req.body;
    const member = await prisma.teamMember.create({
      data: { partnerId: partner.id, name, specialty, crm, email, phone }
    });

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar membro' });
  }
});

/**
 * @route POST /api/partners/team/:id/avatar
 */
router.post('/team/:id/avatar', authenticate, authorize('PARTNER'), upload.single('avatar'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner || !req.file) return res.status(400).json({ error: 'Dados inválidos' });

    const publicUrl = await storageService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'avatars');
    const updated = await prisma.teamMember.update({
      where: { id: req.params.id, partnerId: partner.id },
      data: { avatar: publicUrl }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro no upload' });
  }
});

/**
 * @route PUT /api/partners/team/:id
 */
router.put('/team/:id', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const updated = await prisma.teamMember.update({
      where: { id: req.params.id, partnerId: partner.id },
      data: req.body
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar membro' });
  }
});

/**
 * @route PUT /api/partners/team/:id/toggle-status
 */
router.put('/team/:id/toggle-status', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const member = await prisma.teamMember.findUnique({
      where: { id: req.params.id, partnerId: partner.id }
    });

    if (!member) return res.status(404).json({ error: 'Membro não encontrado' });

    const updated = await prisma.teamMember.update({
      where: { id: member.id },
      data: { isActive: !member.isActive }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alterar status do membro' });
  }
});

/**
 * @route DELETE /api/partners/team/:id
 */
router.delete('/team/:id', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    await prisma.teamMember.delete({
      where: { id: req.params.id, partnerId: partner.id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir membro' });
  }
});

export default router;
