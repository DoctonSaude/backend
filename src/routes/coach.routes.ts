import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = Router();

// Helper para garantir que o Patient existe
const ensurePatient = async (userId: string) => {
  let patient = await prisma.patient.findUnique({
    where: { userId },
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        userId,
        archetype: "GENERAL",
        healthPoints: 0,
        experiencePoints: 0,
      },
    });
  }

  return patient;
};

// 1. GET /coach/profile -> buscar perfil do coach
router.get("/profile", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const patient = await ensurePatient(req.user?.userId!);
    let profile = await prisma.coachProfile.findUnique({
      where: { patientId: patient.id },
    });

    // Se não tem perfil, cria um padrão
    if (!profile) {
      profile = await prisma.coachProfile.create({
        data: {
          patientId: patient.id,
          primaryGoal: null,
          routineType: null,
          hasContinuousMedication: false,
        },
      });
    }

    return res.json(profile);
  } catch (error) {
    console.error("[Coach Profile] Erro:", error);
    return res.status(500).json({ error: "Erro ao carregar perfil do Coach" });
  }
});

// 2. POST /coach/checkin -> registrar check-in diário
router.post("/checkin", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const { mood, energyLevel, notes } = req.body;
    const patient = await ensurePatient(req.user?.userId!);

    const checkin = await prisma.coachCheckin.create({
      data: {
        patientId: patient.id,
        mood,
        energyLevel: energyLevel ? parseInt(energyLevel) : null,
        notes: notes || null,
      },
    });

    // Adicionar pontos para o check-in
    await prisma.patient.update({
      where: { id: patient.id },
      data: {
        healthPoints: { increment: 10 },
        experiencePoints: { increment: 10 },
        currentStreak: { increment: 1 },
        lastActiveDate: new Date(),
      },
    });

    await prisma.pointsHistory.create({
      data: {
        patientId: patient.id,
        points: 10,
        action: "coach_checkin",
        description: "Check-in diário do Coach",
      },
    });

    return res.status(201).json(checkin);
  } catch (error) {
    console.error("[Coach Checkin] Erro:", error);
    return res.status(500).json({ error: "Erro ao registrar check-in" });
  }
});

// 3. GET /coach/feed -> buscar feed diário
router.get("/feed", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const patient = await ensurePatient(req.user?.userId!);
    const feed = await prisma.coachFeedItem.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return res.json(feed);
  } catch (error) {
    console.error("[Coach Feed] Erro:", error);
    return res.status(500).json({ error: "Erro ao carregar feed" });
  }
});

// 4. GET /coach/checkins/history -> histórico de check-ins
router.get("/checkins/history", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const patient = await ensurePatient(req.user?.userId!);
    const checkins = await prisma.coachCheckin.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 14,
    });
    return res.json(checkins);
  } catch (error) {
    console.error("[Coach Checkins History] Erro:", error);
    return res.status(500).json({ error: "Erro ao carregar histórico de check-ins" });
  }
});

// 5. GET /coach/recommendations -> recomendações adaptativas (IA básica)
router.get("/recommendations", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const patient = await ensurePatient(req.user?.userId!);
    
    // Pegar último check-in para adaptar recomendações
    const lastCheckin = await prisma.coachCheckin.findFirst({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
    });

    let recommendations: any[] = [];
    
    if (!lastCheckin) {
      recommendations = [
        { id: "1", type: "challenge", title: "Vamos começar com algo simples!", description: "Faça 10 minutos de caminhada hoje.", priority: "high" },
        { id: "2", type: "reminder", title: "Lembre-se de beber água", description: "8 copos de água são importantes para sua saúde.", priority: "medium" }
      ];
    } else if (lastCheckin.mood === "sem_energia") {
      recommendations = [
        { id: "1", type: "challenge", title: "Hoje podemos ir devagar", description: "5 minutos de alongamento são suficientes!", priority: "high" },
        { id: "2", type: "content", title: "Dicas para recuperar energia", description: "Veja nosso artigo sobre sono e alimentação.", priority: "medium" }
      ];
    } else if (lastCheckin.mood === "mais_ou_menos") {
      recommendations = [
        { id: "1", type: "challenge", title: "Vamos manter a consistência", description: "15 minutos de atividade física leve.", priority: "high" },
        { id: "2", type: "reminder", title: "Como está se sentindo?", description: "Lembre-se de fazer seu check-in amanhã!", priority: "medium" }
      ];
    } else {
      recommendations = [
        { id: "1", type: "challenge", title: "Você está indo muito bem!", description: "Que tal aumentar o desafio para 20 minutos de caminhada?", priority: "high" },
        { id: "2", type: "achievement", title: "Próxima conquista", description: "Mais 3 dias e você ganha o selo 'Consistente'!", priority: "medium" }
      ];
    }

    return res.json(recommendations);
  } catch (error) {
    console.error("[Coach Recommendations] Erro:", error);
    return res.status(500).json({ error: "Erro ao carregar recomendações" });
  }
});

