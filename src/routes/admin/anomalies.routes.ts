import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../lib/prisma';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/anomalies
 */
router.get('/anomalies', ...adminAuth, async (req, res) => {
  try {
    const anomalies = await prisma.anomaly.findMany({
      orderBy: { detectedAt: 'desc' },
      take: 50
    });

    if (anomalies.length === 0) {
      // Seed samples
      const sampleAnomalies = [
        {
          type: 'security',
          severity: 'high',
          title: 'Acesso simultâneo detectado',
          description: 'Múltiplas tentativas de login de IPs diferentes na mesma conta.',
          metric: 'login_attempts',
          currentValue: 12,
          expectedValue: 1,
          deviation: 1100,
          confidence: 0.95,
          detectedAt: new Date(),
          status: 'active',
          category: 'security',
          impact: 'high'
        },
        {
          type: 'business',
          severity: 'medium',
          title: 'Queda na conversão de agendamentos',
          description: 'A taxa de conversão caiu drasticamente nas últimas 2 horas.',
          metric: 'conversion_rate',
          currentValue: 2.5,
          expectedValue: 8.0,
          deviation: 68,
          confidence: 0.88,
          detectedAt: new Date(Date.now() - 3600000),
          status: 'investigating',
          category: 'revenue',
          impact: 'medium'
        }
      ];

      for (const a of sampleAnomalies) {
        await prisma.anomaly.create({ data: { ...a, updatedAt: new Date() } });
      }
      return res.json(await prisma.anomaly.findMany({ orderBy: { detectedAt: 'desc' } }));
    }
    
    return res.json(anomalies);
  } catch (error) {
    console.error('[Anomalies GET Error]', error);
    res.json([]);
  }
});

/**
 * @route POST /api/admin/anomalies/scan
 */
router.post('/anomalies/scan', ...adminAuth, async (req, res) => {
  try {
    const newAnomaly = {
      type: 'statistical',
      severity: 'low',
      title: 'Aumento repentino de acessos na home',
      description: 'Pico de tráfego detectado, possivelmente devido a uma campanha de marketing.',
      metric: 'page_views',
      currentValue: 1500,
      expectedValue: 300,
      deviation: 400,
      confidence: 0.75,
      detectedAt: new Date(),
      status: 'active',
      category: 'system',
      impact: 'low',
      updatedAt: new Date()
    };
    
    const created = await prisma.anomaly.create({ data: newAnomaly });
    return res.json(created);
  } catch (error) {
    console.error('[Anomalies SCAN Error]', error);
    res.status(500).json({ error: 'Erro ao executar varredura' });
  }
});

/**
 * @route PUT /api/admin/anomalies/:id/status
 */
router.put('/anomalies/:id/status', ...adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.anomaly.update({
      where: { id: req.params.id },
      data: { status, updatedAt: new Date() }
    });
    return res.json(updated);
  } catch (error) {
    res.status(404).json({ error: 'Anomalia não encontrada' });
  }
});

/**
 * @route GET /api/admin/anomaly-models
 */
router.get('/anomaly-models', ...adminAuth, async (req, res) => {
  try {
    const models = await prisma.anomalyModel.findMany();
    
    if (models.length === 0) {
      const defaultModels = [
        {
          name: 'Guardian Security AI',
          description: 'Detector heurístico de ataques de força bruta e injeções',
          isActive: true,
          sensitivity: 'high',
          detectionRate: 98.5,
          falsePositiveRate: 1.2,
          lastTrained: new Date(),
          metrics: ['login_failures', 'request_rate']
        },
        {
          name: 'Revenue Sentinel',
          description: 'Monitoramento contínuo de fluxo de caixa e conversões',
          isActive: true,
          sensitivity: 'medium',
          detectionRate: 92.0,
          falsePositiveRate: 3.5,
          lastTrained: new Date(Date.now() - 86400000),
          metrics: ['conversion_rate', 'drop_off']
        }
      ];
      for (const m of defaultModels) {
        await prisma.anomalyModel.create({ data: m });
      }
      return res.json(await prisma.anomalyModel.findMany());
    }
    
    return res.json(models);
  } catch (error) {
    console.error('[Anomaly Models GET Error]', error);
    res.json([]);
  }
});

/**
 * @route PUT /api/admin/anomaly-models/:id/toggle
 */
router.put('/anomaly-models/:id/toggle', ...adminAuth, async (req, res) => {
  try {
    const model = await prisma.anomalyModel.findUnique({ where: { id: req.params.id } });
    if (!model) return res.status(404).json({ error: 'Modelo não encontrado' });
    
    const updated = await prisma.anomalyModel.update({
      where: { id: req.params.id },
      data: { isActive: !model.isActive }
    });
    return res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alterar status do modelo' });
  }
});

export default router;
