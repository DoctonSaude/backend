// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { sentinelaService, wearablesPilotService, getRecommendedChallenges } from '../services/gamification.service.js';
import progressionService from '../services/progression.service.js';
import prisma from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/gamification
 * Health check do módulo de gamificação
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'gamification-service',
    timestamp: new Date().toISOString(),
    version: 'v2.1-stable'
  });
});


// Helper para garantir que o registro de Patient exista para o usuário (Resiliência Gamification)
// Helper para garantir que o registro de Patient exista para o usuário (Resiliência Gamification)
const ensurePatient = async (userId?: string) => {
  if (!userId) throw new Error('UserId is required');

  let dbPatient;
  try {
    dbPatient = await prisma.patient.findUnique({ where: { userId } });
  } catch (e: any) {
    console.error(`[Gamification ensurePatient] Erro ao buscar paciente (UserId: ${userId}):`, e.message);
    throw new Error('Erro de conexão com o banco de dados');
  }

  if (!dbPatient) {
    console.log(`[Gamification ensurePatient] Criando registro faltante para userId: ${userId}`);
    // Tentar criar registro básico se não existir
    try {
      dbPatient = await prisma.patient.create({
        data: {
          userId,
          archetype: 'GENERAL',
          healthPoints: 0,
          experiencePoints: 0,
          level: 1
        }
      });
    } catch (e: any) {
      console.error(`[Gamification ensurePatient] Erro ao auto-criar paciente (UserId: ${userId}):`, e.message);
      throw new Error('Falha ao inicializar perfil de paciente');
    }
  }

  const mapped = {
    id: dbPatient.id,
    userId: dbPatient.userId,
    cpf: (dbPatient as any).cpf ?? '00000000000',
    birthDate: (dbPatient as any).birthDate ?? new Date('1990-01-01'),
    gender: ((dbPatient as any).gender as any) ?? 'UNSPECIFIED',
    healthPoints: (dbPatient as any).healthPoints ?? 0,
    level: (dbPatient as any).level ?? 1,
    currentStreak: (dbPatient as any).currentStreak ?? 0,
    longestStreak: (dbPatient as any).longestStreak ?? 0,
    createdAt: (dbPatient as any).createdAt ?? new Date(),
    updatedAt: (dbPatient as any).updatedAt ?? new Date()
  };
  return mapped;
};

router.get('/challenges', async (req, res) => {
  try {
    const list = await prisma.Challenge.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    return res.json(list);
  } catch (err) {
    console.error('[Gamification challenges] Erro:', err);
    return res.json([]);
  }
});

router.get('/my-challenges', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  const userId = req.user?.userId;

  try {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) {
      return res.json([]);
    }

    const my = await prisma.patientChallenge.findMany({
      where: { patientId: patient.id },
      orderBy: { updatedAt: 'desc' },
      include: { challenge: true }
    });
    
    // Mapear para o formato que o frontend espera
    const mapped = my.map(pc => {
      const challenge = pc.Challenge;
      return {
        id: pc.id,
        challengeId: pc.challengeId,
        title: challenge?.title || 'Desafio',
        description: challenge?.description || '',
        category: challenge?.category || 'general',
        pointsReward: challenge?.points || 0,
        progress: pc.progress || 0,
        target: challenge?.targetValue || 1,
        startDate: pc.startDate || pc.createdAt,
        endDate: pc.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: pc.status || 'ACTIVE'
      };
    });

    return res.json(mapped);
  } catch (error: any) {
    console.error('[Gamification my-challenges] Erro:', error.message);
    return res.json([]);
  }
});