// 6. GET /coach/anti-abandonment -> dicas de reengajamento
router.get("/anti-abandonment", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const patient = await ensurePatient(req.user?.userId!);
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Verificar último check-in
    const lastCheckin = await prisma.coachCheckin.findFirst({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
    });

    let antiAbandonment: any = {
      needsReengagement: false,
      message: null
    };

    if (!lastCheckin) {
      antiAbandonment = {
        needsReengagement: true,
        message: "Olá! Vamos começar a cuidar da sua saúde juntos? 😊"
      };
    } else if (lastCheckin.createdAt < yesterday) {
      antiAbandonment = {
        needsReengagement: true,
        message: "Sentimos a sua falta! Vamos fazer um check-in rápido hoje?"
      };
    }

    return res.json(antiAbandonment);
  } catch (error) {
    console.error("[Coach Anti-Abandonment] Erro:", error);
    return res.status(500).json({ error: "Erro ao verificar status" });
  }
});

// 7. GET /coach/sofia-integration -> dicas da Lumma
router.get("/sofia-tips", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const patient = await ensurePatient(req.user?.userId!);
    
    const sofiaTips = [
      { id: "1", title: "Dica rápida para o dia", content: "Lembre-se de respirar fundo 3 vezes se sentir estressado!", type: "tip" },
      { id: "2", title: "Lumma recomenda", content: "Que tal fazer um lanche saudável hoje? Frutas são ótimas opções!", type: "recommendation" }
    ];
    
    return res.json(sofiaTips);
  } catch (error) {
    console.error("[Coach Lumma Tips] Erro:", error);
    return res.status(500).json({ error: "Erro ao carregar dicas da Lumma" });
  }
});

// 8. GET /coach/achievements -> conquistas específicas do Coach
router.get("/achievements", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const patient = await ensurePatient(req.user?.userId!);
    
    // Para MVP, retornamos conquistas mock baseadas em dados existentes
    const checkinsCount = await prisma.coachCheckin.count({
      where: { patientId: patient.id }
    });
    
    const achievements = [
      { id: "1", title: "Primeiro Passo", description: "Fez seu primeiro check-in", unlocked: checkinsCount > 0, icon: "trophy" },
      { id: "2", title: "Consistente", description: "7 dias consecutivos de check-in", unlocked: patient.currentStreak >= 7, icon: "star" },
      { id: "3", title: "Saúde em Dia", description: "20 check-ins", unlocked: checkinsCount >= 20, icon: "heart" }
    ];
    
    return res.json(achievements);
  } catch (error) {
    console.error("[Coach Achievements] Erro:", error);
    return res.status(500).json({ error: "Erro ao carregar conquistas" });
  }
});

// 9. GET /coach/reminders -> lembretes inteligentes
router.get("/reminders", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const patient = await ensurePatient(req.user?.userId!);
    
    const reminders = [
      { id: "1", title: "Check-in diário", time: "09:00", type: "checkin", enabled: true },
      { id: "2", title: "Beber água", time: "10:00, 14:00, 18:00", type: "water", enabled: true },
      { id: "3", title: "Lembrete de medicamento", time: "08:00", type: "medication", enabled: patient.hasContinuousMedication || false }
    ];
    
    return res.json(reminders);
  } catch (error) {
    console.error("[Coach Reminders] Erro:", error);
    return res.status(500).json({ error: "Erro ao carregar lembretes" });
  }
});

// ==============================
// FASE 3 - PREMIUM FEATURES
// ==============================

// 10. Jornadas Específicas
router.get("/journeys", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const patient = await ensurePatient(req.user?.userId!);
    
    // Jornadas padrão disponíveis
    const availableJourneys = [
      { id: "post-consult", name: "Pós-consulta Cardiologista", description: "Acompanhe seu tratamento após consulta com cardiologista", icon: "heart" },
      { id: "diabetes", name: "Diabetes", description: "Gestão diária da diabetes com dicas e lembretes", icon: "droplet" },
      { id: "hypertension", name: "Hipertensão", description: "Controle da pressão arterial e hábitos saudáveis", icon: "activity" }
    ];
    
    // Jornadas do usuário
    const userJourneys = await prisma.coachJourney.findMany({
      where: { patientId: patient.id },
      include: { steps: true },
      orderBy: { createdAt: "desc" }
    });
    
    return res.json({
      available: availableJourneys,
      active: userJourneys
    });
  } catch (error) {
    console.error("[Coach Journeys] Erro:", error);
    return res.status(500).json({ error: "Erro ao carregar jornadas" });
  }
});

