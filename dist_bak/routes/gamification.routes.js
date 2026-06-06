"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const gamification_service_js_1 = require("../services/gamification.service.js");
const progression_service_js_1 = __importDefault(require("../services/progression.service.js"));
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const router = (0, express_1.Router)();
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
const ensurePatient = async (userId) => {
    if (!userId)
        throw new Error('UserId is required');
    let dbPatient;
    try {
        dbPatient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
    }
    catch (e) {
        console.error(`[Gamification ensurePatient] Erro ao buscar paciente (UserId: ${userId}):`, e.message);
        throw new Error('Erro de conexão com o banco de dados');
    }
    if (!dbPatient) {
        console.log(`[Gamification ensurePatient] Criando registro faltante para userId: ${userId}`);
        // Tentar criar registro básico se não existir
        try {
            dbPatient = await prisma_js_1.default.patient.create({
                data: {
                    userId,
                    archetype: 'GENERAL',
                    healthPoints: 0,
                    experiencePoints: 0,
                    level: 1
                }
            });
        }
        catch (e) {
            console.error(`[Gamification ensurePatient] Erro ao auto-criar paciente (UserId: ${userId}):`, e.message);
            throw new Error('Falha ao inicializar perfil de paciente');
        }
    }
    const mapped = {
        id: dbPatient.id,
        userId: dbPatient.userId,
        cpf: dbPatient.cpf ?? '00000000000',
        birthDate: dbPatient.birthDate ?? new Date('1990-01-01'),
        gender: dbPatient.gender ?? 'UNSPECIFIED',
        healthPoints: dbPatient.healthPoints ?? 0,
        level: dbPatient.level ?? 1,
        currentStreak: dbPatient.currentStreak ?? 0,
        longestStreak: dbPatient.longestStreak ?? 0,
        createdAt: dbPatient.createdAt ?? new Date(),
        updatedAt: dbPatient.updatedAt ?? new Date()
    };
    return mapped;
};
router.get('/challenges', auth_js_1.authenticate, async (req, res) => {
    try {
        const list = await prisma_js_1.default.challenge.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
        return res.json(list);
    }
    catch {
        return res.json([]);
    }
});
router.get('/my-challenges', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const userId = req.user?.userId;
    try {
        const patient = await ensurePatient(userId);
        const my = await prisma_js_1.default.patientChallenge.findMany({
            where: { patientId: patient.id },
            orderBy: { updatedAt: 'desc' },
            include: { challenge: true }
        });
        return res.json(my);
    }
    catch (error) {
        console.error('[Gamification my-challenges] Erro:', error.message);
        return res.status(500).json({ error: error.message || 'Erro ao carregar desafios' });
    }
});
router.post('/challenges/start', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const { challengeId } = req.body;
    const userId = req.user?.userId;
    try {
        const dbPatient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!dbPatient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const challenge = await prisma_js_1.default.challenge.findUnique({ where: { id: challengeId } });
        if (!challenge)
            return res.status(404).json({ error: 'Desafio não encontrado' });
        const existing = await prisma_js_1.default.patientChallenge.findFirst({
            where: { patientId: dbPatient.id, challengeId }
        });
        if (existing) {
            if (existing.status === 'COMPLETED') {
                return res.status(400).json({ error: 'Você já completou este desafio' });
            }
            return res.json(existing);
        }
        const now = new Date();
        const pc = await prisma_js_1.default.patientChallenge.create({
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
    }
    catch (error) {
        console.error('Erro ao iniciar desafio:', error);
        return res.status(500).json({ error: 'Erro ao iniciar desafio' });
    }
});
router.delete('/challenges/:challengeId', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const { challengeId } = req.params;
    const userId = req.user?.userId;
    try {
        const dbPatient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!dbPatient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        // Encontrar por patientId e challengeId (lembrando que challengeId no PatientChallenge é o ID do template)
        const existing = await prisma_js_1.default.patientChallenge.findFirst({
            where: { patientId: dbPatient.id, challengeId }
        });
        if (!existing) {
            // Tentar por ID do registro caso o frontend tenha enviado pc.id em vez de pc.challengeId
            const byRecordId = await prisma_js_1.default.patientChallenge.findUnique({
                where: { id: challengeId, patientId: dbPatient.id }
            });
            if (!byRecordId) {
                return res.status(404).json({ error: 'Registro de desafio não encontrado' });
            }
            await prisma_js_1.default.patientChallenge.delete({
                where: { id: byRecordId.id }
            });
        }
        else {
            await prisma_js_1.default.patientChallenge.delete({
                where: { id: existing.id }
            });
        }
        return res.json({ message: 'Desafio removido com sucesso' });
    }
    catch (error) {
        console.error('Erro ao remover desafio:', error);
        return res.status(500).json({ error: 'Erro ao remover desafio' });
    }
});
router.post('/challenges/:challengeId/progress', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const { challengeId } = req.params;
    const { progress } = req.body || {};
    const userId = req.user?.userId;
    try {
        const dbPatient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!dbPatient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const challenge = await prisma_js_1.default.challenge.findUnique({ where: { id: challengeId } });
        if (!challenge)
            return res.status(404).json({ error: 'Desafio não encontrado' });
        const now = new Date();
        const existing = await prisma_js_1.default.patientChallenge.findFirst({
            where: { patientId: dbPatient.id, challengeId }
        });
        let pc = existing
            ? await prisma_js_1.default.patientChallenge.update({
                where: { id: existing.id },
                data: { progress: Number(progress) || 0, updatedAt: now }
            })
            : await prisma_js_1.default.patientChallenge.create({
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
        if (challenge.targetValue && (Number(progress) || 0) >= challenge.targetValue) {
            completed = await prisma_js_1.default.patientChallenge.update({
                where: { id: pc.id },
                data: { status: 'COMPLETED', completedAt: now, progress: challenge.targetValue, updatedAt: now }
            });
            pointsEarned = challenge.points || 0;
            await prisma_js_1.default.patient.update({
                where: { id: dbPatient.id },
                data: { healthPoints: (dbPatient.healthPoints || 0) + pointsEarned, totalChallengesCompleted: (dbPatient.totalChallengesCompleted || 0) + 1, updatedAt: now }
            });
            await prisma_js_1.default.pointsHistory.create({
                data: { patientId: dbPatient.id, points: pointsEarned, action: 'challenge_completed', description: `Desafio: ${challenge.title}` }
            });
            const currentBadges = await prisma_js_1.default.patientBadge.findMany({ where: { patientId: dbPatient.id } });
            const newBadgeIds = progression_service_js_1.default.checkBadgeUnlocks({
                level: dbPatient.level || 1,
                totalXP: dbPatient.experiencePoints || 0,
                streak: dbPatient.currentStreak || 0,
                challengesCompleted: (dbPatient.totalChallengesCompleted || 0) + 1,
                badgesEarned: currentBadges.map(b => b.badgeId)
            });
            const createdBadges = [];
            for (const badgeId of newBadgeIds) {
                const badge = await prisma_js_1.default.badge.findUnique({ where: { id: badgeId } }).catch(() => null);
                if (badge) {
                    await prisma_js_1.default.patientBadge.create({ data: { patientId: dbPatient.id, badgeId, unlockedAt: now } });
                    createdBadges.push(badge);
                }
            }
            return res.json({ message: 'Desafio completado!', patientChallenge: completed, pointsEarned, newBadges: createdBadges });
        }
        return res.json(completed);
    }
    catch (e) {
        return res.status(500).json({ error: 'Erro ao atualizar progresso do desafio' });
    }
});
router.get('/badges', auth_js_1.authenticate, async (req, res) => {
    try {
        const list = await prisma_js_1.default.badge.findMany({ orderBy: { createdAt: 'desc' } });
        return res.json(list);
    }
    catch {
        return res.json([]);
    }
});
router.get('/my-badges', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const userId = req.user?.userId;
    try {
        const patient = await ensurePatient(userId);
        const my = await prisma_js_1.default.patientBadge.findMany({
            where: { patientId: patient.id },
            orderBy: { unlockedAt: 'desc' },
            include: { badge: true }
        });
        return res.json(my);
    }
    catch (error) {
        console.error('[Gamification my-badges] Erro:', error.message);
        return res.status(500).json({ error: 'Erro ao carregar insígnias' });
    }
});
router.get('/points-history', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const userId = req.user?.userId;
    try {
        const patient = await ensurePatient(userId);
        const history = await prisma_js_1.default.pointsHistory.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(history);
    }
    catch (error) {
        console.error('[Gamification points-history] Erro:', error.message);
        return res.status(500).json({ error: 'Erro ao carregar histórico de pontos' });
    }
});
router.get('/rewards', auth_js_1.authenticate, async (req, res) => {
    try {
        const list = await prisma_js_1.default.reward.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
        return res.json(list);
    }
    catch {
        return res.json([]);
    }
});
router.post('/rewards/:rewardId/redeem', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const { rewardId } = req.params;
    const userId = req.user?.userId;
    try {
        const dbPatient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!dbPatient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const reward = await prisma_js_1.default.reward.findUnique({ where: { id: rewardId } });
        if (!reward)
            return res.status(404).json({ error: 'Recompensa não encontrada' });
        const points = dbPatient.healthPoints || 0;
        if (points < (reward.pointsCost || 0))
            return res.status(400).json({ error: 'Pontos insuficientes' });
        if (typeof reward.stockQuantity === 'number' && reward.stockQuantity <= 0)
            return res.status(400).json({ error: 'Recompensa esgotada' });
        const code = `RW-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
        const now = new Date();
        await prisma_js_1.default.$transaction([
            prisma_js_1.default.patient.update({ where: { id: dbPatient.id }, data: { healthPoints: points - (reward.pointsCost || 0), updatedAt: now } }),
            prisma_js_1.default.pointsHistory.create({ data: { patientId: dbPatient.id, points: -(reward.pointsCost || 0), action: 'reward_redeem', description: `Resgate: ${reward.name}` } }),
            prisma_js_1.default.reward.update({ where: { id: rewardId }, data: typeof reward.stockQuantity === 'number' ? { stockQuantity: reward.stockQuantity - 1 } : {} }),
            prisma_js_1.default.patientReward.create({ data: { patientId: dbPatient.id, rewardId, redeemedAt: now, isUsed: false, code } })
        ]);
        return res.json({ message: 'Recompensa resgatada com sucesso!', reward: { code, rewardDetails: reward } });
    }
    catch {
        return res.status(500).json({ error: 'Erro ao resgatar recompensa' });
    }
});
router.get('/my-rewards', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const userId = req.user?.userId;
    try {
        const patient = await ensurePatient(userId);
        const my = await prisma_js_1.default.patientReward.findMany({
            where: { patientId: patient.id },
            orderBy: { redeemedAt: 'desc' },
            include: { reward: true }
        });
        return res.json(my);
    }
    catch (error) {
        console.error('[Gamification my-rewards] Erro:', error.message);
        return res.status(500).json({ error: 'Erro ao carregar recompensas' });
    }
});
router.get('/dashboard', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const userId = req.user?.userId;
    const patient = await ensurePatient(userId);
    if (!patient)
        return res.status(404).json({ error: 'Perfil de paciente não encontrado' });
    try {
        const dbPatient = await prisma_js_1.default.patient.findUnique({ where: { id: patient.id } });
        if (!dbPatient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const levelInfo = progression_service_js_1.default.getProgressionSnapshot(dbPatient.experiencePoints || 0);
        const [activeChallenges, completedChallenges, unlockedBadges, totalBadges] = await Promise.all([
            prisma_js_1.default.patientChallenge.count({ where: { patientId: patient.id, status: 'ACTIVE' } }),
            prisma_js_1.default.patientChallenge.count({ where: { patientId: patient.id, status: 'COMPLETED' } }),
            prisma_js_1.default.patientBadge.count({ where: { patientId: patient.id } }),
            prisma_js_1.default.badge.count()
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
    }
    catch (error) {
        const msg = error?.message ? String(error.message) : String(error);
        const code = error?.code;
        const dbUnavailable = process.env.NODE_ENV === 'production' &&
            (msg.toLowerCase().includes('tenant or user not found') ||
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
router.get('/featured-challenge', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const featuredChallenge = await prisma_js_1.default.challenge.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        if (!featuredChallenge) {
            // Retorna 200 com null em vez de 404 para não crashar o frontend
            return res.json(null);
        }
        res.json(featuredChallenge);
    }
    catch (error) {
        console.error('[gamification] Erro ao buscar desafio em destaque:', error);
        // Retorna 200 com null em vez de 500 para não crashar o Dashboard
        res.json(null);
    }
});
// Endpoint para desafios recomendados
router.get('/recommended-challenges', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const dbPatient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!dbPatient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const patientChallenges = await prisma_js_1.default.patientChallenge.findMany({
            where: {
                patientId: dbPatient.id,
                status: { in: ['ACTIVE', 'COMPLETED'] }
            },
            select: { challengeId: true }
        });
        const excludedIds = patientChallenges.map(c => c.challengeId);
        const available = await prisma_js_1.default.challenge.findMany({
            where: { isActive: true, NOT: { id: { in: excludedIds } } }
        });
        const typeOrder = { SPECIAL: 0, WEEKLY: 1, DAILY: 2, MONTHLY: 3 };
        const recommended = available
            .sort((a, b) => {
            const ta = String(a.type || '').toUpperCase();
            const tb = String(b.type || '').toUpperCase();
            const typeCompare = (typeOrder[ta] ?? 99) - (typeOrder[tb] ?? 99);
            if (typeCompare !== 0)
                return typeCompare;
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
    }
    catch (error) {
        console.error('Erro ao buscar desafios recomendados:', error);
        return res.status(500).json({ error: 'Erro ao buscar desafios recomendados' });
    }
});
// Ranking Global/Social
router.get('/ranking', auth_js_1.authenticate, async (req, res) => {
    try {
        const topPatients = await prisma_js_1.default.patient.findMany({
            take: 10,
            orderBy: { experiencePoints: 'desc' },
            include: { user: { select: { name: true, avatar: true } } }
        });
        const ranking = topPatients.map((p, index) => ({
            id: p.id,
            name: p.user?.name || 'Invisível',
            level: p.level,
            xp: p.experiencePoints,
            position: index + 1,
            avatar: p.user?.avatar || '👤'
        }));
        return res.json(ranking);
    }
    catch (error) {
        console.error('Erro ao carregar ranking:', error);
        return res.status(500).json({ error: 'Erro ao carregar ranking' });
    }
});
// Timeline de Conquistas
router.get('/timeline', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const userId = req.user?.userId;
    try {
        const patient = await ensurePatient(userId);
        const [badges, completedChallenges] = await Promise.all([
            prisma_js_1.default.patientBadge.findMany({
                where: { patientId: patient.id },
                include: { badge: true },
                orderBy: { unlockedAt: 'desc' },
                take: 10
            }),
            prisma_js_1.default.patientChallenge.findMany({
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
                type: b.badge.category, // Usar a categoria real
                title: b.badge.name,
                description: b.badge.description,
                date: b.unlockedAt,
                icon: b.badge.icon,
                color: 'purple'
            })),
            ...completedChallenges.map(c => ({
                id: `challenge-${c.id}`,
                type: 'challenge',
                title: c.challenge.title,
                description: 'Desafio completado!',
                date: c.completedAt,
                icon: c.challenge.icon || '🏆',
                color: 'green'
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return res.json(timeline);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao carregar timeline' });
    }
});
// Histórico de XP para o gráfico de evolução
router.get('/xp-history', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const userId = req.user?.userId;
    try {
        const patient = await ensurePatient(userId);
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        const transactions = await prisma_js_1.default.xPTransaction.findMany({
            where: {
                patientId: patient.id,
                createdAt: { gte: fifteenDaysAgo }
            },
            orderBy: { createdAt: 'asc' }
        });
        // Agrupar por dia
        const historyMap = {};
        // Inicializar os últimos 15 dias com 0
        for (let i = 14; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            historyMap[dateStr] = 0;
        }
        transactions.forEach((t) => {
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
    }
    catch (error) {
        console.error('Erro ao buscar histórico de XP:', error);
        return res.status(500).json({ error: 'Erro ao buscar histórico de XP' });
    }
});
// Metas Pessoais CRUD
router.get('/goals', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const userId = req.user?.userId;
    try {
        const patient = await ensurePatient(userId);
        const goals = await prisma_js_1.default.patientGoal.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(goals);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar metas' });
    }
});
router.post('/goals', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const userId = req.user?.userId;
    const patient = await ensurePatient(userId);
    if (!patient)
        return res.status(404).json({ error: 'Perfil de paciente não encontrado' });
    try {
        const { title, description, target, type, deadline, reward } = req.body;
        const goal = await prisma_js_1.default.patientGoal.create({
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
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao criar meta' });
    }
});
router.patch('/goals/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { current, status } = req.body;
        const goal = await prisma_js_1.default.patientGoal.update({
            where: { id },
            data: {
                current: current !== undefined ? Number(current) : undefined,
                status
            }
        });
        return res.json(goal);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar meta' });
    }
});
router.delete('/goals/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_js_1.default.patientGoal.delete({ where: { id } });
        return res.json({ message: 'Meta removida com sucesso' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao remover meta' });
    }
});
// Achievement Shares CRUD
router.post('/shares', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const { achievementTitle, achievementType, platform, imageUrl } = req.body;
    const userId = req.user?.userId;
    try {
        const dbPatient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!dbPatient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const share = await prisma_js_1.default.achievementShare.create({
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
            await prisma_js_1.default.patient.update({
                where: { id: dbPatient.id },
                data: { experiencePoints: { increment: bonusXP } }
            });
            await prisma_js_1.default.xPTransaction.create({
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
    }
    catch (error) {
        console.error('Erro ao salvar compartilhamento:', error);
        return res.status(500).json({ error: 'Erro ao salvar compartilhamento' });
    }
});
router.get('/shares', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const userId = req.user?.userId;
    try {
        const dbPatient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!dbPatient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const shares = await prisma_js_1.default.achievementShare.findMany({
            where: { patientId: dbPatient.id },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(shares);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar compartilhamentos' });
    }
});
router.delete('/shares/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    try {
        const dbPatient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!dbPatient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        await prisma_js_1.default.achievementShare.delete({
            where: { id, patientId: dbPatient.id }
        });
        return res.json({ message: 'Compartilhamento removido' });
    }
    catch (error) {
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
router.get('/sentinela/correlations', auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const correlations = {
            activityChurn: await gamification_service_js_1.sentinelaService.analyzeActivityChurnCorrelation(),
            hrvWellness: await gamification_service_js_1.sentinelaService.analyzeHRVWellnessCorrelation(),
            consistencySuccess: await gamification_service_js_1.sentinelaService.analyzeConsistencySuccessCorrelation()
        };
        res.json({
            message: 'Análise de correlações concluída',
            timestamp: new Date().toISOString(),
            correlations,
            ethicalNote: 'Todas as análises foram conduzidas em dados agregados e anonimizados'
        });
    }
    catch (error) {
        console.error('Erro ao analisar correlações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
/**
 * GET /api/gamification/sentinela/insights
 * Insights acionáveis baseados nas correlações
 */
router.get('/sentinela/insights', auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const insights = await gamification_service_js_1.sentinelaService.generateWellnessInsights();
        res.json({
            message: 'Insights de bem-estar gerados com sucesso',
            timestamp: new Date().toISOString(),
            insights,
            usage: 'Estes insights são destinados à criação de conteúdo e melhorias de produto'
        });
    }
    catch (error) {
        console.error('Erro ao gerar insights:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
/**
 * GET /api/gamification/sentinela/phase1-report
 * Relatório completo da Fase 1 para o Comitê de Ética
 */
router.get('/sentinela/phase1-report', auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const report = gamification_service_js_1.sentinelaService.generatePhase1Report();
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
    }
    catch (error) {
        console.error('Erro ao gerar relatório Fase 1:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
/**
 * GET /api/gamification/sentinela/content-suggestions
 * Sugestões de conteúdo baseadas nos insights encontrados
 */
router.get('/sentinela/content-suggestions', auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const insights = await gamification_service_js_1.sentinelaService.generateWellnessInsights();
        // Extrair todas as sugestões de conteúdo
        const contentSuggestions = insights.flatMap(insight => insight.contentSuggestions.map(suggestion => ({
            category: insight.id,
            title: insight.title,
            suggestion,
            priority: insight.correlation.significance < 0.05 ? 'high' : 'medium',
            basedOn: insight.correlation.hypothesis
        })));
        // Extrair conselhos acionáveis para produto
        const actionableAdvice = insights.flatMap(insight => insight.actionableAdvice.map(advice => ({
            category: insight.id,
            advice,
            correlation: insight.correlation.correlation,
            significance: insight.correlation.significance
        })));
        res.json({
            message: 'Sugestões de conteúdo baseadas em dados',
            timestamp: new Date().toISOString(),
            contentSuggestions,
            actionableAdvice,
            note: 'Conteúdo derivado de análises éticas e responsáveis'
        });
    }
    catch (error) {
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
        const testDataset = await gamification_service_js_1.sentinelaService.generateAnonymizedDataset();
        const healthStatus = {
            status: 'healthy',
            phase: 'Fase 1 - Análise de Correlações',
            datasetSize: testDataset.length,
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
    }
    catch (error) {
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
router.post('/wearables/connect', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { platform } = req.body;
        // Default to strict 'google_fit' if not recognized, just to be safe, but allow 'apple_health'
        const validPlatform = platform === 'apple_health' ? 'apple_health' : 'google_fit';
        const result = await gamification_service_js_1.wearablesPilotService.connectWearable(userId, validPlatform);
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
        }
        else {
            res.status(400).json({
                error: result.error,
                suggestion: 'Verifique se o aplicativo de saúde está instalado e tente novamente'
            });
        }
    }
    catch (error) {
        console.error('Erro ao conectar wearable:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
/**
 * GET /api/gamification/wearables/status
 * Verificar status da conexão
 */
router.get('/wearables/status', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const connection = await gamification_service_js_1.wearablesPilotService.getConnectionStatus(userId);
        res.json({
            connected: !!connection,
            connection,
            message: connection
                ? `Wearable (${connection.platform}) conectado e sincronizando`
                : 'Nenhum wearable conectado'
        });
    }
    catch (error) {
        console.error('[gamification] Erro ao verificar status do wearable:', error);
        // Retorna 200 com connected=false em vez de 500, evitando crash do Dashboard
        res.json({ connected: false, connection: null, message: 'Status indisponível temporariamente' });
    }
});
/**
 * POST /api/gamification/wearables/sync
 * Sincronizar dados de passos e verificar desafios
 */
router.post('/wearables/sync', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        // Sincronizar dados de passos
        const stepsData = await gamification_service_js_1.wearablesPilotService.syncStepsData(userId);
        const todaySteps = stepsData[stepsData.length - 1]?.steps || 0;
        // Verificar e completar desafios automaticamente
        const challengeResult = await gamification_service_js_1.wearablesPilotService.checkAndCompleteStepChallenges(userId, todaySteps);
        res.json({
            message: 'Sincronização concluída',
            stepsToday: todaySteps,
            stepsHistory: stepsData,
            challengesCompleted: challengeResult.challengesCompleted,
            pointsEarned: challengeResult.pointsEarned,
            notifications: challengeResult.notifications,
            magicMoment: challengeResult.challengesCompleted.length > 0
        });
    }
    catch (error) {
        console.error('Erro na sincronização:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
/**
 * DELETE /api/gamification/wearables/disconnect
 * Desconectar wearable
 */
router.delete('/wearables/disconnect', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { platform } = req.body;
        const success = await gamification_service_js_1.wearablesPilotService.disconnectWearable(userId, platform);
        if (success) {
            res.json({
                message: 'Wearable desconectado com sucesso',
                note: 'Você pode reconectar a qualquer momento'
            });
        }
        else {
            res.status(400).json({ error: 'Falha ao desconectar' });
        }
    }
    catch (error) {
        console.error('Erro ao desconectar:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
/**
 * GET /api/gamification/wearables/pilot-metrics
 * Métricas do piloto (apenas para admins)
 */
router.get('/wearables/pilot-metrics', auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const metrics = await gamification_service_js_1.wearablesPilotService.generatePilotMetrics();
        res.json({
            message: 'Métricas do Piloto - Fase 0',
            timestamp: new Date().toISOString(),
            metrics,
            analysis: {
                connectionSuccess: metrics.connectionRate >= 60 ? 'Excelente' :
                    metrics.connectionRate >= 40 ? 'Bom' : 'Precisa melhorar',
                userSatisfaction: metrics.userSatisfaction >= 8 ? 'Alta' :
                    metrics.userSatisfaction >= 6 ? 'Média' : 'Baixa',
                technicalStability: metrics.technicalIssues <= 2 ? 'Estável' : 'Instável',
                recommendation: metrics.connectionRate >= 60 && metrics.userSatisfaction >= 7
                    ? 'Prosseguir para Fase 1 completa'
                    : 'Ajustar abordagem antes de expandir'
            }
        });
    }
    catch (error) {
        console.error('Erro ao gerar métricas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.default = router;
//# sourceMappingURL=gamification.routes.js.map