router.post('/challenges/start', authenticate, authorize('PATIENT'), async (req, res) => {
  const { challengeId } = req.body;
  const userId = req.user?.userId;

  try {
    const dbPatient = await prisma.patient.findUnique({ where: { userId } });
    if (!dbPatient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const challenge = await prisma.Challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return res.status(404).json({ error: 'Desafio não encontrado' });

    const existing = await prisma.patientChallenge.findFirst({
      where: { patientId: dbPatient.id, challengeId }
    });

    if (existing) {
      if (existing.status === 'COMPLETED') {
        return res.status(400).json({ error: 'Você já completou este desafio' });
      }
      return res.json(existing);
    }

    const now = new Date();
    const pc = await prisma.patientChallenge.create({
      data: {
        patientId: dbPatient.id,
        challengeId,
        status: 'ACTIVE',
        progress: 0,
        startDate: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      },
      include: {
        challenge: true
      }
    });

    return res.json(pc);
  } catch (error) {
    console.error('Erro ao iniciar desafio:', error);
    return res.status(500).json({ error: 'Erro ao iniciar desafio' });
  }
});

router.delete('/challenges/:challengeId', authenticate, authorize('PATIENT'), async (req, res) => {
  const { challengeId } = req.params;
  const userId = req.user?.userId;

  try {
    const dbPatient = await prisma.patient.findUnique({ where: { userId } });
    if (!dbPatient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Encontrar por patientId e challengeId (lembrando que challengeId no PatientChallenge é o ID do template)
    const existing = await prisma.patientChallenge.findFirst({
      where: { patientId: dbPatient.id, challengeId }
    });

    if (!existing) {
      // Tentar por ID do registro caso o frontend tenha enviado pc.id em vez de pc.challengeId
      const byRecordId = await prisma.patientChallenge.findUnique({
        where: { id: challengeId, patientId: dbPatient.id }
      });

      if (!byRecordId) {
        return res.status(404).json({ error: 'Registro de desafio não encontrado' });
      }

      await prisma.patientChallenge.delete({
        where: { id: byRecordId.id }
      });
    } else {
      await prisma.patientChallenge.delete({
        where: { id: existing.id }
      });
    }

    return res.json({ message: 'Desafio removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover desafio:', error);
    return res.status(500).json({ error: 'Erro ao remover desafio' });
  }
});

router.post('/challenges/:challengeId/progress', authenticate, authorize('PATIENT'), async (req, res) => {
  const { challengeId } = req.params;
  const { progress } = req.body || {};
  const userId = req.user?.userId;
  try {
    const dbPatient = await prisma.patient.findUnique({ where: { userId } });
    if (!dbPatient) return res.status(404).json({ error: 'Paciente não encontrado' });
    const challenge = await prisma.Challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return res.status(404).json({ error: 'Desafio não encontrado' });
    const now = new Date();
    const existing = await prisma.patientChallenge.findFirst({
      where: { patientId: dbPatient.id, challengeId }
    });
    let pc = existing
      ? await prisma.patientChallenge.update({
        where: { id: existing.id },
        data: { progress: Number(progress) || 0, updatedAt: now }
      })
      : await prisma.patientChallenge.create({
        data: {
          patientId: dbPatient.id,
          challengeId,
          status: 'ACTIVE',
          progress: Number(progress) || 0,
          startDate: now,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    let completed = pc;
    let pointsEarned = 0;
    if (Challenge.targetValue && (Number(progress) || 0) >= Challenge.targetValue) {
      completed = await prisma.patientChallenge.update({
        where: { id: pc.id },
        data: { status: 'COMPLETED', completedAt: now, progress: Challenge.targetValue, updatedAt: now }
      });
      pointsEarned = Challenge.points || 0;
      await prisma.patient.update({
        where: { id: dbPatient.id },
        data: { healthPoints: (dbPatient.healthPoints || 0) + pointsEarned, totalChallengesCompleted: (dbPatient.totalChallengesCompleted || 0) + 1, updatedAt: now }
      });
      await prisma.pointsHistory.create({
        data: { patientId: dbPatient.id, points: pointsEarned, action: 'challenge_completed', description: `Desafio: ${Challenge.title}` }
      });
      const currentBadges = await prisma.patientBadge.findMany({ where: { patientId: dbPatient.id } });
      const newBadgeIds = progressionService.checkBadgeUnlocks({
        level: dbPatient.level || 1,
        totalXP: dbPatient.experiencePoints || 0,
        streak: dbPatient.currentStreak || 0,
        challengesCompleted: (dbPatient.totalChallengesCompleted || 0) + 1,
        badgesEarned: currentBadges.map(b => b.badgeId)
      });
      const createdBadges: any[] = [];
      for (const badgeId of newBadgeIds) {
        const badge = await prisma.Badge.findUnique({ where: { id: badgeId } }).catch(() => null);
        if (badge) {
          await prisma.patientBadge.create({ data: { patientId: dbPatient.id, badgeId, unlockedAt: now } });
          createdBadges.push(badge);
        }
      }
      return res.json({ message: 'Desafio completado!', patientchallenge: completed, pointsEarned, newBadges: createdBadges });
    }
    return res.json(completed);
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao atualizar progresso do desafio' });
  }
});

router.get('/badges', authenticate, async (req, res) => {
  try {
    const list = await prisma.Badge.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(list);
  } catch {
    return res.json([]);
  }
});

router.get('/my-badges', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  const userId = req.user?.userId;

  try {
    const patient = await ensurePatient(userId);
    const my = await prisma.patientBadge.findMany({
      where: { patientId: patient.id },
      orderBy: { unlockedAt: 'desc' },
      include: { Badge: true }
    });
    return res.json(my);
  } catch (error: any) {
    console.error('[Gamification my-badges] Erro:', error.message);
    return res.status(500).json({ error: 'Erro ao carregar insígnias' });
  }
});

router.get('/points-history', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  const userId = req.user?.userId;

  try {
    const patient = await ensurePatient(userId);
    const history = await prisma.pointsHistory.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(history);
  } catch (error: any) {
    console.error('[Gamification points-history] Erro:', error.message);
    return res.status(500).json({ error: 'Erro ao carregar histórico de pontos' });
  }
});

router.get('/rewards', authenticate, async (req, res) => {
  try {
    const list = await prisma.reward.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    return res.json(list);
  } catch (err) {
    console.error('[Gamification rewards] Erro:', err);
    return res.json([]);
  }
});

router.post('/rewards/:rewardId/redeem', authenticate, authorize('PATIENT'), async (req, res) => {
  const { rewardId } = req.params;
  const userId = req.user?.userId;
  try {
    const dbPatient = await prisma.patient.findUnique({ where: { userId } });
    if (!dbPatient) return res.status(404).json({ error: 'Paciente não encontrado' });
    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward) return res.status(404).json({ error: 'Recompensa não encontrada' });
    const points = dbPatient.healthPoints || 0;
    if (points < (reward.pointsCost || 0)) return res.status(400).json({ error: 'Pontos insuficientes' });
    if (typeof reward.stockQuantity === 'number' && reward.stockQuantity <= 0) return res.status(400).json({ error: 'Recompensa esgotada' });
    const code = `RW-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
    const now = new Date();
    const transactionItems: any[] = [
      prisma.patient.update({ where: { id: dbPatient.id }, data: { healthPoints: points - (reward.pointsCost || 0), updatedAt: now } }),
      prisma.pointsHistory.create({ data: { patientId: dbPatient.id, points: -(reward.pointsCost || 0), action: 'reward_redeem', description: `Resgate: ${(reward as any).title || reward.name}` } }),
      prisma.patientReward.create({ data: { patientId: dbPatient.id, rewardId, redeemedAt: now, isUsed: false, code } })
    ];

    if (typeof reward.stockQuantity === 'number') {
      transactionItems.push(
        prisma.reward.update({ where: { id: rewardId }, data: { stockQuantity: reward.stockQuantity - 1 } })
      );
    }

    await prisma.$transaction(transactionItems);
    return res.json({ message: 'Recompensa resgatada com sucesso!', reward: { code, rewardDetails: reward } });
  } catch (err) {
    console.error('[Gamification redeem-reward] Erro:', err);
    return res.status(500).json({ error: 'Erro ao resgatar recompensa' });
  }
});

router.get('/my-rewards', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  const userId = req.user?.userId;

  try {
    let patient;
    try {
      patient = await ensurePatient(userId);
    } catch {
      // Se não conseguir criar/encontrar o paciente, retorna array vazio
      return res.json([]);
    }

    // Busca as recompensas do paciente, sem o include reward para evitar erros se a tabela não existir
    const my = await prisma.patientReward.findMany({
      where: { patientId: patient.id },
      orderBy: { redeemedAt: 'desc' },
    });

    // Busca as recompensas separadamente e combina
    const rewards = await prisma.reward.findMany();
    const rewardMap = new Map(rewards.map(r => [r.id, r]));

    const myWithRewards = my.map(patientReward => ({
      ...patientReward,
      reward: rewardMap.get(patientReward.rewardId) || null
    }));

    return res.json(myWithRewards);
  } catch (error: any) {
    console.error('[Gamification my-rewards] Erro:', error);
    // Em caso de erro, retorna array vazio para não quebrar o frontend
    return res.json([]);
  }
});

router.get('/dashboard', authenticate, authorize('PATIENT'), async (req, res) => {
  const userId = req.user?.userId;
  const patient = await ensurePatient(userId);
  if (!patient) return res.status(404).json({ error: 'Perfil de paciente não encontrado' });

  try {
    const dbPatient = await prisma.patient.findUnique({ where: { id: patient.id } });
    if (!dbPatient) return res.status(404).json({ error: 'Paciente não encontrado' });
    const levelInfo = progressionService.getProgressionSnapshot(dbPatient.experiencePoints || 0);
    const [activeChallenges, completedChallenges, unlockedBadges, totalBadges] = await Promise.all([
      prisma.patientChallenge.count({ where: { patientId: patient.id, status: 'ACTIVE' } }),
      prisma.patientChallenge.count({ where: { patientId: patient.id, status: 'COMPLETED' } }),
      prisma.patientBadge.count({ where: { patientId: patient.id } }),
      prisma.Badge.count()
    ]);
    return res.json({
      healthPoints: dbPatient.healthPoints || 0,
      levelInfo,
      currentStreak: dbPatient.currentStreak || 0,
      longestStreak: dbPatient.longestStreak || 0,
      activeChallenges,
      completedChallenges,
      unlockedBadges,
      totalBadges
    });
  } catch (error: any) {
    const msg = error?.message ? String(error.message) : String(error);
    const code = error?.code;

    const dbUnavailable =
      process.env.NODE_ENV === 'production' &&
      (msg.toLowerCase().includes('economicGroup or user not found') ||
        msg.toLowerCase().includes('error querying the database') ||
        code === 'P1001');

    if (dbUnavailable) {
      console.log('[Gamification Dashboard Fallback] DB unavailable; returning minimal data');

      // Retornar dados mínimos para não quebrar o frontend
      return res.json({
        healthPoints: 0,
        levelInfo: {
          level: 1,
          experiencePoints: 0,
          experienceToNextLevel: 100,
          progressPercentage: 0
        },
        currentStreak: 0,
        longestStreak: 0,
        activeChallenges: 0,
        completedChallenges: 0,
        unlockedBadges: 0,
        totalBadges: 0,
        fallback: true
      });
    }

    return res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

// Endpoint para desafio em destaque (Featured Challenge)
router.get('/featured-challenge', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const featuredChallenge = await prisma.Challenge.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!featuredChallenge) {
      // Retorna 200 com null em vez de 404 para não crashar o frontend
      return res.json(null);
    }

    res.json(featuredChallenge);
  } catch (error) {
    console.error('[gamification] Erro ao buscar desafio em destaque:', error);
    // Retorna 200 com null em vez de 500 para não crashar o Dashboard
    res.json(null);
  }
});

// Endpoint para desafios recomendados
router.get('/recommended-challenges', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const dbPatient = await prisma.patient.findUnique({ where: { userId } });
    if (!dbPatient) return res.status(404).json({ error: 'Paciente não encontrado' });
    const patientChallenges = await prisma.patientChallenge.findMany({
      where: {
        patientId: dbPatient.id,
        status: { in: ['ACTIVE', 'COMPLETED'] }
      },
      select: { challengeId: true }
    });
    const excludedIds = patientChallenges.map(c => c.challengeId);
    const available = await prisma.Challenge.findMany({
      where: { isActive: true, NOT: { id: { in: excludedIds } } }
    });
    const typeOrder: Record<string, number> = { SPECIAL: 0, WEEKLY: 1, DAILY: 2, MONTHLY: 3 };
    const recommended = available
      .sort((a, b) => {
        const ta = String(a.type || '').toUpperCase();
        const tb = String(b.type || '').toUpperCase();
        const typeCompare = (typeOrder[ta] ?? 99) - (typeOrder[tb] ?? 99);
        if (typeCompare !== 0) return typeCompare;
        return (b.points || 0) - (a.points || 0);
      })
      .slice(0, 5);
    return res.json({
      challenges: recommended,
      metadata: {
        total: recommended.length,
        patientLevel: dbPatient.level || 1,
        completedChallenges: excludedIds.length
      }
    });
  } catch (error) {
    console.error('Erro ao buscar desafios recomendados:', error);
    return res.status(500).json({ error: 'Erro ao buscar desafios recomendados' });
  }
});

// Ranking Global/Social
router.get('/ranking', authenticate, async (req, res) => {
  try {
    let topPatients: any[] = [];
    try {
      topPatients = await prisma.patient.findMany({
        take: 20,
        orderBy: { experiencePoints: 'desc' },
        include: { User: { select: { id: true, name: true, avatar: true } } }
      });
    } catch (dbError) {
      console.error('[Gamification ranking] Erro no banco:', dbError);
    }

    const currentUserId = req.user?.userId;
    
    const ranking = topPatients.map((p, index) => ({
      id: p.id,
      name: (p as any).User?.name || (p as any).user?.name || 'Invisível',
      avatar: (p as any).User?.avatar || (p as any).user?.avatar,
      points: p.experiencePoints || 0,
      level: p.level || 1,
      streak: (p as any).currentStreak || 0,
      rank: index + 1,
      isCurrentUser: p.userId === currentUserId
    }));

    return res.json(ranking);
  } catch (error) {
    console.error('[Gamification ranking] Erro completo:', error);
    // Fallback seguro para não quebrar o frontend
    return res.json([]);
  }
});

// Dados de Fidelidade
router.get('/fidelity', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  try {
    const patient = await ensurePatient(req.user?.userId);
    return res.json({
      points: (patient as any).healthPoints || 0
    });
  } catch (error) {
    console.error('[Gamification fidelidade] Erro:', error);
    return res.json({ points: 0 });
  }
});

// Histórico de Fidelidade
router.get('/fidelity/history', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  try {
    const patient = await ensurePatient(req.user?.userId);
    const history = await prisma.pointsHistory.findMany({
      where: { patientId: (patient as any).id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return res.json(history);
  } catch (error) {
    console.error('[Gamification fidelidade history] Erro:', error);
    return res.json([]);
  }
});

// Timeline de Conquistas
router.get('/timeline', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  const userId = req.user?.userId;

  try {
    const patient = await ensurePatient(userId);
    const [badges, completedChallenges] = await Promise.all([
      prisma.patientBadge.findMany({
        where: { patientId: patient.id },
        include: { badge: true },
        orderBy: { unlockedAt: 'desc' },
        take: 10
      }),
      prisma.patientChallenge.findMany({
        where: { patientId: patient.id, status: 'COMPLETED' },
        include: { challenge: true },
        orderBy: { completedAt: 'desc' },
        take: 10
      })
    ]);

    // Consolidar em um formato de timeline
    const timeline = [
      ...badges.map(b => ({
        id: `badge-${b.id}`,
        type: b.Badge.category, // Usar a categoria real
        title: b.Badge.name,
        description: b.Badge.description,
        date: b.unlockedAt,
        icon: b.Badge.icon,
        color: 'purple'
      })),
      ...completedChallenges.map(c => ({
        id: `challenge-${c.id}`,
        type: 'challenge',
        title: c.Challenge.title,
        description: 'Desafio completado!',
        date: c.completedAt,
        icon: c.Challenge.icon || '🏆',
        color: 'green'
      }))
    ].sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());

    return res.json(timeline);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao carregar timeline' });
  }
});

// Histórico de XP para o gráfico de evolução
router.get('/xp-history', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  const userId = req.user?.userId;

  try {
    const patient = await ensurePatient(userId);
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const transactions = await prisma.xPTransaction.findMany({
      where: {
        patientId: patient.id,
        createdAt: { gte: fifteenDaysAgo }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Agrupar por dia
    const historyMap: Record<string, number> = {};

    // Inicializar os últimos 15 dias com 0
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      historyMap[dateStr] = 0;
    }

    transactions.forEach((t: any) => {
      const dateStr = new Date(t.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (historyMap[dateStr] !== undefined) {
        historyMap[dateStr] += (t.finalXP || 0);
      }
    });

    const history = Object.entries(historyMap).map(([date, xp]) => ({
      date,
      xp
    }));

    return res.json(history);
  } catch (error) {
    console.error('Erro ao buscar histórico de XP:', error);
    return res.status(500).json({ error: 'Erro ao buscar histórico de XP' });
  }
});

// Metas Pessoais CRUD
router.get('/goals', authenticate, authorize('PATIENT'), async (req: any, res: any) => {
  const userId = req.user?.userId;

  try {
    const patient = await ensurePatient(userId);
    const goals = await prisma.patientGoal.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(goals);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar metas' });
  }
});

router.post('/goals', authenticate, authorize('PATIENT'), async (req, res) => {
  const userId = req.user?.userId;
  const patient = await ensurePatient(userId);
  if (!patient) return res.status(404).json({ error: 'Perfil de paciente não encontrado' });

  try {
    const { title, description, target, type, deadline, reward } = req.body;
    const goal = await prisma.patientGoal.create({
      data: {
        patientId: patient.id,
        title,
        description,
        target: Number(target),
        type,
        deadline: deadline ? new Date(deadline) : null,
        reward,
        status: 'IN_PROGRESS'
      }
    });
    return res.json(goal);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

router.patch('/goals/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { current, status } = req.body;
    const goal = await prisma.patientGoal.update({
      where: { id },
      data: {
        current: current !== undefined ? Number(current) : undefined,
        status
      }
    });
    return res.json(goal);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
});

router.delete('/goals/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.patientGoal.delete({ where: { id } });
    return res.json({ message: 'Meta removida com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover meta' });
  }
});

// Achievement Shares CRUD
router.post('/shares', authenticate, authorize('PATIENT'), async (req, res) => {
  const { achievementTitle, achievementType, platform, imageUrl } = req.body;
  const userId = req.user?.userId;

  try {
    const dbPatient = await prisma.patient.findUnique({ where: { userId } });
    if (!dbPatient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const share = await prisma.achievementShare.create({
      data: {
        patientId: dbPatient.id,
        achievementTitle,
        achievementType,
        platform,
        imageUrl
      }
    });

    // Bônus por compartilhar (opcional)
    if (platform !== 'DOWNLOAD') {
      const bonusXP = achievementType === 'CHALLENGE_INVITE' ? 20 : 10;
      await prisma.patient.update({
        where: { id: dbPatient.id },
        data: { experiencePoints: { increment: bonusXP } }
      });
      await prisma.xPTransaction.create({
        data: {
          patientId: dbPatient.id,
          actionId: achievementType === 'CHALLENGE_INVITE' ? 'invite-friend' : 'share-achievement',
          actionName: achievementType === 'CHALLENGE_INVITE'
            ? `Convite enviado: ${achievementTitle}`
            : `Compartilhamento: ${achievementTitle}`,
          baseXP: bonusXP,
          finalXP: bonusXP,
          multipliers: {},
          context: { achievementType, platform }
        }
      });
    }

    return res.json(share);
  } catch (error) {
    console.error('Erro ao salvar compartilhamento:', error);
    return res.status(500).json({ error: 'Erro ao salvar compartilhamento' });
  }
});

router.get('/shares', authenticate, authorize('PATIENT'), async (req, res) => {
  const userId = req.user?.userId;
  try {
    const dbPatient = await prisma.patient.findUnique({ where: { userId } });
    if (!dbPatient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const shares = await prisma.achievementShare.findMany({
      where: { patientId: dbPatient.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(shares);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar compartilhamentos' });
  }
});

router.delete('/shares/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  try {
    const dbPatient = await prisma.patient.findUnique({ where: { userId } });
    if (!dbPatient) return res.status(404).json({ error: 'Paciente não encontrado' });

    await prisma.achievementShare.delete({
      where: { id, patientId: dbPatient.id }
    });
    return res.json({ message: 'Compartilhamento removido' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover compartilhamento' });
  }
});

// ============================================================================
// PROJETO SENTINELA - FASE 1: ROTAS DE ANÁLISE PREDITIVA RESPONSÁVEL
// ============================================================================

/**
 * GET /api/gamification/sentinela/correlations
 * Análise das 3 hipóteses principais de correlação
 */
router.get('/sentinela/correlations', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const correlations = {
      activityChurn: await sentinelaService.analyzeActivityChurnCorrelation(),
      hrvWellness: await sentinelaService.analyzeHRVWellnessCorrelation(),
      consistencySuccess: await sentinelaService.analyzeConsistencySuccessCorrelation()
    };

    res.json({
      message: 'Análise de correlações concluída',
      timestamp: new Date().toISOString(),
      correlations,
      ethicalNote: 'Todas as análises foram conduzidas em dados agregados e anonimizados'
    });
  } catch (error) {
    console.error('Erro ao analisar correlações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/gamification/sentinela/insights
 * Insights acionáveis baseados nas correlações
 */
router.get('/sentinela/insights', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const insights = await sentinelaService.generateWellnessInsights();

    res.json({
      message: 'Insights de bem-estar gerados com sucesso',
      timestamp: new Date().toISOString(),
      insights,
      usage: 'Estes insights são destinados à criação de conteúdo e melhorias de produto'
    });
  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/gamification/sentinela/phase1-report
 * Relatório completo da Fase 1 para o Comitê de Ética
 */
router.get('/sentinela/phase1-report', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const report = sentinelaService.generatePhase1Report();

    res.json({
      message: 'Relatório Fase 1 - Projeto Sentinela',
      generatedAt: new Date().toISOString(),
      phase: 'Fase 1 - Engatinhar (Análise de Correlações)',
      report,
      ethicalApproval: {
        required: true,
        status: 'pending',
        note: 'Este relatório deve ser aprovado pelo Comitê de Ética antes de prosseguir para a Fase 2'
      }
    });
  } catch (error) {
    console.error('Erro ao gerar relatório Fase 1:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/gamification/sentinela/content-suggestions
 * Sugestões de conteúdo baseadas nos insights encontrados
 */
router.get('/sentinela/content-suggestions', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const insights = await sentinelaService.generateWellnessInsights();

    // Extrair todas as sugestões de conteúdo
    const contentSuggestions = insights.flatMap(insight =>
      insight.contentSuggestions.map(suggestion => ({
        category: insight.id,
        title: insight.title,
        suggestion,
        priority: insight.correlation.significance < 0.05 ? 'high' : 'medium',
        basedOn: insight.correlation.hypothesis
      }))
    );

    // Extrair conselhos acionáveis para produto
    const actionableAdvice = insights.flatMap(insight =>
      insight.actionableAdvice.map(advice => ({
        category: insight.id,
        advice,
        correlation: insight.correlation.correlation,
        significance: insight.correlation.significance
      }))
    );

    res.json({
      message: 'Sugestões de conteúdo baseadas em dados',
      timestamp: new Date().toISOString(),
      contentSuggestions,
      actionableAdvice,
      note: 'Conteúdo derivado de análises éticas e responsáveis'
    });
  } catch (error) {
    console.error('Erro ao gerar sugestões de conteúdo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/gamification/sentinela/health-check
 * Verificação de saúde do sistema Sentinela
 */
router.get('/sentinela/health-check', async (req, res) => {
  try {
    // Verificar se o serviço está funcionando
    const testDataset = await sentinelaService.generateAnonymizedDataset();
    const healthStatus = {
      status: 'healthy',
      phase: 'Fase 1 - Análise de Correlações',
      datasetSize: (testDataset as any).length,
      lastAnalysis: new Date().toISOString(),
      ethicalCompliance: {
        dataAnonymization: true,
        noIndividualAlerts: true,
        focusOnContent: true,
        transparentMethodology: true
      },
      availableEndpoints: [
        '/api/gamification/sentinela/correlations',
        '/api/gamification/sentinela/insights',
        '/api/gamification/sentinela/content-suggestions',
        '/api/gamification/sentinela/health-check'
      ]
    };

    res.json(healthStatus);
  } catch (error) {
    console.error('Erro no health check do Sentinela:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Erro no sistema Sentinela',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// PROJETO CONEXÃO - FASE 0: ROTAS DO PILOTO WEARABLES
// ============================================================================

/**
 * POST /api/gamification/wearables/connect
 * Conectar com Google Fit ou Apple Health
 */
router.post('/wearables/connect', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { platform } = req.body;

    // Default to strict 'google_fit' if not recognized, just to be safe, but allow 'apple_health'
    const validPlatform = platform === 'apple_health' ? 'apple_health' : 'google_fit';

    const result = await wearablesPilotService.connectWearable(userId, validPlatform);

    if (result.success) {
      const platformName = validPlatform === 'apple_health' ? 'Apple Health' : 'Google Fit';
      res.json({
        message: `🎉 ${platformName} conectado com sucesso!`,
        connection: result.connection,
        nextSteps: [
          'Seus passos serão sincronizados automaticamente',
          'Desafios de passos serão completados automaticamente',
          'Verifique a aba Desafios para ver o progresso'
        ]
      });
    } else {
      res.status(400).json({
        error: result.error,
        suggestion: 'Verifique se o aplicativo de saúde está instalado e tente novamente'
      });
    }
  } catch (error) {
    console.error('Erro ao conectar wearable:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/gamification/wearables/status
 * Verificar status da conexão
 */
router.get('/wearables/status', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;

    const connection = await wearablesPilotService.getConnectionStatus(userId);

    res.json({
      connected: !!connection,
      connection,
      message: connection
        ? `Wearable (${connection.platform}) conectado e sincronizando`
        : 'Nenhum wearable conectado'
    });
  } catch (error) {
    console.error('[gamification] Erro ao verificar status do wearable:', error);
    // Retorna 200 com connected=false em vez de 500, evitando crash do Dashboard
    res.json({ connected: false, connection: null, message: 'Status indisponível temporariamente' });
  }
});

/**
 * POST /api/gamification/wearables/sync
 * Sincronizar dados de passos e verificar desafios
 */
router.post('/wearables/sync', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Sincronizar dados de passos
    const stepsData = await wearablesPilotService.syncStepsData(userId);
    const todaySteps = stepsData[stepsData.length - 1]?.steps || 0;

    // Verificar e completar desafios automaticamente
    const challengeResult = await wearablesPilotService.checkAndCompleteStepChallenges(userId, todaySteps);

    res.json({
      message: 'Sincronização concluída',
      stepsToday: todaySteps,
      stepsHistory: stepsData,
      challengesCompleted: challengeResult.challengesCompleted,
      pointsEarned: challengeResult.pointsEarned,
      notifications: challengeResult.notifications,
      magicMoment: challengeResult.challengesCompleted.length > 0
    });
  } catch (error) {
    console.error('Erro na sincronização:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/gamification/wearables/disconnect
 * Desconectar wearable
 */
router.delete('/wearables/disconnect', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { platform } = req.body;

    const success = await wearablesPilotService.disconnectWearable(userId, platform);

    if (success) {
      res.json({
        message: 'Wearable desconectado com sucesso',
        note: 'Você pode reconectar a qualquer momento'
      });
    } else {
      res.status(400).json({ error: 'Falha ao desconectar' });
    }
  } catch (error) {
    console.error('Erro ao desconectar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/gamification/wearables/pilot-metrics
 * Métricas do piloto (apenas para admins)
 */
router.get('/wearables/pilot-metrics', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const metrics = await wearablesPilotService.generatePilotMetrics();

    res.json({
      message: 'Métricas do Piloto - Fase 0',
      timestamp: new Date().toISOString(),
      metrics,
      analysis: {
        connectionSuccess: (metrics as any).connectionRate >= 60 ? 'Excelente' :
          (metrics as any).connectionRate >= 40 ? 'Bom' : 'Precisa melhorar',
        userSatisfaction: (metrics as any).userSatisfaction >= 8 ? 'Alta' :
          (metrics as any).userSatisfaction >= 6 ? 'Média' : 'Baixa',
        technicalStability: (metrics as any).technicalIssues <= 2 ? 'Estável' : 'Instável',
        recommendation: (metrics as any).connectionRate >= 60 && (metrics as any).userSatisfaction >= 7
          ? 'Prosseguir para Fase 1 completa'
          : 'Ajustar abordagem antes de expandir'
      }
    });
  } catch (error) {
    console.error('Erro ao gerar métricas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;



