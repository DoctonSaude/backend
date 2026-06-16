// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { LoyaltyService } from '../services/loyalty.service.js';
import { getLevelInfo, updateStreak } from '../services/gamification.service.js';

const router = Router();

// Helper para garantir que o registro de Patient exista para o usuário
const ensurePatient = async (userId: string, personId?: string) => {
  // 1. Tentar encontrar por userId (mais confiável para novos registros)
  let patient = await prisma.patient.findUnique({
    where: { userId }
  });

  if (patient) return patient;

  // 2. Se não achou por userId, tentar por personId se disponível
  if (personId) {
    patient = await prisma.patient.findUnique({
      where: { personId }
    });
    if (patient) return patient;
  }

  // 3. Criar registro padrão se não existir (Resiliência)
  console.log('[ensurePatient] Criando registro de paciente faltante para userId:', userId);

  // Garantir que temos um personId se estiver faltando (opcional mas recomendado no schema)
  let targetPersonId = personId;
  if (!targetPersonId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { personId: true }
    });
    targetPersonId = user?.personId || undefined;
  }

  patient = await prisma.patient.create({
    data: {
      userId,
      personId: targetPersonId,
      archetype: 'GENERAL',
      healthPoints: 0,
      experiencePoints: 0
    }
  });

  return patient;
};

/**
 * GET /patients/gamification
 * Retorna streak, missões do dia, pontos e economia gerada
 */
