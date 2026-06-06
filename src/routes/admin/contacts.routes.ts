import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

router.get('/contacts', ...adminAuth, async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(messages);
  } catch (error) {
    console.error('Erro ao listar mensagens de contato:', error);
    return res.status(500).json({ error: 'Erro ao listar mensagens' });
  }
});

router.put('/contacts/:id/status', ...adminAuth, async (req, res) => {
  try {
    const { read } = req.body;
    const message = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { read }
    });
    return res.json(message);
  } catch (error) {
    console.error('Erro ao atualizar mensagem de contato:', error);
    return res.status(500).json({ error: 'Erro ao atualizar mensagem' });
  }
});

router.delete('/contacts/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.contactMessage.delete({
      where: { id: req.params.id }
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir mensagem de contato:', error);
    return res.status(500).json({ error: 'Erro ao excluir mensagem' });
  }
});

export default router;
