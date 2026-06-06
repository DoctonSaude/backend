// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { randomUUID } from 'crypto';


const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/reports
 */
router.get('/reports', ...adminAuth, async (req, res) => {
  try {
    let list = await prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
    if (list.length === 0) {
      const creatorId = req.user?.userId || process.env.ADMIN_DEV_USER_ID || '00000000-0000-0000-0000-000000000000';
      await prisma.report.createMany({
        data: [
          { id: randomUUID(), name: 'Relatório Mensal de Faturamento', type: 'financial', status: 'Concluído', format: 'PDF', size: '1.2MB', createdBy: creatorId },
          { id: randomUUID(), name: 'Base de Usuários Ativos', type: 'users', status: 'Concluído', format: 'Excel', size: '850KB', createdBy: creatorId },
          { id: randomUUID(), name: 'Performance de Parceiros', type: 'partners', status: 'Em processamento', format: 'Excel', size: '-', createdBy: creatorId }
        ]
      });
      list = await prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
    }
    return res.json(list);
  } catch (error) {
    res.json([]);
  }
});

/**
 * @route POST /api/admin/reports/generate
 */
router.post('/reports/generate', ...adminAuth, async (req, res) => {
  const { type, name, format, periodStart, periodEnd } = req.body || {};
  try {
    const period = periodStart && periodEnd ? `${periodStart} - ${periodEnd}` : `${new Date().toLocaleDateString('pt-BR')}`;
    const report = await prisma.report.create({
      data: {
        id: randomUUID(),
        name: name || `Relatório de ${type || 'Sistema'} - ${new Date().toLocaleDateString('pt-BR')}`,
        type: type || 'general',
        status: 'Em processamento',
        format: format || 'PDF',
        period: period,
        size: '-',
        createdBy: req.user?.userId || process.env.ADMIN_DEV_USER_ID || '00000000-0000-0000-0000-000000000000'
      }
    });

    // Simulação de processamento assíncrono
    setTimeout(async () => {
      try {
        await prisma.report.update({
          where: { id: report.id },
          data: { status: 'Concluído', size: `${(Math.random() * 5 + 0.5).toFixed(1)}MB` }
        });
      } catch (err) {
        console.error('Simulated report generation error:', err);
      }
    }, 5000);

    return res.status(201).json(report);
  } catch (error: any) {
    console.error("ERRO AO GERAR RELATÓRIO:", error);
    res.status(500).json({ error: 'Erro ao iniciar geração de relatório', details: error.message });
  }
});

/**
 * @route GET /api/admin/reports/:id/download
 */
router.get('/reports/:id/download', ...adminAuth, async (req, res) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: 'Relatório não encontrado' });
    if (report.status !== 'Concluído') return res.status(409).json({ error: 'Relatório ainda está sendo processado', status: report.status });

    // Increment download count
    await prisma.report.update({
      where: { id: req.params.id },
      data: { downloads: report.downloads + 1 }
    });
    
    // Mock download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${report.name}.${report.format === 'Excel' ? 'xlsx' : 'pdf'}"`);
    return res.send(Buffer.from('Conteúdo simulado do relatório'));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao baixar arquivo' });
  }
});

/**
 * @route PATCH /api/admin/reports/:id
 */
router.patch('/reports/:id', ...adminAuth, async (req, res) => {
  try {
    const updated = await prisma.report.update({
      where: { id: req.params.id },
      data: req.body
    });
    return res.json(updated);
  } catch (error) {
    res.status(404).json({ error: 'Relatório não encontrado' });
  }
});

/**
 * @route DELETE /api/admin/reports/:id
 */
router.delete('/reports/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.report.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'Relatório não encontrado' });
  }
});

// === Automated Reports ===

/**
 * @route GET /api/admin/automated-reports
 */