router.get('/gamification', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    console.log('[Gamification] Step 1: Received request');
    const userId = req.user?.userId;
    const personId = req.user?.personId;
    console.log('[Gamification] Step 2: userId =', userId);
    
    const patient = await ensurePatient(userId, personId);
    console.log('[Gamification] Step 3: patient =', patient);

    // Obter ou criar desafios para o paciente
    console.log('[Gamification] Step 4: Querying patient challenges...');
    let patientChallenges = await prisma.patientChallenge.findMany({
      where: { patientId: patient.id },
      include: { Challenge: true },
      orderBy: [{ createdAt: 'desc' }]
    });
    console.log('[Gamification] Step 5: Found patientChallenges count:', patientChallenges.length);

    // Se não existir nenhum desafio, criar alguns padrões
    if (patientChallenges.length === 0) {
      console.log('[Gamification] Step 6: Creating default challenges...');
      const defaultChallenges = [
        {
          title: 'Check-in diário',
          description: 'Faça check-in todos os dias para manter o streak',
          points: 50,
          icon: 'Heart',
          type: 'checkin',
          difficulty: 'EASY' as const,
          category: 'lifestyle',
          targetValue: 1
        },
        {
          title: 'Registrar peso',
          description: 'Registe seu peso pelo menos uma vez por semana',
          points: 100,
          icon: 'Scale',
          type: 'weight',
          difficulty: 'EASY' as const,
          category: 'physical',
          targetValue: 1
        },
        {
          title: 'Registrar pressão',
          description: 'Registe sua pressão arterial',
          points: 150,
          icon: 'Activity',
          type: 'blood_pressure',
          difficulty: 'MEDIUM' as const,
          category: 'vital_signs',
          targetValue: 1
        }
      ];

      // Verificar se os desafios existem no banco
      for (const challengeData of defaultChallenges) {
        console.log('[Gamification] Step 6a: Processing challenge type:', challengeData.type);
        let challenge = await prisma.challenge.findFirst({ 
          where: { type: challengeData.type } 
        });
        console.log('[Gamification] Step 6b: Existing challenge found?', !!challenge);
        
        if (!challenge) {
          console.log('[Gamification] Step 6c: Creating new challenge...');
          challenge = await prisma.challenge.create({ 
            data: { ...challengeData, isActive: true } 
          });
          console.log('[Gamification] Step 6d: Challenge created:', challenge.id);
        }

        console.log('[Gamification] Step 6e: Creating patient challenge...');
        await prisma.patientChallenge.create({
          data: {
            patientId: patient.id,
            challengeId: challenge.id,
            status: 'ACTIVE',
            progress: 0,
            startDate: new Date()
          }
        });
        console.log('[Gamification] Step 6f: Patient challenge created');
      }

      console.log('[Gamification] Step 7: Re-querying patient challenges...');
      patientChallenges = await prisma.patientChallenge.findMany({
        where: { patientId: patient.id },
        include: { Challenge: true },
        orderBy: [{ createdAt: 'desc' }]
      });
      console.log('[Gamification] Step 8: New patientChallenges count:', patientChallenges.length);
    }

    console.log('[Gamification] Step 9: Mapping missions...');
    const missions = patientChallenges.map(pc => ({
      id: pc.challengeId,
      title: pc.Challenge?.title,
      description: pc.Challenge?.description,
      desc: pc.Challenge?.description, // Alias for frontend compatibility
      points: pc.Challenge?.points,
      done: pc.status === 'COMPLETED',
      icon: pc.Challenge?.icon || 'CheckCircle2',
      progress: pc.progress,
      target: pc.Challenge?.targetValue
    }));
    console.log('[Gamification] Step 10: Missions mapped:', missions);

    console.log('[Gamification] Step 11: Getting level info...');
    const levelInfo = getLevelInfo(patient.healthPoints || 0);
    console.log('[Gamification] Step 12: Level info:', levelInfo);
    const tier = levelInfo.level >= 10 ? 'DIAMOND' : levelInfo.level >= 7 ? 'GOLD' : levelInfo.level >= 4 ? 'SILVER' : 'BRONZE';

    const gamificationData = {
      streak: patient.currentStreak || 0,
      longestStreak: patient.longestStreak || 0,
      points: patient.healthPoints || 0,
      xp: patient.experiencePoints || 0,
      level: levelInfo.level,
      levelTitle: `Nível ${levelInfo.level}`,
      levelTier: tier,
      savings: 0, // Placeholder for savings
      missions,
      progress: levelInfo.progress
    };

    console.log('[Gamification] Step 13: Sending data:', gamificationData);
    res.json(gamificationData);
  } catch (error) {
    console.error('[Gamification] FULL ERROR:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar missões e conquistas',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * POST /patients/gamification/checkin
 * Registra o check-in diário e incrementa o streak
 */
router.post('/gamification/checkin', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const personId = req.user?.personId;
    const { mood } = req.body;
    
    const patient = await ensurePatient(userId, personId);

    const updatedPatient = await updateStreak(patient.id);

    if (!updatedPatient) {
      return res.status(500).json({ error: 'Erro ao registrar check-in' });
    }

    // Verificar se já fez check-in hoje
    const today = new Date();
    today.setHours(0,0,0,0);
    const lastActive = updatedPatient.lastActiveDate ? new Date(updatedPatient.lastActiveDate) : null;
    const lastActiveMidnight = lastActive ? new Date(lastActive) : null;
    if (lastActiveMidnight) lastActiveMidnight.setHours(0,0,0,0);
    
    const alreadyDone = lastActiveMidnight && lastActiveMidnight.getTime() === today.getTime();

    // Adicionar pontos
    let pointsEarned = 10;
    let bonusStreak = false;
    if ((updatedPatient.currentStreak || 0) % 7 === 0 && (updatedPatient.currentStreak || 0) > 0) {
      pointsEarned += 50; // Bonus de streak de 7 dias
      bonusStreak = true;
    }

    await LoyaltyService.awardPoints(
      patient.id, 
      pointsEarned, 
      'daily_checkin', 
      mood ? `Check-in com humor: ${mood}` : 'Check-in diário'
    );

    // Registrar health log do check-in
    if (mood) {
      await prisma.healthLog.create({
        data: {
          patientId: patient.id,
          type: 'MOOD',
          value: String(mood),
          logDate: new Date()
        }
      }).catch(console.error);
    }

    // Marcar o desafio de check-in como concluído
    const checkinChallenge = await prisma.patientChallenge.findFirst({
      where: { patientId: patient.id, Challenge: { type: 'checkin' } },
      include: { Challenge: true }
    });

    if (checkinChallenge && checkinChallenge.status !== 'COMPLETED') {
      await prisma.patientChallenge.update({
        where: { id: checkinChallenge.id },
        data: { 
          status: 'COMPLETED', 
          completedAt: new Date(), 
          progress: 1 
        }
      });
    }

    res.json({
      streak: updatedPatient.currentStreak,
      longestStreak: updatedPatient.longestStreak,
      pointsEarned,
      alreadyDone,
      bonusStreak
    });
  } catch (error) {
    console.error('Erro ao registrar check-in:', error);
    res.status(500).json({ error: 'Erro ao registrar check-in' });
  }
});

/**
 * GET /patients/fidelity
 * Retorna dados de fidelidade do paciente
 */
router.get('/fidelity', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const personId = req.user?.personId;
    const patient = await ensurePatient(userId, personId);
    return res.json({
      points: patient.healthPoints || 0,
      xp: patient.experiencePoints || 0,
      level: patient.fidelityTier || 'BRONZE'
    });
  } catch (error) {
    console.error('[Fidelidade] Erro:', error);
    return res.json({ points: 0 });
  }
});

/**
 * GET /patients/fidelity/history
 * Retorna histórico de pontos do paciente
 */
router.get('/fidelity/history', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const personId = req.user?.personId;
    const patient = await ensurePatient(userId, personId);
    const history = await prisma.pointsHistory.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return res.json(history);
  } catch (error) {
    console.error('[Fidelidade History] Erro:', error);
    return res.json([]);
  }
});

export default router;
