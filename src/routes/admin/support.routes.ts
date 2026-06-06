// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import inAppNotificationService from '../../services/inAppNotification.service.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/support/tickets
 */
router.get('/support/tickets', ...adminAuth, async (req, res) => {
  try {
    const { status, priority } = req.query;
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (priority) where.priority = priority;

    const tickets = await (prisma.supportTicket as any).findMany({
      where,
      select: {
          id: true,
          patientId: true,
          subject: true,
          category: true,
          priority: true,
          status: true,
          rating: true,
          ratingComment: true,
          userEmail: true,
          userName: true,
          assignedToId: true,
          partnerId: true,
          createdAt: true,
          updatedAt: true,
          SupportMessage: { orderBy: { createdAt: 'asc' } },
          Patient: { select: { User: { select: { name: true, email: true } } } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formatted = tickets.map(t => ({
      ...t,
      userName: t.userName || t.Patient?.User?.name || 'Usuário Desconhecido',
      userEmail: t.userEmail || t.Patient?.User?.email || '',
      messages: t.SupportMessage
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Erro ao listar tickets:', error);
    res.status(500).json({ error: 'Erro ao listar tickets' });
  }
});

router.get('/support/stats', ...adminAuth, async (req, res) => {
    try {
        const [total, open, inProgress, resolved, closed, ratings] = await Promise.all([
            prisma.supportTicket.count(),
            prisma.supportTicket.count({ where: { status: 'OPEN' } }),
            prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
            prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
            prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
            prisma.supportTicket.findMany({
                where: { rating: { not: null } },
                select: { rating: true }
            })
        ]);

        const avgRating = ratings.length > 0 
            ? ratings.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratings.length 
            : 0;

        return res.json({
            totalTickets: total,
            openTickets: open,
            inProgressTickets: inProgress,
            resolvedTickets: resolved,
            closedTickets: closed,
            avgRating,
            teamPerformance: []
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

/**
 * @route GET /api/admin/support/tickets/:id
 */
router.get('/support/tickets/:id', ...adminAuth, async (req, res) => {
  try {
    const ticket = await (prisma.supportTicket as any).findUnique({
      where: { id: req.params.id },
      select: {
          id: true,
          patientId: true,
          subject: true,
          category: true,
          priority: true,
          status: true,
          rating: true,
          ratingComment: true,
          userEmail: true,
          userName: true,
          assignedToId: true,
          partnerId: true,
          createdAt: true,
          updatedAt: true,
          SupportMessage: { orderBy: { createdAt: 'asc' } },
          Patient: { select: { User: { select: { name: true, email: true, phone: true } } } }
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    const formatted = {
      ...ticket,
      userName: ticket.userName || ticket.Patient?.User?.name || 'Usuário Desconhecido',
      userEmail: ticket.userEmail || ticket.Patient?.User?.email || '',
      messages: ticket.SupportMessage
    };

    return res.json(formatted);
  } catch (error) {
    console.error('Erro ao buscar ticket:', error);
    res.status(500).json({ error: 'Erro ao buscar ticket' });
  }
});

/**
 * @route POST /api/admin/support/tickets/:id/resolve
 */
router.post('/support/tickets/:id/resolve', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        updatedAt: new Date(),
        SupportMessage: {
          create: {
            sender: 'SUPPORT',
            message: `Ticket resolvido: ${resolution || 'Questão solucionada pelo suporte.'}`,
          }
        }
      }
    });

    // Notificar o usuário que o ticket foi resolvido
    if (updated.partnerId || updated.patientId) {
        await (inAppNotificationService as any).createNotification({
            userId: updated.Patient?.userId || null,
            partnerId: updated.partnerId,
            type: 'support_ticket',
            title: '✅ Ticket Resolvido',
            message: `Seu chamado "${updated.subject}" foi marcado como resolvido.`,
            priority: 'medium',
            link: '/suporte'
        }).catch(err => console.error('Erro ao notificar resolução:', err));
    }

    return res.json(updated);
  } catch (error) {
    console.error('Erro ao resolver ticket:', error);
    res.status(404).json({ error: 'Ticket não encontrado' });
  }
});

router.post('/support/tickets/:id/assign', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        assignedToId: agentId,
        status: 'ASSIGNED',
        updatedAt: new Date()
      }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Erro ao atribuir ticket:', error);
    res.status(500).json({ error: 'Erro ao atribuir ticket' });
  }
});

router.post('/support/tickets/:id/messages', ...adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        const newMessage = await prisma.supportMessage.create({
            data: {
                ticketId: id,
                message,
                sender: 'SUPPORT',
            }
        });

        // Atualizar data de atualização do ticket
        await prisma.supportTicket.update({
            where: { id },
            data: { updatedAt: new Date() }
        });

        // Notificar o usuário sobre a nova mensagem
        const ticket = await prisma.supportTicket.findUnique({ where: { id } });
        if (ticket && (ticket.partnerId || ticket.patientId)) {
            await (inAppNotificationService as any).createNotification({
                userId: null, // O serviço busca pelo partnerId se userId for null
                partnerId: ticket.partnerId,
                type: 'support_message',
                title: '💬 Nova Mensagem de Suporte',
                message: `Você recebeu uma resposta no ticket: ${ticket.subject}`,
                priority: 'medium',
                link: '/suporte'
            }).catch(err => console.error('Erro ao notificar nova mensagem:', err));
        }

        return res.status(201).json(newMessage);
    } catch (error) {
        console.error('Erro ao adicionar mensagem:', error);
        res.status(500).json({ error: 'Erro ao adicionar mensagem' });
    }
});

// --- Knowledge Base ---

/**
 * @route GET /api/admin/support/knowledge-base
 */
router.get('/support/knowledge-base', ...adminAuth, async (req, res) => {
  try {
    const articles = await prisma.knowledgeBaseArticle.findMany({
      include: { KnowledgeBaseCategory: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(articles);
  } catch (error) {
    console.error('Erro ao buscar base de conhecimento:', error);
    res.json([]);
  }
});

/**
 * @route POST /api/admin/support/knowledge-base
 */
router.post('/support/knowledge-base', ...adminAuth, async (req, res) => {
  const b = req.body || {};
  try {
    const created = await prisma.knowledgeBaseArticle.create({
      data: {
        title: String(b.title || 'Sem Título'),
        content: String(b.content || ''),
        category: String(b.category || 'Geral'),
        tags: b.tags ? String(b.tags) : '',
        status: b.status || 'PUBLISHED',
      }
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar artigo' });
  }
});

/**
 * @route PUT /api/admin/support/knowledge-base/:id
 */
router.put('/support/knowledge-base/:id', ...adminAuth, async (req, res) => {
  const b = req.body || {};
  try {
    const dataToUpdate: any = {};
    if (b.title !== undefined) dataToUpdate.title = b.title;
    if (b.content !== undefined) dataToUpdate.content = b.content;
    if (b.category !== undefined) dataToUpdate.category = b.category;
    if (b.tags !== undefined) dataToUpdate.tags = b.tags;
    
    const updated = await prisma.knowledgeBaseArticle.update({
      where: { id: req.params.id },
      data: dataToUpdate
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar artigo' });
  }
});

/**
 * @route DELETE /api/admin/support/knowledge-base/:id
 */
router.delete('/support/knowledge-base/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.knowledgeBaseArticle.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover artigo' });
  }
});

/**
 * @route POST /api/admin/support/tickets
 */
router.post('/support/tickets', ...adminAuth, async (req, res) => {
  const b = req.body || {};
  try {
    const created = await prisma.supportTicket.create({
      data: {
        subject: String(b.subject || 'Chamado de Suporte'),
        category: String(b.category || 'Geral'),
        priority: b.priority || 'MEDIUM',
        status: 'OPEN',
        userName: b.userName || 'Admin',
        userEmail: b.userEmail || '',
        SupportMessage: {
          create: {
            message: b.message || 'Ticket criado',
            sender: 'USER'
          }
        }
      }
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar ticket' });
  }
});

/**
 * @route DELETE /api/admin/support/tickets/:id
 */
router.delete('/support/tickets/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.supportMessage.deleteMany({ where: { ticketId: req.params.id } });
    await prisma.supportTicket.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover ticket' });
  }
});

export default router;
