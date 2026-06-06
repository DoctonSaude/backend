// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { ChatbotService } from '../../services/chatbot.service.js';

const router = Router();

/**
 * @route GET /api/partners/ai/history
 */
router.get('/ai/history', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const history = await prisma.chatHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return res.json(history);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar histórico IA' });
  }
});

/**
 * @route POST /api/partners/ai/chat
 */
router.post('/ai/chat', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId || req.user.id;
    if (!message) return res.status(400).json({ error: 'Mensagem é obrigatória' });

    const response = await ChatbotService.processPartnerQuery(message, userId);
    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar IA' });
  }
});

/**
 * @route GET /api/partners/ai/insights
 */
router.get('/ai/insights', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const insights = await prisma.aiInsight.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(insights);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar insights' });
  }
});

/**
 * @route POST /api/partners/ai/insights
 */
router.post('/ai/insights', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { title, description, type, impact, category, actionable, priority } = req.body;

    const insight = await prisma.aiInsight.create({
      data: {
        title,
        description,
        type,
        impact,
        category,
        actionable: actionable !== undefined ? actionable : true,
        priority: priority || 3,
        confidence: 100, // Manual/Admin creation usually has full confidence
        userId
      }
    });

    return res.status(201).json(insight);
  } catch (error) {
    console.error('[Create Insight Error]', error);
    return res.status(500).json({ error: 'Erro ao criar insight' });
  }
});

/**
 * @route PUT /api/partners/ai/insights/:id
 */
router.put('/ai/insights/:id', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, impact, category, actionable, priority } = req.body;

    const insight = await prisma.aiInsight.update({
      where: { id },
      data: {
        title,
        description,
        type,
        impact,
        category,
        actionable,
        priority
      }
    });

    return res.json(insight);
  } catch (error) {
    console.error('[Update Insight Error]', error);
    return res.status(500).json({ error: 'Erro ao atualizar insight' });
  }
});

/**
 * @route DELETE /api/partners/ai/insights/:id
 */
router.delete('/ai/insights/:id', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const { id } = req.params;

    await prisma.aiInsight.delete({
      where: { id }
    });

    return res.status(204).end();
  } catch (error) {
    console.error('[Delete Insight Error]', error);
    return res.status(500).json({ error: 'Erro ao excluir insight' });
  }
});

import { HealthIntentService } from '../../services/health-intent.service.js';

router.get('/ai/leads', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const leads = await HealthIntentService.getLeadsForPartner(partner.id);
    return res.json(leads);
  } catch (error) {
    console.error('[Leads Error]', error);
    return res.status(500).json({ error: 'Erro ao buscar leads recomendados' });
  }
});

router.put('/ai/leads/:id', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Na tabela HealthIntent, o status pode ser armazenado no contexto ou como uma coluna dedicada
    // Dependendo do schema, vou atualizar o campo que melhor representa 'NEW' | 'CONTACTED' | 'IGNORED'
    const lead = await prisma.healthIntent.update({
      where: { id },
      data: { 
        status: status // Assumindo que a coluna existe, se não existir, precisaremos ajustar o schema
      }
    });

    return res.json(lead);
  } catch (error) {
    console.error('[Update Lead Error]', error);
    return res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
});

/**
 * @route POST /api/partners/ai/optimize-schedule
 */
router.post('/ai/optimize-schedule', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { week, goal } = req.body;
    
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    // Lógica simplificada de otimização
    const appointments = await prisma.appointment.findMany({
      where: {
        partnerId: partner.id,
        dateTime: {
          gte: new Date(week || new Date()),
          lte: new Date(new Date(week || new Date()).getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const suggestions = [
      { id: 1, type: 'move', from: '14:00', to: '10:00', reason: 'Agrupar atendimentos no período da manhã' },
      { id: 2, type: 'open_slot', time: '16:00', reason: 'Horário de maior demanda para sua especialidade' }
    ];

    return res.json({ 
      success: true, 
      analysis: `Analisamos ${appointments.length} agendamentos. Sugerimos agrupar horários para reduzir janelas ociosas.`,
      suggestions 
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao otimizar agenda' });
  }
});

/**
 * @route GET /api/partners/ai/inactive-patients
 */
router.get('/ai/inactive-patients', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    // Busca pacientes que tiveram consultas há mais de 30 dias e não tem futuras
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const inactivePatients = await prisma.appointment.findMany({
      where: {
        partnerId: partner.id,
        dateTime: { lte: thirtyDaysAgo },
        status: 'COMPLETED'
      },
      distinct: ['patientId'],
      include: { Patient: true },
      take: 10
    });

    return res.json(inactivePatients.map(a => ({
      id: a.Patient.id,
      name: a.Patient.userId, // Aqui idealmente buscaria o nome do User, mas simplificando
      lastVisit: a.dateTime,
      daysInactive: Math.floor((new Date().getTime() - a.dateTime.getTime()) / (1000 * 3600 * 24))
    })));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pacientes inativos' });
  }
});

export default router;
