// @ts-nocheck
// @ts-nocheck
// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { format as dateFnsFormat } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { ChatbotService } from '../services/chatbot.service.js';
import inAppNotificationService from '../services/inAppNotification.service.js';
import { wearablesPilotService, addPoints, updateStreak } from '../services/gamification.service.js';
import { storageService } from '../services/storage.service.js';
import { SocketService } from '../lib/socket.js';
import { supabase } from '../lib/supabase.js';
import { validationCodeService } from '../services/validationCode.service.js';
import { financeService } from '../services/finance.service.js';
import { reputationService } from '../services/reputation.service.js';
import { RevenueService } from '../services/revenue.service.js';
import { prescriptionService } from '../services/prescription.service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Helper para mapear dados do parceiro para o frontend
const mapPartnerData = (p: any) => {
  // Inicialmente tenta pegar o preço direto do parceiro (fallback legado)
  let finalPrice = p.consultationPrice || 0;

  // Tenta encontrar o preço nas especialidades/serviços vinculados via Busca Inteligente
  // Prioridade: Serviço ativo que contenha 'consulta' no nome ou categoria
  const activeServices = p.services?.filter((s: any) => s.isActive) || [];

  const consulService = activeServices.find((s: any) =>
    (s.category && s.category.toLowerCase().includes('consulta')) ||
    (s.name && s.name.toLowerCase().includes('consulta'))
  ) || activeServices[0]; // Fallback para o primeiro serviço ativo qualquer

  if (consulService) {
    if (typeof consulService.partnerPayout === 'number' && typeof consulService.doctonFeePercent === 'number') {
      finalPrice = consulService.partnerPayout * (1 + (consulService.doctonFeePercent / 100));
    } else if (typeof consulService.basePrice === 'number') {
      finalPrice = consulService.basePrice;
    } else if (typeof consulService.price === 'number') {
      finalPrice = consulService.price;
    }
  }

  // Preço padrão de segurança se tudo falhar ou for zero
  if (!finalPrice || finalPrice === 0) {
    finalPrice = 150.00;
  }

  // Fallback de especialidade
  const specialty = p.specialty || (p.specialties && p.specialties.length > 0 ? p.specialties.join(', ') : 'Clínica Geral');

  return {
    id: p.id,
    user: {
      name: p.user?.name || p.name || 'Profissional',
      email: p.user?.email || '',
      avatar: p.user?.avatar || undefined
    },
    type: p.type || 'CLINIC',
    specialty,
    crm: p.crm || undefined,
    description: p.description || '',
    address: p.address || '',
    city: p.city || '',
    state: p.state || '',
    zipCode: p.zipCode || '',
    consultationPrice: finalPrice,
    acceptsOnline: p.acceptsOnline,
    hasOnlineScheduling: p.acceptsOnline,
    isApproved: p.isApproved,
    rating: p.rating || 0,
    totalReviews: p.totalReviews || 0,
    planTier: p.planTier || 'FREE',
    planStatus: p.planStatus || 'ACTIVE',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
};

// Lista todos os parceiros (para pacientes buscarem serviços) - ROTA PÚBLICA
router.get('/', async (req, res, next) => {
  try {
    let partners: any[];
    try {
      partners = await prisma.partner.findMany({
        where: { isApproved: true },
        include: {
          user: { select: { name: true, email: true, avatar: true } },
          services: { where: { isActive: true } }
        },
        orderBy: [
          { rankingScore: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    } catch (innerErr: any) {
      console.error('[Partners GET /] Fallback sem services:', innerErr?.message);
      partners = await prisma.partner.findMany({
        where: { isApproved: true },
        include: { user: { select: { name: true, email: true, avatar: true } } },
        orderBy: [
          { rankingScore: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    }
    return res.json(partners.map(mapPartnerData));
  } catch (error: any) {
    console.error('[Partners GET /] Erro fatal:', error?.message);
    next(error);
  }
});

/**
 * @route GET /api/partners/dashboard
 * @desc Métricas unificadas e otimizadas (Fase 6)
 */
router.get('/dashboard', authenticate, authorize('PARTNER'), async (req, res) => {
  res.setHeader('X-Backend-Version', '2026.04.09.v6-opt');
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findFirst({
      where: { userId },
      select: { id: true, rating: true, totalReviews: true, planTier: true, planStatus: true, createdAt: true }
    });

    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalAppointments,
      completedAppointments,
      upcomingAppointments,
      thisMonthAppts,
      lastMonthAppts,
      monthlyRevenueData,
      lastMonthRevenueData,
      recentAppointments,
      validatedCodes
    ] = await Promise.all([
      prisma.appointment.count({ where: { partnerId: partner.id } }),
      prisma.appointment.count({ where: { partnerId: partner.id, status: 'COMPLETED' } }),
      prisma.appointment.count({ where: { partnerId: partner.id, status: { in: ['SCHEDULED', 'CONFIRMED'] } } }),
      prisma.appointment.count({ where: { partnerId: partner.id, createdAt: { gte: startOfMonth } } }),
      prisma.appointment.count({ where: { partnerId: partner.id, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      prisma.partnerTransaction.aggregate({
        where: { partnerId: partner.id, type: 'CREDIT', status: 'COMPLETED', createdAt: { gte: startOfMonth } },
        _sum: { amount: true }
      }),
      prisma.partnerTransaction.aggregate({
        where: { partnerId: partner.id, type: 'CREDIT', status: 'COMPLETED', createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { amount: true }
      }),
      prisma.appointment.findMany({
        where: { partnerId: partner.id },
        orderBy: { dateTime: 'desc' },
        take: 5,
        include: { patient: { include: { user: { select: { name: true, avatar: true } } } } }
      }),
      prisma.validationCodeLog.findMany({
        where: { partnerId: partner.id },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: { patient: { select: { user: { select: { name: true, avatar: true } } } } }
      })
    ]);

    const rev = monthlyRevenueData._sum.amount || 0;
    const lastRev = lastMonthRevenueData._sum.amount || 0;
    const revGrowth = lastRev > 0 ? ((rev - lastRev) / lastRev) * 100 : 0;
    const apptsGrowth = lastMonthAppts > 0 ? ((thisMonthAppts - lastMonthAppts) / lastMonthAppts) * 100 : 0;

    const period = (req.query.period as string) || 'week';
    const chartStartDate = new Date();
    if (period === 'week') chartStartDate.setDate(chartStartDate.getDate() - 6);
    else chartStartDate.setDate(chartStartDate.getDate() - 29);
    chartStartDate.setHours(0, 0, 0, 0);

    const [dailyRevenue, dailyAppts] = await Promise.all([
      prisma.partnerTransaction.findMany({
        where: { partnerId: partner.id, status: 'COMPLETED', type: 'CREDIT', createdAt: { gte: chartStartDate } },
        select: { amount: true, createdAt: true }
      }),
      prisma.appointment.findMany({
        where: { partnerId: partner.id, dateTime: { gte: chartStartDate } },
        select: { dateTime: true }
      })
    ]);

    const daysToGenerate = period === 'week' ? 7 : 30;
    const chartData = Array.from({ length: daysToGenerate }, (_, i) => {
      const d = new Date(chartStartDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayRev = dailyRevenue.filter(r => r.createdAt.toISOString().split('T')[0] === dateStr).reduce((sum, r) => sum + r.amount, 0);
      const dayAppts = dailyAppts.filter(a => a.dateTime.toISOString().split('T')[0] === dateStr).length;
      return {
        name: period === 'week' ? dateFnsFormat(d, 'EEE', { locale: ptBR }) : dateFnsFormat(d, 'dd/MM'),
        value: dayRev,
        appts: dayAppts
      };
    });

    return res.json({
      metrics: {
        newAppointments: thisMonthAppts,
        monthlyRevenue: rev,
        revenueGrowth: Math.round(revGrowth),
        completedAppointments,
        apptsGrowth: Math.round(apptsGrowth),
        upcomingAppointments,
        rating: partner.rating || 0,
        totalReviews: partner.totalReviews || 0,
        planTier: partner.planTier,
        planStatus: partner.planStatus
      },
      recentAppointments: recentAppointments.map(appt => ({
        id: appt.id,
        patientName: appt.patient?.user?.name || 'Paciente',
        patientAvatar: appt.patient?.user?.avatar,
        dateTime: appt.dateTime,
        status: appt.status,
        isOnline: (appt as any).isOnline
      })),
      validatedCodes: validatedCodes.map(log => ({
        id: log.id,
        code: log.code,
        patientName: log.patient?.user?.name || 'Paciente',
        patientAvatar: log.patient?.user?.avatar,
        timestamp: log.timestamp,
        status: log.status
      })),
      chartData: chartData
    });
  } catch (error) {
    console.error('Erro ao obter dashboard do parceiro:', error);
    return res.status(500).json({ error: 'Erro ao obter dashboard do parceiro' });
  }
});

/**
 * @route GET /api/partners/revenue/insights
 */
router.get('/revenue/insights', authenticate, authorize('PARTNER', 'PHARMACY'), async (req, res) => {
  res.setHeader('X-Backend-Version', '2026.04.09.v6-opt');
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });
    const insights = await RevenueService.getInsights(partner.id);
    return res.json(insights);
  } catch (error: any) {
    console.error(`[Partners/Insights] Erro:`, error?.message);
    return res.status(500).json({ error: 'Erro interno ao gerar insights' });
  }
});

// Busca parceiros com filtro por termo - ROTA PÚBLICA
router.get('/search', async (req, res, next) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) return res.json([]);

  try {
    let partners: any[];
    const whereClause = {
      OR: [
        { specialty: { contains: q, mode: 'insensitive' as const } },
        { city: { contains: q, mode: 'insensitive' as const } },
        { state: { contains: q, mode: 'insensitive' as const } },
        { name: { contains: q, mode: 'insensitive' as const } },
        { user: { name: { contains: q, mode: 'insensitive' as const } } }
      ]
    };
    try {
      partners = await prisma.partner.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true, email: true, avatar: true } },
          services: { where: { isActive: true } }
        },
        orderBy: [
          { rankingScore: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    } catch (innerErr: any) {
      console.error(`[Partners /search] Fallback sem services para "${q}":`, innerErr?.message);
      partners = await prisma.partner.findMany({
        where: whereClause,
        include: { user: { select: { name: true, email: true, avatar: true } } },
        orderBy: [
          { rankingScore: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    }
    console.log(`[Search] Query: "${q}", Total: ${partners.length}`);
    return res.json(partners.map(mapPartnerData));
  } catch (err: any) {
    console.error(`[Partners /search] Erro fatal para "${q}":`, err?.message);
    next(err);
  }
});



// Perfil público do parceiro (sem autenticação) - para visualização pública
// Perfil público do parceiro
router.get('/public-profile', async (req, res) => {
  try {
    const { partnerId } = req.query as any;
    const userId = (req as any).user?.userId; // Opcional, via authenticate if added

    // Se for um ID específico (visualização de paciente)
    if (partnerId) {
      const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
        include: {
          user: { select: { name: true, avatar: true, email: true } },
          team: true,
          services: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

      // Usar a lógica unificada de mapeamento
      const mappedPartner = mapPartnerData(partner);

      return res.json({
        ...mappedPartner,
        photo: partner.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.id}`,
        email: partner.user?.email,
        professionals: partner.team,
        totalPatients: await prisma.appointment.count({ where: { partnerId: partner.id } })
      });
    }

    // Se não houver partnerId, e estiver no contexto de parceiro autenticado, retorna o próprio perfil
    // Para isso precisaremos de um middleware que não bloqueie se não houver token mas popule req.user se houver
    // Mas por simplicidade, o frontend chama sem ID quando quer o próprio.
    // Vamos usar o authenticate aqui se quisermos que o parceiro edite seu próprio pelo mesmo endpoint
    // Ou criar um endpoint separado. O frontend usa /partners/public-profile sem ID.

    return res.status(400).json({ error: 'ID do parceiro não fornecido' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao buscar perfil público' });
  }
});

// Endpoint para o próprio parceiro buscar seu perfil público para edição
router.get('/my-public-profile', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({
      where: { userId },
      include: {
        user: { select: { name: true, email: true, avatar: true } },
        team: true,
        services: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!partner) {
      if (req.user?.role === 'ADMIN') {
        const user = await prisma.user.findFirst({ where: { id: userId } });
        return res.json({
          id: 'admin-virtual',
          userId: userId,
          name: user?.name,
          email: user?.email,
          photo: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          specialty: 'Administrador do Sistema',
          description: 'Perfil de administrador para gerenciamento e testes.',
          specialties: [],
          languages: ['Português'],
          facilities: [],
          workingHours: [],
          education: [],
          insurances: [],
          isApproved: true,
          rating: 5.0,
          totalReviews: 0,
          totalPatients: 0
        });
      }
      console.warn(`[PublicProfile] Parceiro não encontrado para o userId: ${userId}. Role: ${req.user?.role}`);
      return res.status(404).json({ error: 'Parceiro não encontrado' });
    }

    // Mapeamento para o formato esperado pelo frontend PerfilPublico.tsx usando a lógica unificada
    const mappedPartner = mapPartnerData(partner);

    const profile = {
      ...mappedPartner,
      photo: partner.user?.avatar || null,
      professionals: partner.team,
      totalPatients: await prisma.appointment.count({ where: { partnerId: partner.id } }),
      // Garantir que campos de array não sejam nulos
      specialties: (partner as any).specialties || [],
      languages: (partner as any).languages || [],
      facilities: (partner as any).facilities || [],
      workingHours: (partner as any).workingHours || [],
      education: (partner as any).education || [],
      insurances: (partner as any).insurances || []
    };

    return res.json(profile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar seu perfil' });
  }
});

router.put('/public-profile', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    // Campos permitidos para atualização
    const {
      name, specialty, specialties, crm, cnpj, description, address, city, state, zipCode, phone,
      consultationPrice, acceptsTelemedicine, acceptsEmergency, acceptsInsurance,
      experienceYears, foundationYear, education, workingHours, languages, facilities, insurances
    } = req.body;

    const updated = await prisma.partner.update({
      where: { id: partner.id },
      data: {
        name, specialty, specialties, crm, cnpj, phone,
        description: description || req.body.about,
        address, city, state, zipCode, consultationPrice,
        acceptsTelemedicine,
        acceptsEmergency,
        acceptsInsurance,
        experienceYears: experienceYears ? parseInt(experienceYears as any) : undefined,
        foundationYear: foundationYear ? parseInt(foundationYear as any) : undefined,
        education, workingHours, languages, facilities, insurances
      } as any
    });

    // Se o nome mudar, atualiza no modelo User também
    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name }
      });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar perfil público:', error);
    return res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

router.post('/public-profile/photo', authenticate, authorize('PARTNER'), (req, res, next) => {
  upload.single('photo')(req, res, (err: any) => {
    if (err) {
      console.error('[PhotoUpload] Erro Multer:', err);
      return res.status(400).json({ error: 'Erro no upload do arquivo', details: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    res.setHeader('X-Backend-Version', '2026.04.09.v5-final');
    const userId = req.user?.userId;
    console.log(`[PhotoUpload] Iniciando Fase 5 para usuário: ${userId}`);

    // Fallback: Se não houver req.file, verifica se enviaram via Body (Base64)
    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;

    if (req.file) {
      fileBuffer = req.file.buffer;
      fileName = req.file.originalname;
      mimeType = req.file.mimetype;
    } else if (req.body.photo && typeof req.body.photo === 'string' && req.body.photo.includes('base64')) {
      const base64Data = req.body.photo.split(';base64,').pop()!;
      fileBuffer = Buffer.from(base64Data, 'base64');
      fileName = `profile_${userId}_${Date.now()}.png`;
      mimeType = 'image/png';
    } else {
      console.warn('[PhotoUpload] Erro: Nenhum arquivo detectado');
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const publicUrl = await storageService.uploadAvatar(
      fileBuffer,
      fileName,
      mimeType
    );

    // Atualizar User (avatar) e Partner (photo) usando upsert para garantir sucesso
    const results = await Promise.allSettled([
      prisma.user.update({
        where: { id: userId },
        data: { avatar: publicUrl }
      }),
      prisma.partner.upsert({
        where: { userId: userId! },
        update: { photo: publicUrl },
        create: { 
          userId: userId!,
          photo: publicUrl,
          tenantId: req.user?.tenantId || null
        }
      })
    ]);

    const errors = results.filter(r => r.status === 'rejected');
    if (errors.length > 0) {
      console.error('[PhotoUpload] Erro parcial na atualização do banco:', errors);
    }

    return res.json({ 
      photo: publicUrl,
      success: true
    });
  } catch (error: any) {
    console.error('[PhotoUpload] CRITICAL ERROR (Phase 5):', error);
    return res.status(500).json({ 
      error: 'Erro interno no upload (Fase 5)', 
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      hint: 'Verifique se o bucket "avatars" existe no seu projeto Supabase.'
    });
  }
});

router.get('/profile', authenticate, authorize('PARTNER'), (req, res) => {
  (async () => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const partner = await prisma.partner.findFirst({
        where: { userId },
        include: { user: true }
      });

      if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

      return res.json({
        id: partner.id,
        user: {
          name: partner.user?.name || '',
          email: partner.user?.email || '',
          avatar: partner.user?.avatar || undefined
        },
        type: 'CLINIC',
        specialty: partner.specialty || '',
        specialties: partner.specialties || [],
        crm: partner.crm || undefined,
        description: partner.description || '',
        address: partner.address || '',
        city: partner.city || '',
        state: partner.state || '',
        zipCode: partner.zipCode || '',
        consultationPrice: partner.consultationPrice || 0,
        acceptsOnline: partner.acceptsOnline,
        hasOnlineScheduling: partner.acceptsOnline,
        isApproved: partner.isApproved,
        rating: partner.rating || 0,
        totalReviews: partner.totalReviews || 0,
        planTier: partner.planTier || 'FREE',
        planStatus: partner.planStatus || 'ACTIVE',
        createdAt: partner.createdAt,
        updatedAt: partner.updatedAt,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar perfil do parceiro' });
    }
  })();
});

router.put('/profile', authenticate, authorize('PARTNER'), (req, res) => {
  (async () => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const partner = await prisma.partner.findFirst({
        where: { userId }
      });

      if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

      const {
        specialty,
        specialties,
        description,
        address,
        city,
        state,
        zipCode,
        consultationPrice,
        acceptsOnline
      } = req.body;

      const updated = await prisma.partner.update({
        where: { id: partner.id },
        data: {
          specialty,
          specialties,
          description,
          address,
          city,
          state,
          zipCode,
          consultationPrice,
          acceptsOnline
        }
      });

      return res.json(updated);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  })();
});


router.get('/settings', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findUnique({
      where: { userId },
      select: { settings: true }
    });

    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    res.json(partner.settings || {});
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

router.put('/settings', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const settings = req.body;
    const userId = req.user?.userId;
    const partner = await prisma.partner.findUnique({ where: { userId } });

    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    // Validate if settings is an object
    if (typeof settings !== 'object' || settings === null) {
      return res.status(400).json({ error: 'Formato de configurações inválido' });
    }

    const updatedPartner = await prisma.partner.update({
      where: { id: partner.id },
      data: { settings },
      select: { settings: true }
    });

    res.json(updatedPartner.settings);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// Update Partner Plan
router.put('/plan', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { planTier } = req.body;
    const userId = req.user?.userId;

    if (!['FREE', 'PRO', 'PREMIUM'].includes(planTier)) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const updated = await prisma.partner.update({
      where: { id: partner.id },
      data: { 
        planTier,
        planStatus: 'ACTIVE' // Simplified for now
      }
    });

    res.json({
      success: true,
      planTier: updated.planTier,
      planStatus: updated.planStatus
    });
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
});

router.get('/patients/search', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const q = (req.query.q as string || '').toLowerCase();
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { user: { name: { contains: q, mode: 'insensitive' } } },
          { cpf: { contains: q } }
        ]
      },
      include: {
        user: { select: { name: true, email: true, avatar: true } }
      },
      take: 10
    });

    return res.json(patients.map(p => ({
      id: p.id,
      name: p.user.name,
      cpf: p.cpf,
      avatar: p.user.avatar
    })));
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
    return res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

// ==================== AGENDAMENTOS E DASHBOARD ====================

router.get('/appointments', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const { q, status, type, startDate, endDate } = req.query;

    const partner = await prisma.partner.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const where: any = {
      partnerId: partner.id,
    };

    // Filtro por termo de busca (nome do paciente ou CPF)
    if (q) {
      const term = String(q).toLowerCase();
      where.patient = {
        user: {
          name: { contains: term, mode: 'insensitive' }
        }
      };
    }

    // Filtro por status
    if (status && status !== 'all') {
      where.status = String(status);
    }

    // Filtro por tipo (online/presencial)
    if (type && type !== 'all') {
      where.isOnline = type === 'online';
    }

    // Filtro por data
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.dateTime.lte = end;
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          include: { user: { select: { name: true, email: true, avatar: true } } }
        },
        professional: true
      },
      orderBy: { dateTime: 'desc' }
    });

    return res.json(appointments);
  } catch (error) {
    console.error('Erro ao listar consultas com filtros:', error);
    return res.status(500).json({ error: 'Erro ao listar consultas' });
  }
});

// Buscar um agendamento específico
router.get('/appointments/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId || (req as any).user.id;

    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        partnerId: partner.id
      },
      include: {
        patient: {
          include: { user: { select: { name: true, email: true, avatar: true } } }
        }
      }
    });

    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    return res.json(appointment);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    return res.status(500).json({ error: 'Erro ao buscar agendamento' });
  }
});

router.post('/appointments', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const { patientName, patientId, dateTime, duration, isOnline, notes, professionalId, serviceId } = req.body;

    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    let finalPatientId = patientId;

    // Se não tiver patientId, tenta encontrar pelo nome ou cria um placeholder
    if (!finalPatientId && patientName) {
      const existingUser = await prisma.user.findFirst({
        where: { name: { contains: patientName, mode: 'insensitive' }, role: 'PATIENT' },
        include: { patient: true }
      });

      if (existingUser?.patient) {
        finalPatientId = existingUser.patient.id;
      } else {
        // Criar um usuário/paciente "placeholder" para agendamentos manuais
        // Isso é uma simplificação para o CRUD funcionar sem exigir cadastro completo
        const newUserId = uuidv4();
        const newUser = await prisma.user.create({
          data: {
            id: newUserId,
            name: patientName,
            email: `temp_${newUserId}@docton.com`,
            password: uuidv4(), // Senha aleatória
            role: 'PATIENT'
          }
        });

        const newPatient = await prisma.patient.create({
          data: {
            userId: newUser.id,
            cpf: `000.${Math.floor(Math.random() * 999)}.${Math.floor(Math.random() * 999)}-${Math.floor(Math.random() * 99)}`, // CPF temporário
            birthDate: new Date('2000-01-01')
          }
        });
        finalPatientId = newPatient.id;
      }
    }

    if (!finalPatientId) {
      return res.status(400).json({ error: 'Paciente ou nome do paciente é obrigatório' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        partnerId: partner.id,
        patientId: finalPatientId,
        dateTime: new Date(dateTime),
        duration: duration || 30,
        isOnline: !!isOnline,
        notes: notes || '',
        status: 'SCHEDULED',
        professionalId: professionalId || null,
        serviceId: serviceId || null
      },
      include: {
        patient: {
          include: { user: { select: { name: true, email: true, avatar: true } } }
        },
        professional: true
      }
    });

    return res.status(201).json(appointment);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

router.put('/appointments/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId || (req as any).user.id;
    const { dateTime, duration, isOnline, notes, status, professionalId, serviceId } = req.body;

    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const appointment = await prisma.appointment.update({
      where: { id, partnerId: partner.id },
      data: {
        dateTime: dateTime ? new Date(dateTime) : undefined,
        duration: duration ? Number(duration) : undefined,
        isOnline: isOnline !== undefined ? !!isOnline : undefined,
        notes: notes !== undefined ? notes : undefined,
        status: status || undefined,
        professionalId: professionalId !== undefined ? (professionalId || null) : undefined,
        serviceId: serviceId !== undefined ? (serviceId || null) : undefined
      },
      include: {
        patient: {
          include: { user: { select: { name: true, email: true, avatar: true } } }
        },
        professional: true
      }
    });

    // Logistics Integration: Se estiver mudando para COMPLETED, incrementar uso de equipamento
    if (status === 'COMPLETED' && appointment.equipmentId) {
      try {
        await (prisma as any).equipment.update({
          where: { id: appointment.equipmentId },
          data: { useCount: { increment: 1 } }
        });
        console.log(`[Logistics] Uso incrementado para equipamento: ${appointment.equipmentId}`);
      } catch (logisticsErr) {
        console.error('Erro ao processar logística (uso equipamento):', logisticsErr);
      }
    }

    if (status === 'COMPLETED' && appointment.status === 'COMPLETED') { // Só chamar se a mudança for confirmada no BD
      try {
        await financeService.processAppointmentCompletion(appointment.id);
        console.log(`[Finance] Repasse processado para consulta (via PUT): ${appointment.id}`);
      } catch (finErr) {
        console.error('Erro ao processar financeiro na conclusão (PUT):', finErr);
      }
    }

    SocketService.sendToUser(appointment.patientId, 'timelineUpdate', { type: 'appointment', id: appointment.id, status: appointment.status });

    return res.json(appointment);
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    return res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

// ==================== PRONTUÁRIOS (MEDICAL RECORDS) ====================

// Buscar prontuário de um agendamento
router.get('/medical-records/:appointmentId', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const record = await prisma.medicalRecord.findUnique({
      where: { appointmentId },
      include: {
        patient: { include: { user: { select: { name: true, avatar: true } } } },
        appointment: true
      }
    });

    if (!record) return res.status(404).json({ error: 'Prontuário não encontrado' });
    if (record.partnerId !== partner.id) return res.status(403).json({ error: 'Acesso negado' });

    return res.json(record);
  } catch (error) {
    console.error('Erro ao buscar prontuário:', error);
    return res.status(500).json({ error: 'Erro ao buscar prontuário' });
  }
});

// Atualizar prontuário
router.put('/medical-records/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, symptoms, treatment, observations, attachments } = req.body;
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const record = await prisma.medicalRecord.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: 'Prontuário não encontrado' });
    if (record.partnerId !== partner.id) return res.status(403).json({ error: 'Acesso negado' });

    const updated = await prisma.medicalRecord.update({
      where: { id },
      data: {
        diagnosis,
        symptoms,
        treatment,
        observations,
        attachments
      }
    });

    SocketService.sendToUser(record.patientId, 'medicalHistoryUpdate', updated);
    SocketService.sendToUser(record.patientId, 'timelineUpdate', { type: 'medicalRecord', id: updated.id });

    return res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar prontuário:', error);
    return res.status(500).json({ error: 'Erro ao atualizar prontuário' });
  }
});

// Upload de anexos para o prontuário
router.post('/medical-records/:id/attachments', authenticate, authorize('PARTNER'), upload.array('files', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const record = await prisma.medicalRecord.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: 'Prontuário não encontrado' });
    if (record.partnerId !== partner.id) return res.status(403).json({ error: 'Acesso negado' });

    const uploadPromises = files.map(file =>
      storageService.uploadFile(file.buffer, `medical-records/${id}/${file.originalname}`, file.mimetype)
    );

    const urls = await Promise.all(uploadPromises);

    const existingAttachments = (() => {
      try {
        const raw = (record as any).attachments
        if (!raw) return []
        return Array.isArray(raw) ? raw : JSON.parse(raw)
      } catch {
        return []
      }
    })()

    const updated = await prisma.medicalRecord.update({
      where: { id },
      data: {
        attachments: JSON.stringify([...(existingAttachments as any[]), ...urls])
      } as any
    });

    SocketService.sendToUser(record.patientId, 'medicalHistoryUpdate', updated);
    SocketService.sendToUser(record.patientId, 'timelineUpdate', { type: 'attachment', id: updated.id });

    return res.json(updated);
  } catch (error) {
    console.error('Erro ao fazer upload de anexos:', error);
    return res.status(500).json({ error: 'Erro ao fazer upload de anexos' });
  }
});

router.delete('/appointments/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId || (req as any).user.id;

    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    await prisma.appointment.delete({
      where: { id, partnerId: partner.id }
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    return res.status(500).json({ error: 'Erro ao excluir agendamento' });
  }
});

// Validar código de atendimento
router.post('/appointments/validate-code', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { code, appointmentId } = req.body;
    const userId = (req as any).user.userId || (req as any).user.id;

    if (!code) return res.status(400).json({ error: 'Código é obrigatório' });

    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    // Busca agendamento por ID exato ou sufixo
    const where: any = {
      partnerId: partner.id,
      status: { in: ['SCHEDULED', 'CONFIRMED'] }
    };

    const searchCode = code.trim().toLowerCase();

    console.log(`[Validation] Iniciando para Parceiro ${partner.id} (User: ${userId}). Código: ${searchCode}, ID sugerido: ${appointmentId || 'nenhum'}`);

    let appointment = null;

    // 1. Tentar encontrar pelo ID exato se fornecido
    if (appointmentId) {
      appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, partnerId: partner.id },
        include: {
          patient: {
            include: { user: { select: { name: true } } }
          }
        }
      });

      if (appointment) {
        console.log(`[Validation] Agendamento encontrado pelo ID: ${appointment.id}. Status atual: ${appointment.status}`);

        // Verificar se já foi concluído
        if (appointment.status === 'COMPLETED') {
          return res.json({ valid: false, message: 'Este atendimento já foi validado anteriormente.' });
        }

        // Verificar o código (sufixo)
        const idLower = appointment.id.toLowerCase();
        const codeMatches = idLower.endsWith(searchCode) || idLower === searchCode;

        if (!codeMatches) {
          console.warn(`[Validation] Código ${searchCode} não confere com o ID ${appointment.id}`);
          // Não retornamos aqui ainda, vamos tentar o fallback abaixo caso o ID fornecido pelo front esteja errado
          appointment = null;
        }
      }
    }

    // 2. Fallback: Se não forneceu ID ou o código não bateu com o ID sugerido, 
    // tenta buscar qualquer agendamento ATIVO do parceiro que TERMINE com o código
    if (!appointment) {
      console.log(`[Validation] Tentando busca geral por sufixo: ${searchCode}`);
      appointment = await prisma.appointment.findFirst({
        where: {
          partnerId: partner.id,
          status: { in: ['SCHEDULED', 'CONFIRMED', 'active'] },
          id: {
            endsWith: searchCode,
            mode: 'insensitive'
          }
        },
        include: {
          patient: {
            include: { user: { select: { name: true } } }
          }
        }
      });

      if (appointment) {
        console.log(`[Validation] Agendamento encontrado por fallback de sufixo: ${appointment.id}`);
      }
    }

    if (appointment) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'COMPLETED' }
      });

      // Logistics Integration: Incrementar uso de equipamento
      if (appointment.equipmentId) {
        try {
          await (prisma as any).equipment.update({
            where: { id: appointment.equipmentId },
            data: { useCount: { increment: 1 } }
          });
          console.log(`[Logistics] Uso incrementado via Validação para equipamento: ${appointment.equipmentId}`);
        } catch (logisticsErr) {
          console.error('Erro ao processar logística via Validação:', logisticsErr);
        }
      }

      // Finance Integration (Phase 4): Processar repasse e alimentar carteira do parceiro
      try {
        await financeService.processAppointmentCompletion(appointment.id);
        console.log(`[Finance] Repasse automático processado para consulta (via Validação): ${appointment.id}`);
      } catch (finErr) {
        console.error('Erro ao processar financeiro na conclusão via token:', finErr);
      }
 
      // Notificar o paciente (Real-time update)
      SocketService.sendToUser(appointment.patient.userId, 'timelineUpdate', { type: 'appointment', id: appointment.id, status: 'COMPLETED' });
      SocketService.sendToUser(appointment.patient.userId, 'healthLogsUpdate', { type: 'appointment_completed' });

      // Notificar o paciente
      try {
        await inAppNotificationService.createNotification({
          userId: appointment.patient.userId,
          type: 'SYSTEM',
          title: 'Consulta Concluída',
          message: `Sua consulta com ${partner.name || 'o profissional'} foi concluída com sucesso. Não esqueça de deixar sua avaliação!`,
          priority: 'medium',
          link: '/patient/agendamentos'
        });
      } catch (notifyErr) {
        console.error('Erro ao notificar paciente sobre conclusão de consulta:', notifyErr);
      }

      // Registro de Validação (Real-time tracking for Admin)
      try {
        await prisma.validationCodeLog.create({
          data: {
            code,
            status: 'valid',
            partnerId: partner.id,
            patientId: appointment.patientId,
            appointmentId: appointment.id,
            partnerName: partner.name,
            patientName: appointment.patient.user.name,
          }
        });
      } catch (logErr) {
        console.error('Erro ao criar log de validação (sucesso):', logErr);
      }

      // Gamificação e Fidelidade
      try {
        // Atribuir pontos por comparecimento (HP/XP)
        await addPoints(appointment.patient.id, 100, 'ATTENDANCE_COMPLETED', `Pontos por atendimento com ${partner.name}`);

        // Atualizar sequência (streak) do paciente
        await updateStreak(appointment.patient.id);

        // GATILHO DE DESAFIO (Conectividade Gamification)
        await wearablesPilotService.triggerChallengeAction(appointment.patient.userId, 'appointment_done');
      } catch (gamifyErr) {
        console.error('Erro ao processar gamificação no checkout:', gamifyErr);
      }

      // Inicializar Prontuário (MedicalRecord Skeleton)
      try {
        const existingRecord = await prisma.medicalRecord.findUnique({
          where: { appointmentId: appointment.id }
        });

        if (!existingRecord) {
          await prisma.medicalRecord.create({
            data: {
              appointmentId: appointment.id,
              patientId: appointment.patient.id,
              partnerId: partner.id,
              diagnosis: 'Aguardando preenchimento...',
              symptoms: JSON.stringify([]),
            }
          });
        }
      } catch (recordErr) {
        console.error('Erro ao inicializar prontuário:', recordErr);
      }

      // Log de auditoria
      try {
        await prisma.auditLog.create({
          data: {
            userId: userId!,
            userName: appointment.patient?.user?.name || 'Sistema',
            userRole: 'PARTNER',
            action: 'VALIDATE_CODE',
            resource: 'Appointment',
            resourceId: appointment.id,
            ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1',
            severity: 'low',
            category: 'system',
            status: 'success',
            details: { code, appointmentId: appointment.id }
          }
        });
      } catch (logErr) {
        console.error('Erro ao criar log de auditoria:', logErr);
      }

      return res.json({
        valid: true,
        patientName: appointment.patient?.user?.name || 'Paciente',
        appointmentId: appointment.id
      });
    }

    // Registro de Validação Inválida
    try {
      await prisma.validationCodeLog.create({
        data: {
          code,
          status: 'invalid',
          partnerId: partner.id,
          partnerName: partner.name,
        }
      });
    } catch (logErr) {
      console.error('Erro ao criar log de validação (inválido):', logErr);
    }

    return res.json({ valid: false, message: 'Código inválido ou agendamento já concluído.' });
  } catch (error: any) {
    console.error('Erro ao validar código:', error);

    // Registro de Erro na Validação
    try {
      // Tentar pegar o parceiro se userId estiver disponível
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const partner = userId ? await prisma.partner.findFirst({ where: { userId } }) : null;

      await prisma.validationCodeLog.create({
        data: {
          code: req.body?.code || 'unknown',
          status: 'error',
          partnerId: partner?.id,
          partnerName: partner?.name,
          errorMessage: error.message || 'Erro interno desconhecido'
        }
      });
    } catch (logErr) {
      console.error('Erro ao criar log de validação (erro):', logErr);
    }

    return res.status(500).json({ error: 'Erro ao validar código' });
  }
});

// ==================== DISPONIBILIDADE ====================

// Solicitar disponibilidade (Paciente -> Parceiro)
router.post('/availability', authenticate, authorize('PATIENT'), async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { partnerId, specialty, date, time, urgency } = req.body;

    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const request = await prisma.availabilityRequest.create({
      data: {
        patientId: patient.id,
        partnerId,
        specialty,
        date,
        time,
        urgency: urgency || 'normal',
        status: 'pending'
      }
    });

    // Notificar o parceiro
    try {
      const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
      if (partner) {
        await inAppNotificationService.createNotification({
          userId: partner.userId,
          type: 'system',
          title: 'Nova consulta de disponibilidade',
          message: `Você recebeu um novo pedido de disponibilidade para ${specialty} em ${date} às ${time}.`,
          priority: urgency === 'urgent' ? 'high' : 'medium',
          link: '/partner/disponibilidade'
        });
      }
    } catch (notifyError) {
      console.error('Erro ao enviar notificação de disponibilidade:', notifyError);
    }

    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

// Listar solicitações de disponibilidade (para Parceiro ou Paciente)
router.get('/availability', authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    let where: any = {};
    if (role === 'PARTNER') {
      const partner = await prisma.partner.findUnique({ where: { userId } });
      if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });
      where.partnerId = partner.id;
    } else if (role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId } });
      if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });
      where.patientId = patient.id;
    }

    let requests: any[];
    try {
      requests = await prisma.availabilityRequest.findMany({
        where,
        include: {
          patient: { include: { user: { select: { name: true, avatar: true } } } },
          partner: {
            include: {
              user: { select: { name: true, avatar: true } },
              services: { where: { isActive: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (innerErr: any) {
      console.error('[Availability GET] Fallback sem services:', innerErr?.message);
      requests = await prisma.availabilityRequest.findMany({
        where,
        include: {
          patient: { include: { user: { select: { name: true, avatar: true } } } },
          partner: {
            include: {
              user: { select: { name: true, avatar: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    const mappedRequests = requests.map(r => ({
      ...r,
      partner: mapPartnerData(r.partner)
    }));

    res.json(mappedRequests);
  } catch (error) {
    next(error);
  }
});

// Responder a uma solicitação de disponibilidade
router.put('/availability/:id', authenticate, authorize('PARTNER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, suggestedSlots } = req.body;

    if (!['accepted', 'rejected', 'suggested'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const request = await prisma.availabilityRequest.findUnique({
      where: { id },
      include: { patient: { include: { user: true } } }
    });

    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    // Filtrar slots vazios se for sugestão
    const validSuggestedSlots = Array.isArray(suggestedSlots)
      ? suggestedSlots.filter((s: any) => s.date && s.time)
      : null;

    const updatedRequest = await prisma.availabilityRequest.update({
      where: { id },
      data: {
        status,
        suggestedSlots: validSuggestedSlots ? JSON.stringify(validSuggestedSlots) : undefined
      }
    });

    // Notificar o paciente sobre a resposta
    if (request.patient?.user) {
      let message = `O profissional ${status === 'accepted' ? 'aceitou' : status === 'suggested' ? 'sugeriu novos horários para' : 'recusou'} sua solicitação de disponibilidade para ${request.specialty}.`;

      await inAppNotificationService.createNotification({
        userId: request.patient.user.id,
        type: 'system',
        title: 'Resposta de Disponibilidade',
        message,
        priority: 'medium',
        link: '/patient/agendamentos?tab=requests'
      });

      // Emitir via Socket para atualização em tempo real no frontend
      SocketService.sendToUser(request.patient.user.id, 'availabilityUpdate', updatedRequest);
    }

    res.json(updatedRequest);
  } catch (error) {
    next(error);
  }
});


// Relatórios Rápidos para Parceiros
router.get('/reports', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const reports = await prisma.report.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(reports);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar relatórios' });
  }
});

router.post('/reports/quick', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const now = new Date();
    const report = await prisma.report.create({
      data: {
        partnerId: partner.id,
        name: `Resumo Rápido - ${dateFnsFormat(now, 'dd/MM/yyyy')}`,
        type: 'performance',
        format: 'PDF',
        status: 'Concluído',
        createdAt: now,
        createdBy: partner.name,
        period: 'Últimos 30 dias',
        size: '0.5 MB',
        downloads: 0
      }
    });

    // Aqui poderíamos chamar uma lib de geração de PDF real futuramente
    return res.status(201).json(report);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar relatório rápido' });
  }
});

// Endpoints de Dados Financeiros
router.get('/financial-data', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const data = await prisma.partnerFinancialData.findUnique({
      where: { partnerId: partner.id }
    });

    if (!data) return res.status(404).json({ error: 'Dados financeiros não encontrados' });
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao obter dados financeiros' });
  }
});

router.put('/financial-data', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const existingData = await prisma.partnerFinancialData.findUnique({
      where: { partnerId: partner.id }
    });

    console.log('[FinancialUpdate] Corrigindo tipos e preparando payload. Body:', req.body);

    const payload: any = {
      bankCode: String(req.body.bankCode || ''),
      bankName: String(req.body.bankName || ''),
      agency: String(req.body.agency || ''),
      accountNumber: String(req.body.accountNumber || ''),
      accountType: String(req.body.accountType || 'Conta Corrente'),
      accountHolder: String(req.body.accountHolder || ''),
      taxId: String(req.body.taxId || ''),
      taxIdType: String(req.body.taxIdType || (req.body.taxId?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF')),
      stateRegistration: req.body.stateRegistration ? String(req.body.stateRegistration) : null,
      billingAddress: String(req.body.billingAddress || ''),
      billingCity: String(req.body.billingCity || ''),
      billingState: String(req.body.billingState || ''),
      billingZipCode: String(req.body.billingZipCode || ''),
      paymentFrequency: String(req.body.paymentFrequency || 'MONTHLY'),
      paymentMethod: String(req.body.paymentMethod || 'PIX'),
      pixKey: req.body.pixKey ? String(req.body.pixKey) : null,
      pixKeyType: req.body.pixKeyType ? String(req.body.pixKeyType) : null,
    };

    // Garante que plataformaFeePercentage seja um número inteiro
    let fee = 10;
    if (req.user?.role === 'ADMIN' && req.body.platformFeePercentage !== undefined) {
      fee = parseInt(req.body.platformFeePercentage, 10);
    } else if (existingData) {
      fee = existingData.platformFeePercentage;
    }
    payload.platformFeePercentage = fee;

    console.log('[FinancialUpdate] Payload final robusto:', payload);

    const data = await prisma.partnerFinancialData.upsert({
      where: { partnerId: partner.id },
      update: payload,
      create: {
        ...payload,
        partnerId: partner.id
      },
    });

    return res.json(data);
  } catch (error: any) {
    console.error('[FinancialUpdate] Erro Crítico Prisma:', error);
    return res.status(500).json({
      error: 'Erro interno ao processar dados financeiros',
      details: error.message,
      code: error.code // Código de erro do Prisma (ex: P2002)
    });
  }
});

// ==================== ROTAS DE SERVIÇOS ====================

// Listar serviços do parceiro
router.get('/services', authenticate, authorize('PARTNER'), (req, res) => {
  (async () => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const partner = await prisma.partner.findUnique({ where: { userId } });
      if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

      const data = await prisma.partnerService.findMany({
        where: { partnerId: partner.id },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({ data: data || [] });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar serviços' });
    }
  })();
});

// Obter serviço específico
router.get('/services/:serviceId', authenticate, authorize('PARTNER'), (req, res) => {
  (async () => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const partner = await prisma.partner.findUnique({ where: { userId } });
      if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

      const data = await prisma.partnerService.findFirst({
        where: {
          id: req.params.serviceId,
          partnerId: partner.id
        }
      });

      if (!data) return res.status(404).json({ error: 'Serviço não encontrado' });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao obter serviço' });
    }
  })();
});

// Criar novo serviço
router.post('/services', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const {
      name, description, duration, price, isOnline,
      isPresencial, category, discountBasic, discountPremium,
      discountEnterprise, basePrice
    } = req.body;

    if (!name || price === undefined || duration === undefined) {
      return res.status(400).json({ error: 'Nome, preço e duração são obrigatórios' });
    }

    const payload = {
      partnerId: partner.id,
      name,
      description: description || '',
      duration: Number(duration),
      price: Number(price),
      basePrice: basePrice ? Number(basePrice) : Number(price),
      isOnline: !!isOnline,
      isPresencial: !!isPresencial,
      category: category || 'Consulta',
      isActive: true,
      appointments: 0,
      discountBasic: discountBasic ? Number(discountBasic) : 0,
      discountPremium: discountPremium ? Number(discountPremium) : 0,
      discountEnterprise: discountEnterprise ? Number(discountEnterprise) : 0,
    };

    const data = await prisma.partnerService.create({
      data: payload
    });

    return res.status(201).json(data);
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    return res.status(500).json({ error: 'Erro ao criar serviço' });
  }
});

// Atualizar serviço
router.put('/services/:serviceId', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const existing = await prisma.partnerService.findFirst({
      where: { id: req.params.serviceId, partnerId: partner.id }
    });
    if (!existing) return res.status(404).json({ error: 'Serviço não encontrado' });

    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.duration !== undefined) updateData.duration = Number(req.body.duration);
    if (req.body.price !== undefined) updateData.price = Number(req.body.price);
    if (req.body.basePrice !== undefined) updateData.basePrice = Number(req.body.basePrice);
    if (req.body.isOnline !== undefined) updateData.isOnline = !!req.body.isOnline;
    if (req.body.isPresencial !== undefined) updateData.isPresencial = !!req.body.isPresencial;
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.isActive !== undefined) updateData.isActive = !!req.body.isActive;
    if (req.body.discountBasic !== undefined) updateData.discountBasic = Number(req.body.discountBasic);
    if (req.body.discountPremium !== undefined) updateData.discountPremium = Number(req.body.discountPremium);
    if (req.body.discountEnterprise !== undefined) updateData.discountEnterprise = Number(req.body.discountEnterprise);

    const data = await prisma.partnerService.update({
      where: { id: req.params.serviceId },
      data: updateData
    });

    return res.json(data);
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error);
    return res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

// Excluir serviço
router.delete('/services/:serviceId', authenticate, authorize('PARTNER'), (req, res) => {
  (async () => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const partner = await prisma.partner.findUnique({ where: { userId } });
      if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

      const existing = await prisma.partnerService.findFirst({
        where: { id: req.params.serviceId, partnerId: partner.id }
      });
      if (!existing) return res.status(404).json({ error: 'Serviço não encontrado' });

      await prisma.partnerService.delete({
        where: { id: req.params.serviceId }
      });

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao excluir serviço' });
    }
  })();
});

// Alternar status do serviço (ativo/inativo)
router.put('/services/:serviceId/toggle-status', authenticate, authorize('PARTNER'), (req, res) => {
  (async () => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

      const partner = await prisma.partner.findUnique({ where: { userId } });
      if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

      const existing = await prisma.partnerService.findFirst({
        where: { id: req.params.serviceId, partnerId: partner.id }
      });
      if (!existing) return res.status(404).json({ error: 'Serviço não encontrado' });

      const data = await prisma.partnerService.update({
        where: { id: req.params.serviceId },
        data: { isActive: !existing.isActive }
      });

      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao alternar status do serviço' });
    }
  })();
});

// ==================== GESTÃO DE EQUIPE (MÉDICOS) ====================

// Listar membros da equipe
router.get('/team', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const team = await prisma.teamMember.findMany({
      where: { partnerId: partner.id },
      orderBy: { name: 'asc' }
    });

    res.json({ data: team });
  } catch (error) {
    console.error('Erro ao listar equipe:', error);
    res.status(500).json({ error: 'Erro ao listar equipe' });
  }
});

// Adicionar membro à equipe
router.post('/team', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const { name, specialty, crm, email, phone } = req.body;
    if (!name || !specialty) {
      return res.status(400).json({ error: 'Nome e especialidade são obrigatórios' });
    }

    const member = await prisma.teamMember.create({
      data: {
        partnerId: partner.id,
        name,
        specialty,
        crm: crm || null,
        email: email || null,
        phone: phone || null
      }
    });

    res.status(201).json(member);
  } catch (error) {
    console.error('Erro ao criar membro da equipe:', error);
    res.status(500).json({ error: 'Erro ao criar membro da equipe' });
  }
});

// Atualizar membro da equipe
router.put('/team/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const { name, specialty, crm, isActive, email, phone } = req.body;
    const member = await prisma.teamMember.update({
      where: { id: req.params.id, partnerId: partner.id },
      data: { name, specialty, crm, isActive, email, phone }
    });

    res.json(member);
  } catch (error) {
    console.error('Erro ao atualizar membro da equipe:', error);
    res.status(500).json({ error: 'Erro ao atualizar membro da equipe' });
  }
});

// Upload de avatar do membro da equipe
router.post('/team/:id/avatar', authenticate, authorize('PARTNER'), upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const memberId = req.params.id;
    const member = await prisma.teamMember.findFirst({
      where: { id: memberId, partnerId: partner.id }
    });

    if (!member) {
      return res.status(404).json({ error: 'Membro da equipe não encontrado' });
    }

    const publicUrl = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'avatars'
    );

    const updatedMember = await prisma.teamMember.update({
      where: { id: memberId },
      data: { avatar: publicUrl }
    });

    res.json(updatedMember);
  } catch (error) {
    console.error('Erro ao fazer upload da foto:', error);
    res.status(500).json({ error: 'Erro ao processar upload da foto' });
  }
});

// Excluir membro da equipe
router.delete('/team/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    await prisma.teamMember.delete({
      where: { id: req.params.id, partnerId: partner.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir membro da equipe:', error);
    res.status(500).json({ error: 'Erro ao excluir membro da equipe' });
  }
});

// ==================== UPLOAD DE DOCUMENTOS ====================

router.post('/documents/upload', authenticate, authorize('PARTNER'), upload.single('file'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { type } = req.body;
    if (!type) {
      return res.status(400).json({ error: 'O tipo de documento é obrigatório' });
    }

    const publicUrl = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'documents'
    );

    const doc = await prisma.partnerDocument.create({
      data: {
        partnerId: partner.id,
        type,
        name: req.file.originalname,
        url: publicUrl,
        status: 'PENDING'
      }
    });

    res.status(201).json(doc);
  } catch (error) {
    console.error('Erro no upload de documentos:', error);
    res.status(500).json({ error: 'Erro ao processar upload' });
  }
});

// Listar documentos enviados
router.get('/documents', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const docs = await prisma.partnerDocument.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: docs });
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({ error: 'Erro ao listar documentos' });
  }
});

// Reviews
router.get('/reviews/stats', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const reviews = await prisma.review.findMany({
      where: { partnerId: partner.id }
    });

    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / total : 0;
    const replied = reviews.filter(r => r.reply).length;

    // Distribuição de estrelas
    const distribution = [5, 4, 3, 2, 1].map(star => ({
      rating: star,
      count: reviews.filter(r => r.rating === star).length,
      percentage: total > 0 ? Math.round((reviews.filter(r => r.rating === star).length / total) * 100) : 0
    }));

    // Simulação de tendência (últimos 6 meses) - Em produção agrupar por mês
    const trend = [
      { month: 'Jan', avaliacoes: Math.floor(total * 0.1), media: 4.5, respondidas: Math.floor(replied * 0.1) },
      { month: 'Fev', avaliacoes: Math.floor(total * 0.15), media: 4.4, respondidas: Math.floor(replied * 0.15) },
      { month: 'Mar', avaliacoes: Math.floor(total * 0.2), media: 4.6, respondidas: Math.floor(replied * 0.2) },
      { month: 'Abr', avaliacoes: Math.floor(total * 0.25), media: 4.3, respondidas: Math.floor(replied * 0.25) },
      { month: 'Mai', avaliacoes: Math.floor(total * 0.3), media: 4.7, respondidas: Math.floor(replied * 0.3) },
      { month: 'Jun', avaliacoes: total, media: avg, respondidas: replied }
    ];

    res.json({
      averageRating: avg.toFixed(1),
      totalReviews: total,
      replyRate: total > 0 ? Math.round((replied / total) * 100) : 0,
      distribution,
      trend
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de avaliações:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/reviews', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({
      where: { userId }
    });

    if (!partner) {
      return res.status(404).json({ error: 'Parceiro não encontrado' });
    }

    const reviews = await prisma.review.findMany({
      where: { partnerId: partner.id },
      include: {
        appointment: {
          include: {
            patient: {
              include: { user: { select: { name: true, avatar: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(reviews.map(r => ({
      id: r.id,
      patientName: r.appointment.patient.user.name,
      avatar: r.appointment.patient.user.avatar,
      rating: r.rating,
      comment: r.comment,
      date: r.createdAt.toISOString(),
      service: r.appointment.notes || 'Consulta', // Ideally would have service name
      reply: r.reply,
      replyDate: r.replyDate,
      isVerified: true
    })));
  } catch (error) {
    console.error('Erro ao listar avaliações:', error);
    return res.status(500).json({ error: 'Erro ao listar avaliações' });
  }
});

router.post('/reviews/:reviewId/reply', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { reply } = req.body;
    const { reviewId } = req.params;

    if (!reply) {
      return res.status(400).json({ error: 'Resposta é obrigatória' });
    }

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        reply,
        replyDate: new Date()
      }
    });

    return res.json(review);
  } catch (error) {
    console.error('Erro ao responder avaliação:', error);
    return res.status(500).json({ error: 'Erro ao responder avaliação' });
  }
});

// --- IA & ASSISTENTE ---

// Histórico de Chat
router.get('/ai/history', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const history = await prisma.chatHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return res.json(history);
  } catch (error) {
    console.error('Erro ao buscar histórico IA:', error);
    return res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// Enviar Mensagem para IA
router.post('/ai/chat', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?.userId;

    if (!message) return res.status(400).json({ error: 'Mensagem é obrigatória' });
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

    const response = await ChatbotService.processPartnerQuery(message, userId);
    return res.json(response);
  } catch (error) {
    console.error('Erro no chat IA:', error);
    return res.status(500).json({ error: 'Erro ao processar mensagem' });
  }
});

// Listar Insights da IA
router.get('/ai/insights', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const insights = await prisma.aiInsight.findMany({
      where: {
        OR: [
          { userId },
          { userId: null } // Insights globais
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(insights);
  } catch (error) {
    console.error('Erro ao buscar insights IA:', error);
    return res.status(500).json({ error: 'Erro ao buscar insights' });
  }
});

// Criar Insight (CRUD)
router.post('/ai/insights', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { title, description, type, impact, category, actionable, priority } = req.body;

    const insight = await prisma.aiInsight.create({
      data: {
        userId,
        title,
        description,
        type,
        impact,
        category,
        actionable: actionable !== undefined ? actionable : true,
        priority: priority || 3,
        confidence: 100 // Manual/User created
      }
    });

    return res.status(201).json(insight);
  } catch (error) {
    console.error('Erro ao criar insight IA:', error);
    return res.status(500).json({ error: 'Erro ao criar insight' });
  }
});

// Atualizar Insight (CRUD)
router.put('/ai/insights/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { title, description, type, impact, category, actionable, priority } = req.body;

    const insight = await prisma.aiInsight.update({
      where: { id: req.params.id, userId },
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
    console.error('Erro ao atualizar insight IA:', error);
    return res.status(500).json({ error: 'Erro ao atualizar insight' });
  }
});

// Excluir Insight (CRUD)
router.delete('/ai/insights/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    await prisma.aiInsight.delete({
      where: { id: req.params.id, userId }
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir insight IA:', error);
    return res.status(500).json({ error: 'Erro ao excluir insight' });
  }
});

// --- RELATÓRIOS ---

router.get('/reports/stats', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate } = req.query;

    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const start = startDate ? new Date(String(startDate)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(String(endDate)) : new Date();

    // Período Anterior para Comparação
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start.getTime() - 1);

    const [currentPeriod, previousPeriod] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          partnerId: partner.id,
          dateTime: { gte: start, lte: end }
        }
      }),
      prisma.appointment.findMany({
        where: {
          partnerId: partner.id,
          dateTime: { gte: prevStart, lte: prevEnd }
        }
      })
    ]);

    const calculateStats = async (appointments: any[]) => {
      const completed = appointments.filter(a => a.status === 'COMPLETED');
      const total = appointments.length;

      // Identificar novos pacientes (primeiro atendimento no período)
      const patientIds = Array.from(new Set(appointments.map(a => a.patientId)));
      let newPatientsCount = 0;

      if (patientIds.length > 0) {
        // Otimização: Buscar em lote os primeiros atendimentos de cada paciente com este parceiro
        const firstAppointments = await prisma.appointment.groupBy({
          by: ['patientId'],
          where: { patientId: { in: patientIds }, partnerId: partner.id },
          _min: { dateTime: true }
        });

        newPatientsCount = firstAppointments.filter(fa =>
          fa._min.dateTime && fa._min.dateTime >= start && fa._min.dateTime <= end
        ).length;
      }

      // Distribuição de Serviços (Dinâmica)
      // Buscamos os serviços do parceiro para tentar categorizar os agendamentos
      const partnerServices = await prisma.partnerService.findMany({
        where: { partnerId: partner.id }
      });

      const servicesMap = new Map();
      appointments.forEach(a => {
        let category = 'Consulta'; // Categoria padrão
        
        // Tenta encontrar a categoria baseada no nome do serviço se estiver nas notas
        const matchedService = partnerServices.find(s => 
          a.notes?.toLowerCase().includes(s.name.toLowerCase()) || 
          (s.category && a.notes?.toLowerCase().includes(s.category.toLowerCase()))
        );

        if (matchedService && matchedService.category) {
          category = matchedService.category;
        } else if (a.notes?.toLowerCase().includes('retorno')) {
          category = 'Retorno';
        } else if (a.notes?.toLowerCase().includes('exame')) {
          category = 'Exame';
        } else if (a.notes?.toLowerCase().includes('procedimento')) {
          category = 'Procedimento';
        }

        servicesMap.set(category, (servicesMap.get(category) || 0) + 1);
      });

      const servicesDistribution = Array.from(servicesMap.entries()).map(([name, value], index) => {
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
        return { name, value, color: colors[index % colors.length] };
      });

      // Performance Semanal
      const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const performanceMap = new Map();
      weekDays.forEach(day => performanceMap.set(day, { atendimentos: 0, duracaoTotal: 0 }));

      appointments.forEach(a => {
        const day = weekDays[new Date(a.dateTime).getDay()];
        const stats = performanceMap.get(day);
        stats.atendimentos += 1;
        stats.duracaoTotal += (a.duration || 30);
      });

      const weeklyPerformance = Array.from(performanceMap.entries()).map(([dia, data]) => ({
        dia,
        atendimentos: data.atendimentos,
        duracao: data.atendimentos > 0 ? Math.round(data.duracaoTotal / data.atendimentos) : 0
      }));

      // Geração Dinâmica de Alertas
      const alerts = [];
      const cancellationRate = total > 0 ? (appointments.filter(a => a.status === 'CANCELLED').length / total) : 0;
      const completionRate = total > 0 ? (completed.length / total) : 0;

      if (cancellationRate > 0.1) {
        alerts.push({
          id: 'alert-cancel',
          type: 'warning',
          title: 'Alta taxa de cancelamento',
          message: `Sua taxa de cancelamento está em ${(cancellationRate * 100).toFixed(1)}%. Considere revisar sua política de agendamento.`,
          action: 'Ver Detalhes',
          link: '/partner/agendamentos?status=CANCELLED'
        });
      }

      if (completionRate < 0.8 && total > 5) {
        alerts.push({
          id: 'alert-complete',
          type: 'info',
          title: 'Otimização de Agenda',
          message: 'Muitos agendamentos aguardando conclusão. Finalize os atendimentos para liberar o faturamento.',
          action: 'Concluir Agora',
          link: '/partner/agendamentos?status=SCHEDULED'
        });
      }

      const revenue = completed.reduce((sum, a) => {
        // Tenta usar partnerNetPrice se disponível (Preço já com taxas deduzidas se for o caso)
        if (a.partnerNetPrice && a.partnerNetPrice > 0) return sum + a.partnerNetPrice;
        // Fallback: Tenta extrair das notas
        const notesValue = a.notes?.includes('Valor:') ? parseFloat(a.notes.split('Valor:')[1]) : null;
        return sum + (notesValue || 150);
      }, 0);

      return {
        appointments: total,
        patients: patientIds.length,
        revenue,
        hours: Math.round(completed.reduce((sum, a) => sum + (a.duration || 0), 0) / 60),
        completionRate: total > 0 ? Math.round(completionRate * 100) : 0,
        avgDuration: completed.length > 0 ? Math.round(completed.reduce((sum, a) => sum + (a.duration || 0), 0) / completed.length) : 0,
        cancellations: appointments.filter(a => a.status === 'CANCELLED').length,
        newPatients: newPatientsCount,
        servicesDistribution,
        weeklyPerformance,
        alerts
      };
    };

    const curr = await calculateStats(currentPeriod);
    const prev = await calculateStats(previousPeriod);

    // Tendência Mensal (Últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const historicalData = await prisma.appointment.findMany({
      where: {
        partnerId: partner.id,
        dateTime: { gte: sixMonthsAgo },
        status: 'COMPLETED'
      },
      orderBy: { dateTime: 'asc' }
    });

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const trendMap = new Map();

    // Inicializar últimos 6 meses
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      trendMap.set(monthNames[d.getMonth()], { servicos: 0, retornos: 0, receita: 0 });
    }

    historicalData.forEach(a => {
      const month = monthNames[new Date(a.dateTime).getMonth()];
      if (trendMap.has(month)) {
        const entry = trendMap.get(month);
        entry.servicos += 1;
        // Mesma lógica de receita para o gráfico de tendência
        const val = a.partnerNetPrice || (a.notes?.includes('Valor:') ? parseFloat(a.notes.split('Valor:')[1]) : 150);
        entry.receita += val;
      }
    });

    const trend = Array.from(trendMap.entries()).map(([month, data]) => ({
      month,
      ...data
    }));

    // Alerta de Crescimento
    if (curr.revenue > prev.revenue && prev.revenue > 0) {
      const growth = ((curr.revenue - prev.revenue) / prev.revenue) * 100;
      if (growth > 5) {
        curr.alerts.push({
          id: 'alert-growth',
          type: 'success',
          title: 'Crescimento em Destaque',
          message: `Seu faturamento cresceu ${growth.toFixed(1)}% em relação ao período anterior. Bom trabalho!`,
          action: 'Ver Ranking',
          link: '/partner/desempenho'
        });
      }
    }

    res.json({
      ...curr,
      trend,
      comparison: {
        appointments: prev.appointments,
        revenue: prev.revenue,
        patients: prev.patients
      }
    });
  } catch (error) {
    console.error('Erro ao gerar estatísticas de relatório:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/reports/:reportType/export', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { reportType } = req.params;
    const { format, startDate, endDate } = req.query;

    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({
      where: { userId },
      include: { team: true }
    });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const start = startDate ? new Date(String(startDate)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(String(endDate)) : new Date();

    const appointments = await prisma.appointment.findMany({
      where: {
        partnerId: partner.id,
        dateTime: { gte: start, lte: end }
      },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        professional: true
      },
      orderBy: { dateTime: 'desc' }
    });

    if (format === 'csv' || format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Relatório');

      // Colunas: Data, Nome do Paciente, Serviço, Valor repasse, Profissional, Status
      worksheet.columns = [
        { header: 'Data', key: 'date', width: 20 },
        { header: 'Nome do Paciente', key: 'patient', width: 30 },
        { header: 'Serviço', key: 'service', width: 25 },
        { header: 'Valor Repasse (R$)', key: 'value', width: 18 },
        { header: 'Profissional', key: 'professional', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
      ];

      appointments.forEach(a => {
        const serviceName = a.notes?.split('\n')[0] || 'Atendimento';
        const value = a.partnerNetPrice || (a.notes?.includes('Valor:') ? parseFloat(a.notes.split('Valor:')[1]) : 150);
        
        worksheet.addRow({
          date: a.dateTime ? dateFnsFormat(new Date(a.dateTime), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-',
          patient: a.patient?.user?.name || 'Paciente',
          service: serviceName,
          value: value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          professional: a.professional?.name || partner.name || 'Titular',
          status: a.status
        });
      });

      // Estilização do cabeçalho
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      if (format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_${reportType}_${Date.now()}.xlsx`);
        await workbook.xlsx.write(res);
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_${reportType}_${Date.now()}.csv`);
        await workbook.csv.write(res);
      }
      return res.end();
    }

    return res.status(400).json({ error: 'Formato de exportação não suportado' });
  } catch (error) {
    console.error('Erro na exportação:', error);
    res.status(500).json({ error: 'Falha na exportação' });
  }
});

// --- REPASSES (PAYMENTS) ---

router.get('/payments', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const transactions = await prisma.partnerTransaction.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          include: {
            patient: { include: { user: { select: { name: true } } } },
            service: true
          }
        }
      }
    });

    const payments = transactions.map((t) => {
      const date = new Date(t.createdAt);
      return {
        id: t.id,
        date: t.createdAt.toISOString(),
        month: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        amount: t.amount,
        status: t.status === 'COMPLETED' ? 'Pago' : t.status === 'PENDING' ? 'Pendente' : 'Processando',
        type: t.type === 'CREDIT' ? 'Entrada' : 'Saída',
        serviceType: t.appointment?.service?.name || (t.type === 'DEBIT' ? 'Saque' : 'Diversos'),
        description: t.description,
        appointments: t.appointment ? 1 : 0,
        services: t.appointment ? [{
          id: t.appointment.id,
          name: t.appointment.service?.name || 'Atendimento',
          checkInCode: t.appointment.id.slice(-6).toUpperCase(),
          patient: t.appointment.patient?.user?.name || 'Paciente',
          date: t.appointment.dateTime.toISOString(),
          partnerValue: t.amount,
          status: 'Concluído'
        }] : [],
        details: t.appointment ? {
          patientName: t.appointment.patient?.user?.name,
          serviceName: t.appointment.service?.name,
          grossAmount: t.appointment.service?.price,
          doctonFee: t.appointment.doctonFee,
          commissionPercent: t.appointment.commissionPercent
        } : null
      };
    });

    res.json(payments);
  } catch (error) {
    console.error('Erro ao buscar repasses:', error);
    res.status(500).json({ error: 'Erro interno ao buscar repasses' });
  }
});

router.get('/payments/stats', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const wallet = await prisma.partnerWallet.findUnique({
      where: { partnerId: partner.id }
    });

    const [totalCredits, appointmentsCount] = await Promise.all([
      prisma.partnerTransaction.aggregate({
        where: { partnerId: partner.id, type: 'CREDIT', status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      prisma.appointment.count({
        where: { partnerId: partner.id, status: 'COMPLETED' }
      })
    ]);

    const yearTotal = totalCredits._sum.amount || 0;
    const pendingAmount = wallet?.pendingBalance || 0;

    res.json({
      nextPayment: pendingAmount,
      nextPaymentDate: 'Ciclo Semanal',
      monthlyAverage: yearTotal > 0 ? (yearTotal / (new Date().getMonth() + 1)) : 0,
      totalAppointments: appointmentsCount,
      yearTotal,
      averageMargin: 100 - (partner.planTier === 'PREMIUM' ? 5 : partner.planTier === 'PRO' ? 10 : 15),
      totalDoctonRevenue: yearTotal * 0.1,
      growth: 0
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de repasses:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/payments/:id/receipt', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });

    const transfer = await prisma.transfer.findFirst({
      where: { id, partnerId: partner?.id }
    });

    if (!transfer || !transfer.receiptUrl) {
      return res.status(404).json({ error: 'Recibo não encontrado' });
    }

    // Mock de download de arquivo para demonstração
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=comprovante.pdf');
    res.send('Comprovante de Repasse - Docton Saúde');
  } catch (error) {
    res.status(500).json({ error: 'Erro ao baixar recibo' });
  }
});

router.post('/payments/anticipate', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    // Simulação de solicitação de antecipação
    res.json({ success: true, message: 'Solicitação de antecipação enviada!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

// ==================== GESTÃO DE DESAFIOS ====================

router.get('/challenges', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const challenges = await wearablesPilotService.getPartnerChallenges(partner.id);
    res.json(challenges);
  } catch (error) {
    console.error('Erro ao buscar desafios:', error);
    res.status(500).json({ error: 'Erro ao buscar desafios' });
  }
});

router.post('/challenges', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const created = await wearablesPilotService.createChallenge({
      ...req.body,
      createdBy: partner.id,
      sponsor: partner.id // Parceiro é o patrocinador padrão
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Erro ao criar desafio:', error);
    res.status(500).json({ error: 'Erro ao criar desafio' });
  }
});

router.put('/challenges/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });

    // Verificar se o desafio pertence ao parceiro
    const challenge = await prisma.challenge.findFirst({ where: { id, createdBy: partner?.id } });
    if (!challenge) return res.status(403).json({ error: 'Sem permissão ou desafio não encontrado' });

    const updated = await wearablesPilotService.updateChallenge(id, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar desafio:', error);
    res.status(500).json({ error: 'Erro ao atualizar desafio' });
  }
});

router.delete('/challenges/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });

    // Verificar se o desafio pertence ao parceiro
    const challenge = await prisma.challenge.findFirst({ where: { id, createdBy: partner?.id } });
    if (!challenge) return res.status(403).json({ error: 'Sem permissão ou desafio não encontrado' });

    await wearablesPilotService.deleteChallenge(id);
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir desafio:', error);
    res.status(500).json({ error: 'Erro ao excluir desafio' });
  }
});


// ==============================================================================
// VALIDATION CODES MONITORING
// ==============================================================================

router.get('/validation-codes/logs', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const result = await validationCodeService.getLogs({
      ...req.query,
      partnerId: partner.id
    });
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar logs de validação:', error);
    res.status(500).json({ error: 'Erro ao buscar logs de validação' });
  }
});

router.get('/validation-codes/stats', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const stats = await validationCodeService.getStats({
      ...req.query,
      partnerId: partner.id
    });
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas de validação:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas de validação' });
  }
});

// ==============================================================================
// GESTÃO DE ATIVOS (SALAS E EQUIPAMENTOS)
// ==============================================================================

router.get('/rooms', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const rooms = await prisma.room.findMany({
      where: { partnerId: partner.id },
      include: { _count: { select: { appointments: true } } }
    });
    res.json({ data: rooms });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar salas' });
  }
});

router.post('/rooms', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const room = await prisma.room.create({
      data: {
        ...req.body,
        partnerId: partner.id
      }
    });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar sala' });
  }
});

router.put('/rooms/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const room = await prisma.room.update({
      where: { id },
      data: {
        ...req.body,
        partnerId: partner.id // Garantir que pertence ao parceiro
      }
    });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar sala' });
  }
});

router.delete('/rooms/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });

    await prisma.room.deleteMany({
      where: { id, partnerId: partner?.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir sala' });
  }
});

router.get('/equipment', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const equipments = await prisma.equipment.findMany({
      where: { partnerId: partner.id }
    });
    res.json({ data: equipments });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar equipamentos' });
  }
});

router.post('/equipment', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const equipment = await prisma.equipment.create({
      data: {
        ...req.body,
        partnerId: partner.id
      }
    });
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar equipamento' });
  }
});

router.put('/equipment/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        ...req.body,
        partnerId: partner.id // Garantir que pertence ao parceiro
      }
    });
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar equipamento' });
  }
});

router.delete('/equipment/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });

    await prisma.equipment.deleteMany({
      where: { id, partnerId: partner?.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir equipamento' });
  }
});

// ==================== MATERIAIS CLÍNICOS ====================

router.get('/clinic-materials', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const materials = await (prisma as any).clinicMaterial.findMany({
      where: { partnerId: partner.id }
    });
    res.json({ data: materials });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar materiais' });
  }
});

router.post('/clinic-materials', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const material = await (prisma as any).clinicMaterial.create({
      data: {
        ...req.body,
        partnerId: partner.id
      }
    });
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar material' });
  }
});

router.put('/clinic-materials/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const material = await (prisma as any).clinicMaterial.update({
      where: { id },
      data: {
        ...req.body,
        partnerId: partner.id
      }
    });
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar material' });
  }
});

router.delete('/clinic-materials/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const partner = await prisma.partner.findFirst({ where: { userId } });

    await (prisma as any).clinicMaterial.deleteMany({
      where: { id, partnerId: partner?.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir material' });
  }
});

// ==================== COMBOS E INTELIGÊNCIA DE RECEITA ====================

router.get('/combos', authenticate, authorize('PARTNER', 'PHARMACY'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    
    if (role === 'PHARMACY') {
        // Farmácias não têm combos clínicos por enquanto, retornamos lista vazia ou mockada
        return res.json({ data: [] });
    }

    const partner = await prisma.partner.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const combos = await prisma.serviceCombo.findMany({
      where: { partnerId: partner.id },
      include: { services: true }
    });

    res.json({ data: combos });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar combos' });
  }
});

router.post('/combos', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const { name, description, price, serviceIds } = req.body;

    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const combo = await prisma.serviceCombo.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        partnerId: partner.id,
        services: {
          connect: serviceIds.map((id: string) => ({ id }))
        }
      },
      include: { services: true }
    });

    res.status(201).json(combo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar combo' });
  }
});

router.delete('/combos/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });

    await prisma.serviceCombo.deleteMany({
      where: { id, partnerId: partner?.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir combo' });
  }
});


router.put('/revenue/happy-hour', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const { happyHourConfig } = req.body;

    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const updated = await prisma.partner.update({
      where: { id: partner.id },
      data: { happyHourConfig }
    });

    res.json(updated.happyHourConfig);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

router.get('/patients', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    // Buscar pacientes únicos que já agendaram com este parceiro
    const appointments = await prisma.appointment.findMany({
      where: { partnerId: partner.id },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true, phone: true, avatar: true } }
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Agrupar por paciente e calcular métricas
    const patientMap = new Map();
    appointments.forEach(app => {
      if (!app.patient) return;
      if (!patientMap.has(app.patientId)) {
        patientMap.set(app.patientId, {
          id: app.patientId,
          name: app.patient.user.name,
          email: app.patient.user.email,
          phone: app.patient.user?.phone || '',
          lastVisit: app.dateTime,
          totalVisits: 1,
          status: 'active'
        });
      } else {
        const p = patientMap.get(app.patientId);
        p.totalVisits += 1;
      }
    });

    res.json(Array.from(patientMap.values()));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar pacientes' });
  }
});


/**
 * FINANCE ENDPOINTS
 */

// Busca estatísticas financeiras e carteira
router.get('/finance/stats', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const stats = await financeService.getWalletStats(req.user.partnerId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Solicita saque
router.post('/finance/payout', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const { amount, bankDetails } = req.body;
    const request = await financeService.requestPayout(req.user.partnerId, amount, bankDetails);
    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * REPUTATION ENDPOINTS
 */

// Busca estatísticas de NPS e reputação
router.get('/reputation/stats', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const partner = await prisma.partner.findFirst({ where: { userId: req.user.userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });
    
    const stats = await reputationService.getReputationStats(partner.id);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Busca todas as avaliações
router.get('/reputation/reviews', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const partner = await prisma.partner.findFirst({ where: { userId: req.user.userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const reviews = await reputationService.getPartnerReviews(partner.id);
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Responde a uma avaliação
router.post('/reputation/reviews/:reviewId/reply', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const { reply } = req.body;
    const { reviewId } = req.params;
    
    const partner = await prisma.partner.findFirst({ where: { userId: req.user.userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const updatedReview = await reputationService.replyToReview(reviewId, partner.id, reply);
    res.json(updatedReview);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
// @ts-nocheck
