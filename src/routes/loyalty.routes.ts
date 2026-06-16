import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// Mock de tiers do programa de fidelidade (compatível com o frontend)
const loyaltyTiers = [
  {
    id: 'BRONZE',
    name: 'Bronze',
    minPoints: 0,
    perks: ['5% de desconto em consultas selecionadas', 'Suporte básico'],
  },
  {
    id: 'PRATA',
    name: 'Prata',
    minPoints: 1000,
    perks: ['10% de desconto', 'Suporte prioritário', 'Consultas grátis mensais*'],
  },
  {
    id: 'OURO',
    name: 'Ouro',
    minPoints: 5000,
    perks: ['15% de desconto', 'Concierge médico', 'Benefícios exclusivos com parceiros'],
  },
  {
    id: 'DIAMANTE',
    name: 'Diamante',
    minPoints: 15000,
    perks: ['20% de desconto', 'Acesso VIP', 'Experiências de bem-estar'],
  },
];

// Versão inicial totalmente mockada: pontos fixos apenas para demonstrar a UI
// No futuro, isso deve ser calculado a partir de transações reais de fidelidade / gamificação.
router.get('/me', authenticate, authorize('PATIENT'), async (req, res) => {
  const userId = req.user?.userId;

  try {
    const dbPatient = await prisma.patient.findUnique({
      where: { userId },
      select: { healthPoints: true, id: true }
    });

    if (!dbPatient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const points = dbPatient.healthPoints || 0;

    const now = new Date();
    // Buscar tiers do banco
    let tiers = await prisma.loyaltyTier.findMany({
      where: {
        isActive: true,
        OR: [
          { type: 'DEFAULT' },
          {
            AND: [
              { type: 'SEASONAL' },
              { startDate: { lte: now } },
              { endDate: { gte: now } }
            ]
          }
        ]
      },
      orderBy: { minPoints: 'asc' }
    });

    // Se estiver vazio, usar os padrões
    if (tiers.length === 0) {
      tiers = loyaltyTiers as any;
    }

    const currentTier = [...tiers]
      .reverse()
      .find(tier => points >= tier.minPoints) || tiers[0];

    const currentIndex = tiers.findIndex(t => t.id === currentTier.id);
    const nextTier = currentIndex >= 0 && currentIndex < tiers.length - 1
      ? tiers[currentIndex + 1]
      : null;

    const pointsToNextTier = nextTier ? Math.max(nextTier.minPoints - points, 0) : 0;

    // Buscar campanhas ativas para informar o usuário
    const activeCampaigns = await prisma.loyaltyCampaign.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      select: { name: true, multiplier: true }
    });

    const activeMultiplier = activeCampaigns.length > 0
      ? Math.max(...activeCampaigns.map(c => c.multiplier))
      : 1.0;

    res.json({
      pointsBalance: points,
      lifetimePoints: points, // Por enquanto usamos o saldo, mas poderíamos somar PointsHistory positivo
      currentTier,
      nextTier,
      pointsToNextTier,
      activeCampaigns,
      activeMultiplier
    });
  } catch (error: any) {
    console.error('Erro ao buscar dados de fidelidade:', error);
    
    // Fallback quando DB indisponível
    const msg = error?.message ? String(error.message) : String(error);
    const code = error?.code;

    const dbUnavailable =
      process.env.NODE_ENV === 'production' &&
      (msg.toLowerCase().includes('economicGroup or user not found') ||
        msg.toLowerCase().includes('error querying the database') ||
        code === 'P1001');

    if (dbUnavailable) {
      console.log('[Loyalty Fallback] DB unavailable; returning default loyalty data');
      
      // Retornar dados padrão para não quebrar o frontend
      const defaultTier = loyaltyTiers[0];
      res.json({
        pointsBalance: 0,
        lifetimePoints: 0,
        currentTier: defaultTier,
        nextTier: loyaltyTiers[1] || null,
        pointsToNextTier: defaultTier.minPoints,
        activeCampaigns: [],
        activeMultiplier: 1.0,
        fallback: true
      });
      return;
    }

    res.status(500).json({ error: 'Erro interno ao buscar fidelidade' });
  }
});

// Lista de níveis do programa
router.get('/tiers', async (req, res) => {
  try {
    let tiers = await prisma.loyaltyTier.findMany({
      where: { isActive: true },
      orderBy: { minPoints: 'asc' }
    });

    if (tiers.length === 0) {
      tiers = loyaltyTiers as any;
    }

    res.json({ tiers });
  } catch (error) {
    res.json({ tiers: loyaltyTiers });
  }
});

// Endpoint para extrato de pontos real
router.get('/transactions', authenticate, authorize('PATIENT'), async (req, res) => {
  const userId = req.user?.userId;
  try {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const history = await prisma.pointsHistory.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const mapped = history.map(h => ({
      id: h.id,
      type: h.points > 0 ? 'EARN' : 'REDEEM',
      points: Math.abs(h.points),
      reason: h.action,
      description: h.description,
      createdAt: h.createdAt,
    }));

    res.json({ items: mapped, total: mapped.length });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar extrato' });
  }
});

export default router;
