import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// ==========================================
// DESAFIOS (CHALLENGES)
// ==========================================

router.get('/challenges', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const list = await prisma.challenge.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(list);
  } catch (err) {
    console.error('[Admin Challenges GET] Erro:', err);
    return res.status(500).json({ error: 'Erro ao buscar desafios' });
  }
});

router.post('/challenges', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { title, description, category, points, status } = req.body;
    const challenge = await prisma.challenge.create({
      data: {
        title,
        description,
        category,
        points: Number(points),
        isActive: status === 'Ativo',
        type: 'CUSTOM', // Tipo padrao para desafios criados no admin
        targetValue: 1,
      }
    });
    return res.json(challenge);
  } catch (err) {
    console.error('[Admin Challenges POST] Erro:', err);
    return res.status(500).json({ error: 'Erro ao criar desafio' });
  }
});

router.put('/challenges/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, points, status } = req.body;
    const challenge = await prisma.challenge.update({
      where: { id },
      data: {
        title,
        description,
        category,
        points: Number(points),
        isActive: status === 'Ativo',
      }
    });
    return res.json(challenge);
  } catch (err) {
    console.error('[Admin Challenges PUT] Erro:', err);
    return res.status(500).json({ error: 'Erro ao atualizar desafio' });
  }
});

router.delete('/challenges/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.challenge.delete({ where: { id } });
    return res.json({ message: 'Excluido' });
  } catch (err) {
    console.error('[Admin Challenges DELETE] Erro:', err);
    return res.status(500).json({ error: 'Erro ao deletar desafio' });
  }
});

// ==========================================
// RECOMPENSAS (REWARDS)
// ==========================================

router.get('/rewards', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const list = await prisma.reward.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(list);
  } catch (err) {
    console.error('[Admin Rewards GET] Erro:', err);
    return res.status(500).json({ error: 'Erro ao buscar recompensas' });
  }
});

router.post('/rewards', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { title, description, category, pointsCost, stockQuantity, status } = req.body;
    const reward = await prisma.reward.create({
      data: {
        name: title,
        description,
        category,
        pointsCost: Number(pointsCost),
        stockQuantity: Number(stockQuantity) || 100,
        isActive: status === 'Ativo',
      }
    });
    return res.json(reward);
  } catch (err) {
    console.error('[Admin Rewards POST] Erro:', err);
    return res.status(500).json({ error: 'Erro ao criar recompensa' });
  }
});

router.put('/rewards/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, pointsCost, stockQuantity, status } = req.body;
    const reward = await prisma.reward.update({
      where: { id },
      data: {
        name: title,
        description,
        category,
        pointsCost: Number(pointsCost),
        stockQuantity: Number(stockQuantity),
        isActive: status === 'Ativo',
      }
    });
    return res.json(reward);
  } catch (err) {
    console.error('[Admin Rewards PUT] Erro:', err);
    return res.status(500).json({ error: 'Erro ao atualizar recompensa' });
  }
});

router.delete('/rewards/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.reward.delete({ where: { id } });
    return res.json({ message: 'Excluido' });
  } catch (err) {
    console.error('[Admin Rewards DELETE] Erro:', err);
    return res.status(500).json({ error: 'Erro ao deletar recompensa' });
  }
});

// ==========================================
// IA INSIGHTS E MODELOS PREDITIVOS
// ==========================================

router.get('/insights', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    // Simular retorno para fins de MVP.
    const mockInsights = [
      {
        id: '1',
        type: 'alert',
        title: 'Alto Risco de Evasão (Churn)',
        description: '15 pacientes da base de "Pré-Diabetes" não realizaram exames há mais de 90 dias.',
        confidence: 89,
        impact: 'critical',
        category: 'revenue',
        data: { 'Pacientes Atingidos': 15, 'Receita em Risco': 'R$ 2.450' },
        actionable: true,
        createdAt: new Date().toISOString(),
        priority: 1
      },
      {
        id: '2',
        type: 'opportunity',
        title: 'Tendência de Uso de Dermatologia',
        description: 'Buscamos um pico de 22% em buscas por telemedicina dermatológica esta semana.',
        confidence: 94,
        impact: 'medium',
        category: 'operations',
        data: { 'Volume de buscas': '+22%', 'Especialidade': 'Dermatologia' },
        actionable: false,
        createdAt: new Date().toISOString(),
        priority: 2
      }
    ];
    return res.json(mockInsights);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar insights' });
  }
});

router.get('/models', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const mockModels = [
      {
        id: 'model-1',
        name: 'Risk Prediction Network (Churn)',
        description: 'Rede neural treinada em 10.000 perfis para prever evasão de pacientes baseada na assiduidade.',
        accuracy: 92,
        lastTrained: new Date().toISOString(),
        predictions: [
          { metric: 'Retenção Esperada', current: 78, predicted: 85, timeframe: '30 dias', confidence: 92 }
        ]
      },
      {
        id: 'model-2',
        name: 'Adherence Monitor (Lucas AI)',
        description: 'Analisa o tempo de recompra de medicamentos e correlaciona com evolução clínica.',
        accuracy: 88,
        lastTrained: new Date().toISOString(),
        predictions: [
          { metric: 'Adesão Medicamentosa', current: 65, predicted: 72, timeframe: '60 dias', confidence: 85 }
        ]
      }
    ];
    return res.json(mockModels);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar modelos' });
  }
});

router.post('/insights/generate', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    // Simula a geração de um novo insight
    const newInsight = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'recommendation',
      title: 'Campanha Sazonal Sugerida',
      description: 'Baixa umidade do ar registrada. Sugerimos campanha de hidratação e venda de umidificadores na farmácia parceira.',
      confidence: 80,
      impact: 'low',
      category: 'revenue',
      data: { 'Produto Sugerido': 'Umidificador / Soro Fisiológico' },
      actionable: true,
      createdAt: new Date().toISOString(),
      priority: 3
    };
    return res.json(newInsight);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao gerar insight' });
  }
});

export default router;