router.post("/journeys", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const { name } = req.body;
    const patient = await ensurePatient(req.user?.userId!);
    
    // Criar jornada com passos padrão
    const journey = await prisma.coachJourney.create({
      data: {
        patientId: patient.id,
        name,
        status: "active",
        startDate: new Date(),
        steps: {
          create: [
            { title: "Primeiro passo", description: "Conheça sua jornada", order: 1 },
            { title: "Seguir plano", description: "Siga as recomendações diárias", order: 2 },
            { title: "Completar desafios", description: "Conclua os desafios da semana", order: 3 }
          ]
        }
      },
      include: { steps: true }
    });
    
    return res.status(201).json(journey);
  } catch (error) {
    console.error("[Coach Journeys Create] Erro:", error);
    return res.status(500).json({ error: "Erro ao criar jornada" });
  }
});

router.put("/journeys/:id/step/:stepId", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const { id, stepId } = req.params;
    const { isCompleted } = req.body;
    
    await prisma.coachJourneyStep.update({
      where: { id: stepId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    });
    
    // Recalcular progresso da jornada
    const journey = await prisma.coachJourney.findUnique({
      where: { id },
      include: { steps: true }
    });
    
    if (journey) {
      const totalSteps = journey.steps.length;
      const completedSteps = journey.steps.filter(s => s.isCompleted).length;
      const progress = Math.round((completedSteps / totalSteps) * 100);
      
      await prisma.coachJourney.update({
        where: { id },
        data: { progress }
      });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error("[Coach Journey Step Update] Erro:", error);
    return res.status(500).json({ error: "Erro ao atualizar passo" });
  }
});

// 11. Chat Coach
router.get("/chat", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const patient = await ensurePatient(req.user?.userId!);
    
    const messages = await prisma.coachMessage.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "asc" }
    });
    
    return res.json(messages);
  } catch (error) {
    console.error("[Coach Chat] Erro:", error);
    return res.status(500).json({ error: "Erro ao carregar chat" });
  }
});

router.post("/chat", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const { content } = req.body;
    const patient = await ensurePatient(req.user?.userId!);
    
    // Salvar mensagem do usuário
    const userMessage = await prisma.coachMessage.create({
      data: {
        patientId: patient.id,
        content,
        isFromUser: true
      }
    });
    
    // Simular resposta da IA do Coach
    const aiResponses = [
      "Olá! Vamos continuar nossa jornada de saúde?",
      "Muito bom! Lembre-se de fazer seu check-in hoje.",
      "Não se esqueça de beber água!",
      "Excelente progresso! Continue assim!"
    ];
    
    const aiResponse = await prisma.coachMessage.create({
      data: {
        patientId: patient.id,
        content: aiResponses[Math.floor(Math.random() * aiResponses.length)],
        isFromUser: false
      }
    });
    
    return res.status(201).json([userMessage, aiResponse]);
  } catch (error) {
    console.error("[Coach Chat Send] Erro:", error);
    return res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
});

// 12. Comunidades
router.get("/communities", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const communities = await prisma.coachCommunity.findMany({
      where: { isActive: true },
      include: { _count: { select: { members: true, posts: true } } }
    });
    
    return res.json(communities);
  } catch (error) {
    console.error("[Coach Communities] Erro:", error);
    return res.status(500).json({ error: "Erro ao carregar comunidades" });
  }
});

router.post("/communities/:id/join", authenticate, authorize("PATIENT"), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await ensurePatient(req.user?.userId!);
    
    const membership = await prisma.coachCommunityMember.upsert({
      where: {
        communityId_patientId: { communityId: id, patientId: patient.id }
      },
      create: {
        communityId: id,
        patientId: patient.id,
        role: "member"
      },
      update: {}
    });
    
    return res.status(201).json(membership);
  } catch (error) {
    console.error("[Coach Community Join] Erro:", error);
    return res.status(500).json({ error: "Erro ao entrar na comunidade" });
  }
});

// 13. Admin Analytics
router.get("/admin/analytics", authenticate, authorize(["ADMIN"]), async (req, res) => {
  try {
    const totalPatients = await prisma.patient.count();
    const totalCheckins = await prisma.coachCheckin.count();
    const totalJourneys = await prisma.coachJourney.count();
    const activeJourneys = await prisma.coachJourney.count({ where: { status: "active" } });
    
    const analytics = {
      overview: {
        totalPatients,
        totalCheckins,
        totalJourneys,
        activeJourneys
      },
      moodStats: {
        bem: await prisma.coachCheckin.count({ where: { mood: "bem" } }),
        mais_ou_menos: await prisma.coachCheckin.count({ where: { mood: "mais_ou_menos" } }),
        sem_energia: await prisma.coachCheckin.count({ where: { mood: "sem_energia" } })
      }
    };
    
    return res.json(analytics);
  } catch (error) {
    console.error("[Coach Admin Analytics] Erro:", error);
    return res.status(500).json({ error: "Erro ao carregar analytics" });
  }
});

export default router;