router.get('/automated-reports', ...adminAuth, async (req, res) => {
  try {
    const list = await prisma.automatedReport.findMany({ orderBy: { createdAt: 'desc' } });
    if (list.length === 0) {
      await prisma.automatedReport.createMany({
        data: [
          { 
            id: randomUUID(),
            name: 'Relatório Semanal de Faturamento', 
            description: 'Envio semanal de dados de faturamento', 
            type: 'financial', 
            frequency: 'weekly', 
            recipients: ['admin@docton.com'], 
            format: 'PDF',
            isActive: true,
            lastGenerated: new Date(),
            nextGeneration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        ]
      });
      return res.json(await prisma.automatedReport.findMany({ orderBy: { createdAt: 'desc' } }));
    }
    return res.json(list);
  } catch (error) {
    res.json([]);
  }
});

/**
 * @route POST /api/admin/automated-reports
 */
router.post('/automated-reports', ...adminAuth, async (req, res) => {
  try {
    const ar = await prisma.automatedReport.create({ data: { id: randomUUID(), ...req.body } });
    return res.status(201).json(ar);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

/**
 * @route PUT /api/admin/automated-reports/:id
 */
router.put('/automated-reports/:id', ...adminAuth, async (req, res) => {
  try {
    const updated = await prisma.automatedReport.update({
      where: { id: req.params.id },
      data: req.body
    });
    return res.json(updated);
  } catch (error) {
    res.status(404).json({ error: 'Agendamento não encontrado' });
  }
});

/**
 * @route DELETE /api/admin/automated-reports/:id
 */
router.delete('/automated-reports/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.automatedReport.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'Agendamento não encontrado' });
  }
});

/**
 * @route POST /api/admin/automated-reports/:id/generate
 */
router.post('/automated-reports/:id/generate', ...adminAuth, async (req, res) => {
  try {
    const ar = await prisma.automatedReport.update({
      where: { id: req.params.id },
      data: { lastGenerated: new Date() }
    });
    return res.json(ar);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar relatório agendado' });
  }
});

// === AI Insights ===

/**
 * @route GET /api/admin/ai/insights
 */
router.get('/ai/insights', ...adminAuth, async (req, res) => {
  try {
    const list = await prisma.aiInsight.findMany({ orderBy: { priority: 'asc', createdAt: 'desc' } });
    if (list.length === 0) {
      await prisma.aiInsight.createMany({
        data: [
          { 
            id: randomUUID(),
            type: 'opportunity', 
            title: 'Aumento de engajamento em telemedicina', 
            description: 'A taxa de consultas repetidas cresceu 23% nos últimos 30 dias. Recomendamos enviar emails de follow-up personalizados.', 
            confidence: 87, 
            impact: 'high', 
            category: 'engagement', 
            priority: 1 
          },
          { 
            id: randomUUID(),
            type: 'prediction', 
            title: 'Previsão de demanda alta na próxima semana', 
            description: 'Baseado em padrões históricos, esperamos um aumento de 35% nas consultas na região Sudeste.', 
            confidence: 82, 
            impact: 'medium', 
            category: 'forecast', 
            priority: 2 
          },
          { 
            id: randomUUID(),
            type: 'alert', 
            title: 'Taxa de abandono em checkout', 
            description: '18% dos usuários estão abandonando a página de pagamento. Recomendamos simplificar o formulário.', 
            confidence: 92, 
            impact: 'critical', 
            category: 'conversion', 
            priority: 3 
          }
        ]
      });
      return res.json(await prisma.aiInsight.findMany({ orderBy: { priority: 'asc', createdAt: 'desc' } }));
    }
    return res.json(list);
  } catch (error) {
    console.error(error);
    res.json([]);
  }
});

/**
 * @route POST /api/admin/ai/insights/generate
 */
router.post('/ai/insights/generate', ...adminAuth, async (req, res) => {
  try {
    // Simulate AI generating new insights
    const newInsightData = { 
      type: Math.random() > 0.5 ? 'opportunity' : 'prediction', 
      title: 'Insight gerado automaticamente - ' + new Date().toLocaleString('pt-BR'), 
      description: 'Análise temporal dos dados revelou padrões relevantes para otimização.', 
      confidence: Math.floor(Math.random() * 30) + 70, 
      impact: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)], 
      category: ['engagement', 'conversion', 'forecast'][Math.floor(Math.random() * 3)], 
      priority: Math.floor(Math.random() * 5) + 1 
    };
    const createdInsight = await prisma.aiInsight.create({ data: newInsightData });
    return res.json(createdInsight);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar insights' });
  }
});

/**
 * @route DELETE /api/admin/ai/insights/:id
 */
router.delete('/ai/insights/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.aiInsight.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    console.error('[AI Insight DELETE Error]', err);
    return res.status(500).json({ error: 'Erro ao excluir insight' });
  }
});

/**
 * @route GET /api/admin/ai/models
 */
router.get('/ai/models', ...adminAuth, async (req, res) => {
  try {
    const models = await prisma.predictiveModel.findMany({ orderBy: { createdAt: 'desc' } });
    
    // Seed initial models if none exist
    if (models.length === 0) {
      const defaultModels = [
        {
          name: 'Churn Predictor V2',
          description: 'Rede neural para prever chance de cancelamento de planos baseada em engajamento.',
          accuracy: 94.2,
          lastTrained: new Date(),
          predictions: [
            { metric: 'Taxa de Churn Prevista', current: 2.4, predicted: 1.8, timeframe: '30 dias', confidence: 91 },
            { metric: 'Usuários em Risco', current: 145, predicted: 89, timeframe: '15 dias', confidence: 85 }
          ]
        },
        {
          name: 'LTV Optimizer',
          description: 'Modelo de regressão para projetar Lifetime Value (LTV) de novos usuários.',
          accuracy: 88.5,
          lastTrained: new Date(Date.now() - 86400000),
          predictions: [
            { metric: 'LTV Médio', current: 1250, predicted: 1480, timeframe: '6 meses', confidence: 82 }
          ]
        }
      ];
      
      for (const m of defaultModels) {
        await prisma.predictiveModel.create({
          data: {
            name: m.name,
            description: m.description,
            accuracy: m.accuracy,
            lastTrained: m.lastTrained,
            predictions: m.predictions as any,
            updatedAt: new Date()
          }
        });
      }
      return res.json(await prisma.predictiveModel.findMany({ orderBy: { createdAt: 'desc' } }));
    }
    
    return res.json(models);
  } catch (err) {
    console.error('[AI Models GET Error]', err);
    return res.status(500).json({ error: 'Erro ao carregar modelos' });
  }
});

/**
 * @route POST /api/admin/ai/models/:id/train
 */
router.post('/ai/models/:id/train', ...adminAuth, async (req, res) => {
  try {
    const modelId = req.params.id;
    // Simulate training time and improving accuracy slightly
    const model = await prisma.predictiveModel.findUnique({ where: { id: modelId } });
    if (!model) return res.status(404).json({ error: 'Modelo não encontrado' });
    
    const newAccuracy = Math.min(99.9, model.accuracy + (Math.random() * 2));
    
    const updatedModel = await prisma.predictiveModel.update({
      where: { id: modelId },
      data: {
        accuracy: newAccuracy,
        lastTrained: new Date(),
        updatedAt: new Date()
      }
    });
    
    return res.json(updatedModel);
  } catch (err) {
    console.error('[AI Model TRAIN Error]', err);
    return res.status(500).json({ error: 'Erro ao treinar modelo' });
  }
});

export default router;
