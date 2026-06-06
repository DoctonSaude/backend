import { Router, Request, Response, NextFunction } from 'express';
import { SocketService } from '../lib/socket.js';
import { chronobiologyService } from '../services/chronobiology.service.js';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { supabase } from '../lib/supabase.js';
import inAppNotificationService from '../services/inAppNotification.service.js';
import { PatientReportService } from '../services/patient-report.service.js';
import { LoyaltyService } from '../services/loyalty.service.js';
import { storageService } from '../services/storage.service.js';
import multer from 'multer';
import { MedicalHistorySchema, AnamnesisSchema, HealthExamSchema, PrescriptionSchema, MedicationReminderSchema, SubscriptionSchema, ChangePlanSchema } from '../schemas/patient.schema.js';
import { aiInsightService } from '../services/aiInsight.service.js';
import { patientService } from '../services/patient.service.js';
import { AIRecommendationService } from '../services/aiRecommendation.service.js'; // NOVO: Motor de IA Preditiva
import { wearablesPilotService, getLevelInfo, updateStreak } from '../services/gamification.service.js';
import {
  computeNextDueFromTimes,
  mapReminderForApi,
  sanitizeReminderInput,
  markReminderTaken,
} from '../services/medication-reminder.service.js';
import {
  getMedicationCalendar,
  upsertMedicationLog,
} from '../services/medication-calendar.service.js';
import {
  getPrescriptionAlerts,
  markPrescriptionAlertRead,
  dismissPrescriptionAlert,
  markAllPrescriptionAlertsRead,
} from '../services/prescription-alert.service.js';
import { getMedicationAdherenceReport } from '../services/medication-adherence.service.js';
import {
  persistPaymentCharge,
  getPaymentChargeForPatient,
  refreshPixQrForCharge,
  confirmPaymentCharge,
} from '../services/payment-charge.service.js';
import { notifyPharmacyAboutOrder } from '../utils/pharmacy-order-notify.js';
import {
  cartItemProductLabel,
  formatCartItemsSummary,
  encodeOrderDeliveryPayload,
  decodeOrderDeliveryPayload,
  parseSummaryLineItems,
  buildItemsMapFromPaymentCharges,
} from '../utils/pharmacy-order-items.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Helper to sync subscription with Supabase
const syncSubscriptionWithSupabase = async (subscription: any, operation: 'create' | 'update' | 'delete') => {
    if (!supabase) return;
    
    try {
        if (operation === 'delete') {
            await supabase.from('subscriptions').delete().eq('id', subscription.id);
        } else {
            const supabaseSubscription = {
                id: subscription.id,
                patientId: subscription.patientId,
                planId: subscription.planId,
                paymentMethod: subscription.paymentMethod,
                status: subscription.status,
                startedAt: subscription.startedAt,
                cancelledAt: subscription.cancelledAt,
                createdAt: subscription.createdAt,
                updatedAt: subscription.updatedAt
            };
            
            if (operation === 'create') {
                await supabase.from('subscriptions').insert([supabaseSubscription]);
            } else if (operation === 'update') {
                await supabase.from('subscriptions').update(supabaseSubscription).eq('id', subscription.id);
            }
        }
    } catch (error) {
        console.error('Error syncing subscription with Supabase:', error);
    }
};

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
  console.log(`[ensurePatient] Criando registro de paciente faltante para userId: ${userId}`);

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

const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error: any) {
    console.warn('[Validation Error]', error.errors || error);
    return res.status(400).json({ error: 'Erro de validação', details: error.issues || error.errors || [] });
  }
};

// Rota para logs de analytics do paciente
router.post('/analytics', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { event, properties } = req.body;
    await prisma.analyticsEvent.create({
      data: {
        event,
        propertiesJson: properties,
        userId: req.user?.userId,
        timestamp: new Date()
      }
    });
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('[Analytics Error]', error);
    res.status(500).json({ error: 'Erro ao registrar evento' });
  }
});

// Rotas de Suporte para Pacientes

// Listar tickets de suporte do paciente
router.get('/support/tickets', authenticate, authorize('PATIENT'), async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const tickets = await prisma.supportTicket.findMany({
      where: { patientId: patient.id },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(tickets);
  } catch (error) {
    next(error);
  }
});

// Criar um novo ticket de suporte
router.post('/support/tickets', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const newTicket = await prisma.supportTicket.create({
      data: {
        subject,
        category: category || 'General',
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        patientId: patient.id,
        messages: {
          create: {
            message,
            sender: 'PATIENT',
          },
        },
      },
      include: { messages: true },
    });
    res.status(201).json(newTicket);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar ticket de suporte' });
  }
});

// Obter detalhes de um ticket
router.get('/support/tickets/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, patientId: patient.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ticket' });
  }
});

// Adicionar uma mensagem a um ticket
router.post('/support/tickets/:id/messages', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, patientId: patient.id },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
      return res.status(403).json({ error: 'Não é possível adicionar mensagens a um ticket fechado ou resolvido.' });
    }

    const newMessage = await prisma.supportMessage.create({
      data: {
        ticketId: id,
        message,
        sender: 'PATIENT',
      },
    });

    await prisma.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date(), status: 'OPEN' },
    });

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar mensagem' });
  }
});

// Avaliar um ticket de suporte
router.post('/support/tickets/:id/rating', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, patientId: patient.id },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    if (ticket.status !== 'RESOLVED') {
      return res.status(403).json({ error: 'Só é possível avaliar tickets resolvidos.' });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: { rating: parseInt(rating, 10) },
    });

    res.json(updatedTicket);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao avaliar ticket' });
  }
});

// Rotas de Avaliações do Paciente
// Listar avaliações pendentes
router.get('/evaluations/pending', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Find completed, not yet evaluated appointments
    const pending = await prisma.appointment.findMany({
      where: { 
        patientId: patient.id,
        status: 'COMPLETED',
        // Check if there's no review for this appointment
        NOT: {
          Review: { is: { not: null } }
        }
      },
      include: {
        Partner: { 
          include: {
            User: { select: { name: true, avatar: true } }
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Map to frontend format
    const mapped = pending.map(apt => ({
      id: apt.id,
      partner: {
        id: apt.partnerId,
        name: (apt as any).Partner?.User?.name || 'Profissional',
        avatar: (apt as any).Partner?.User?.avatar,
        specialty: (apt as any).Partner?.specialty
      },
      date: apt.dateTime.toISOString(),
      isCompleted: true,
      isEvaluated: false
    }));

    res.json(mapped);
  } catch (error) {
    console.error('[Evaluations Pending] Erro:', error);
    res.json([]);
  }
});

// Listar histórico de avaliações
router.get('/evaluations/history', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const history = await prisma.review.findMany({
      where: { patientId: patient.id },
      include: {
        Appointment: {
          include: {
            Partner: {
              include: {
                User: { select: { name: true, avatar: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map to frontend format
    const mapped = history.map(rvw => ({
      id: rvw.appointmentId,
      partner: {
        id: rvw.partnerId,
        name: (rvw as any).Appointment?.Partner?.User?.name || 'Profissional',
        avatar: (rvw as any).Appointment?.Partner?.User?.avatar,
        specialty: (rvw as any).Appointment?.Partner?.specialty
      },
      date: (rvw as any).Appointment?.dateTime?.toISOString() || rvw.createdAt.toISOString(),
      isCompleted: true,
      isEvaluated: true
    }));

    res.json(mapped);
  } catch (error) {
    console.error('[Evaluations History] Erro:', error);
    res.json([]);
  }
});

// Enviar avaliação
router.post('/evaluations/:appointmentId', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { rating, comment, wouldRecommend } = req.body;
    const userId = req.user?.userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patientId: patient.id }
    });

    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const review = await prisma.review.upsert({
      where: { appointmentId },
      update: {
        rating: parseInt(rating, 10),
        comment: comment || '',
        wouldRecommend: wouldRecommend ?? true,
        updatedAt: new Date()
      },
      create: {
        appointmentId,
        patientId: patient.id,
        partnerId: appointment.partnerId,
        rating: parseInt(rating, 10),
        comment: comment || '',
        wouldRecommend: wouldRecommend ?? true,
        updatedAt: new Date()
      }
    });

    // Atualizar média do parceiro
    const allReviews = await prisma.review.aggregate({
      where: { partnerId: appointment.partnerId },
      _avg: { rating: true },
      _count: { id: true }
    });

    await prisma.partner.update({
      where: { id: appointment.partnerId },
      data: {
        rating: allReviews._avg.rating || 0,
        totalReviews: allReviews._count.id || 0
      }
    });

    // Award points for review
    LoyaltyService.processReviewPoints(patient.id, review.id).catch(err => {
      console.error('Erro ao atribuir pontos por avaliação:', err);
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('[Submit Evaluation] Erro:', error);
    res.status(500).json({ error: 'Erro ao enviar avaliação' });
  }
});

// Dashboard Unificado do Paciente
router.get('/dashboard', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;

    try {
      const dashboardData = await patientService.getDashboardData(userId);
      if (!dashboardData) return res.status(404).json({ error: 'Paciente não encontrado' });

      res.json(dashboardData);
    } catch (serviceErr: any) {
      const msg = serviceErr?.message ? String(serviceErr.message) : String(serviceErr);
      const code = serviceErr?.code;

      const dbUnavailable =
        process.env.NODE_ENV === 'production' &&
        (msg.toLowerCase().includes('tenant or user not found') ||
          msg.toLowerCase().includes('error querying the database') ||
          code === 'P1001');

      if (dbUnavailable) {
        console.log('[Patient Dashboard Fallback] DB unavailable; returning minimal dashboard');

        // Retornar dashboard mínimo para não quebrar o frontend
        res.json({
          user: {
            id: userId,
            name: 'Usuário',
            email: 'email@example.com',
          },
          stats: {
            totalAppointments: 0,
            upcomingAppointments: 0,
            completedAppointments: 0,
            cancelledAppointments: 0,
          },
          upcomingAppointments: [],
          recentAppointments: [],
          healthMetrics: null,
          notifications: [],
          quickActions: [],
          fallback: true
        });
        return;
      }

      throw serviceErr;
    }
  } catch (error) {
    console.error('[Dashboard Error]', error);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

// Dashboard consolidado via PatientService com Cache (Fase 3)

// Rotas de Agendamentos para Pacientes

// Criar novo agendamento
router.post('/appointments', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const personId = req.user?.personId;
    const { partnerId, dateTime, notes } = req.body;

    const patient = await ensurePatient(userId, personId);

    // Validar se o parceiro existe e está aprovado
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { id: true, name: true, isApproved: true }
    });

    if (!partner) {
      return res.status(404).json({ error: 'Parceiro não encontrado' });
    }

    if (!partner.isApproved) {
      return res.status(400).json({ error: 'Parceiro não está aprovado para agendamentos' });
    }

    // Criar agendamento
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        partnerId: partnerId,
        dateTime: new Date(dateTime),
        notes: notes || '',
        status: 'SCHEDULED'
      },
      include: {
        Partner: {
          select: { id: true, name: true, specialty: true }
        }
      }
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro interno ao criar agendamento' });
  }
});

// Listar agendamentos do paciente
router.get('/appointments', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const personId = req.user?.personId;

    const patient = await ensurePatient(userId, personId);

    const appointments = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: {
        Partner: {
          include: {
            User: { select: { name: true, avatar: true } }
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    // Mapear para camelCase conforme esperado pelo frontend
    const mapped = appointments.map((apt) => ({
      ...apt,
      partner: apt.Partner ? {
        ...apt.Partner,
        user: (apt.Partner as any).User,
        rating: (apt.Partner as any).rating,
        hasRating: !!((apt.Partner as any).rating),
        specialty: (apt.Partner as any).specialty,
        crm: (apt.Partner as any).crm,
        address: (apt.Partner as any).address,
        city: (apt.Partner as any).city,
        state: (apt.Partner as any).state,
      } : null,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// Confirmar um agendamento
router.put('/appointments/:id/confirm', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const appointment = await prisma.appointment.findFirst({
      where: { id, patientId: patient.id }
    });

    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: { Partner: { include: { User: true } } }
    });

    // Notificar o parceiro
    try {
      await inAppNotificationService.createNotification({
        userId: updated.Partner.userId,
        type: 'SYSTEM',
        title: 'Consulta Confirmada',
        message: `O paciente confirmou o agendamento para ${new Date(updated.dateTime).toLocaleString('pt-BR')}.`,
        priority: 'medium',
        link: '/partner/agenda'
      });
    } catch (notifyErr) {
      console.error('Erro ao notificar parceiro sobre confirmação:', notifyErr);
    }

    res.json(updated);
  } catch (error) {
    console.error('Erro ao confirmar agendamento:', error);
    res.status(500).json({ error: 'Erro ao confirmar agendamento' });
  }
});

// Cancelar um agendamento
router.put('/appointments/:id/cancel', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const appointment = await prisma.appointment.findFirst({
      where: { id, patientId: patient.id }
    });

    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED', notes: reason ? `Cancelado: ${reason}` : undefined },
      include: { Partner: { include: { User: true } } }
    });

    // Notificar o parceiro
    try {
      await inAppNotificationService.createNotification({
        userId: updated.Partner.userId,
        type: 'SYSTEM',
        title: 'Consulta Cancelada',
        message: `O paciente cancelou o agendamento de ${new Date(updated.dateTime).toLocaleString('pt-BR')}. Motivo: ${reason || 'Não informado'}.`,
        priority: 'high',
        link: '/partner/agenda'
      });
    } catch (notifyErr) {
      console.error('Erro ao notificar parceiro sobre cancelamento:', notifyErr);
    }

    res.json(updated);
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({ error: 'Erro ao cancelar agendamento' });
  }
});

// Reagendar um agendamento
router.put('/appointments/:id/reschedule', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { dateTime } = req.body;
    const userId = req.user?.userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const appointment = await prisma.appointment.findFirst({
      where: { id, patientId: patient.id }
    });

    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        dateTime: new Date(dateTime),
        status: 'SCHEDULED', // Volta para agendado para o parceiro confirmar se quiser, ou mantém como solicitado
        notes: appointment.notes ? `${appointment.notes} | Solicitação de reagendamento para ${new Date(dateTime).toLocaleString('pt-BR')}` : `Solicitação de reagendamento para ${new Date(dateTime).toLocaleString('pt-BR')}`
      },
      include: { Partner: { include: { User: true } } }
    });

    // Notificar o parceiro
    try {
      await inAppNotificationService.createNotification({
        userId: updated.Partner.userId,
        type: 'SYSTEM',
        title: 'Solicitação de Reagendamento',
        message: `O paciente solicitou reagendar a consulta para ${new Date(updated.dateTime).toLocaleString('pt-BR')}.`,
        priority: 'medium',
        link: `/partner/agenda?id=${updated.id}`
      });
    } catch (notifyErr) {
      console.error('Erro ao notificar parceiro sobre reagendamento:', notifyErr);
    }

    res.json(updated);
  } catch (error) {
    console.error('Erro ao reagendar agendamento:', error);
    res.status(500).json({ error: 'Erro ao reagendar agendamento' });
  }
});

// Avaliar um agendamento
router.post('/appointments/:id/rate', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const appointment = await prisma.appointment.findFirst({
      where: { id, patientId: patient.id }
    });

    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const review = await prisma.review.upsert({
      where: { appointmentId: id },
      update: {
        rating: parseInt(rating, 10),
        comment: comment || '',
        updatedAt: new Date()
      },
      create: {
        appointmentId: id,
        partnerId: appointment.partnerId,
        rating: parseInt(rating, 10),
        comment: comment || '',
        updatedAt: new Date()
      }
    });

    // Atualizar média do parceiro
    const allReviews = await prisma.review.aggregate({
      where: { partnerId: appointment.partnerId },
      _avg: { rating: true },
      _count: { id: true }
    });

    await prisma.partner.update({
      where: { id: appointment.partnerId },
      data: {
        rating: allReviews._avg.rating || 0,
        totalReviews: allReviews._count.id || 0
      }
    });

    // Notificar o parceiro sobre a nova avaliação
    try {
      const partnerUser = await prisma.partner.findUnique({
        where: { id: appointment.partnerId },
        select: { userId: true }
      });
      if (partnerUser) {
        await inAppNotificationService.createNotification({
          userId: partnerUser.userId,
          type: 'SYSTEM',
          title: 'Nova Avaliação Recebida',
          message: `Você recebeu uma avaliação de ${rating} estrelas pelo seu atendimento.`,
          priority: 'medium',
          link: '/partner/dashboard'
        });
      }
    } catch (notifyErr) {
      console.error('Erro ao notificar parceiro sobre avaliação:', notifyErr);
    }

    // Award points for review
    LoyaltyService.processReviewPoints(patient.id, review.id).catch(err => {
      console.error('Erro ao atribuir pontos por avaliação:', err);
    });

    // Notificar atualização de agendamento (status/avaliação)
    SocketService.sendToUser(req.user!.userId, 'appointmentUpdate', { appointmentId: id, status: 'RATED' });

    res.status(201).json(review);
  } catch (error) {
    console.error('Erro ao avaliar agendamento:', error);
    res.status(500).json({ error: 'Erro ao avaliar agendamento' });
  }
});

// Rotas de Histórico de Saúde (HealthLog)

// Obter logs de saúde recentes
router.get('/health-logs', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const logs = await prisma.healthLog.findMany({
      where: { patientId: patient.id },
      orderBy: { logDate: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar logs de saúde' });
  }
});

// Criar um novo log de saúde (Humor, BPM, etc)
router.post('/health-logs', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { type, value, unit, notes, logDate, interpretation, category, recommendations, inputs } = req.body;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const newLog = await prisma.healthLog.create({
      data: {
        patientId: patient.id,
        type,
        value: String(value),
        unit,
        notes,
        logDate: logDate ? new Date(logDate) : new Date(),
        interpretation,
        category,
        recommendations,
        inputs
      }
    });

    // GATILHO DE DESAFIO (Conectividade Gamification)
    let actionType = type;
    if (type.toLowerCase().includes('á') || type.toLowerCase() === 'agua') actionType = 'water';
    if (type.toLowerCase().includes('pes') || type.toLowerCase() === 'peso') actionType = 'weight';
    
    await wearablesPilotService.triggerChallengeAction(req.user?.userId, actionType, Number(value) || 1);

    // Se for um log de humor, dar 5 pontos de XP (Gamificação)
    if (type === 'MOOD') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingMoodToday = await prisma.healthLog.findFirst({
        where: {
          patientId: patient.id,
          type: 'MOOD',
          createdAt: { gte: today }
        }
      });

      if (!existingMoodToday) {
        // Dar 10 pontos (antes 5)
        let pointsToAward = 10;

        // Bônus de Constância: Se o streak for múltiplo de 7, dar +50 pontos
        if (patient.currentStreak > 0 && (patient.currentStreak + 1) % 7 === 0) {
          pointsToAward += 50;

          await LoyaltyService.awardPoints(
            patient.id,
            pointsToAward,
            'streak_bonus',
            `Bônus de constância de ${patient.currentStreak + 1} dias!`
          );
        } else {
          await LoyaltyService.awardPoints(
            patient.id,
            pointsToAward,
            'daily_checkin',
            'Check-in de humor diário'
          );
        }
      }
    }

    // Notificar atualização de logs de saúde
    SocketService.sendToUser(req.user!.userId, 'healthLogsUpdate', newLog);
    // Timeline também é afetada
    SocketService.sendToUser(req.user!.userId, 'timelineUpdate', { type: 'healthLog', id: newLog.id });

    res.status(201).json(newLog);
  } catch (error) {
    console.error('Erro ao criar log de saúde:', error);
    res.status(500).json({ error: 'Erro ao salvar registro de saúde' });
  }
});

// Atualizar um log de saúde
router.put('/health-logs/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { value, notes, logDate, interpretation, category, recommendations, inputs, type, unit } = req.body;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const log = await prisma.healthLog.findFirst({
      where: { id, patientId: patient.id }
    });

    if (!log) return res.status(404).json({ error: 'Registro não encontrado' });

    const updatedLog = await prisma.healthLog.update({
      where: { id },
      data: {
        value: value ? String(value) : undefined,
        notes,
        logDate: logDate ? new Date(logDate) : undefined,
        interpretation,
        category,
        recommendations,
        inputs,
        type,
        unit
      }
    });

    SocketService.sendToUser(req.user!.userId, 'healthLogsUpdate', updatedLog);
    SocketService.sendToUser(req.user!.userId, 'timelineUpdate', { type: 'healthLog', id: updatedLog.id });

    res.json(updatedLog);
  } catch (error) {
    console.error('Erro ao atualizar log de saúde:', error);
    res.status(500).json({ error: 'Erro ao atualizar registro de saúde' });
  }
});

// Excluir um log de saúde
router.delete('/health-logs/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const log = await prisma.healthLog.findFirst({
      where: { id, patientId: patient.id }
    });

    if (!log) return res.status(404).json({ error: 'Registro não encontrado' });

    await prisma.healthLog.delete({
      where: { id }
    });

    SocketService.sendToUser(req.user!.userId, 'healthLogsUpdate', { id, deleted: true });
    SocketService.sendToUser(req.user!.userId, 'timelineUpdate', { type: 'healthLog', id, deleted: true });

    res.json({ message: 'Registro excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir log de saúde:', error);
    res.status(500).json({ error: 'Erro ao excluir registro de saúde' });
  }
});

// Rotas de Insights (Dicas da IA)
router.patch('/insights/:id/read', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Cast to any because Client is locked and not generated
    const updated = await prisma.patientInsight.update({
      where: { id, patientId: patient.id },
      data: { isRead: true }
    });
    res.json(updated);
  } catch (error) {
    console.error('Erro ao marcar insight como lido:', error);
    res.status(500).json({ error: 'Erro ao atualizar insight' });
  }
});

router.patch('/insights/:id/dismiss', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const updated = await prisma.patientInsight.update({
      where: { id, patientId: patient.id },
      data: { isDismissed: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao dispensar insight' });
  }
});

// Rotas de Foco do Dia (Tarefas Diárias)

// Listar tarefas de hoje
router.get('/daily-tasks', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await prisma.patientDailyTask.findMany({
      where: {
        patientId: patient.id,
        date: { gte: today }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar tarefas diárias' });
  }
});

// Listar dicas de saúde (Health Tips)
router.get('/health-tips', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const tips = await prisma.healthTip.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    res.json(tips);
  } catch (error) {
    console.error('Erro ao buscar dicas de saúde:', error);
    res.status(500).json({ error: 'Erro ao buscar dicas de saúde' });
  }
});

// Marcar tarefa como concluída e ganhar pontos
router.patch('/daily-tasks/:id/complete', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const task = await prisma.patientDailyTask.findFirst({
      where: { id, patientId: patient.id }
    });

    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
    if (task.completed) return res.status(400).json({ error: 'Tarefa já concluída' });

    const updatedTask = await prisma.patientDailyTask.update({
      where: { id },
      data: { completed: true }
    });

    // Premiar com XP e Pontos (Loyalty)
    await LoyaltyService.awardPoints(
      patient.id,
      task.xp,
      'daily_task_complete',
      `Tarefa concluída: ${task.task}`
    );

    res.json(updatedTask);
  } catch (error) {
    console.error('Erro ao concluir tarefa:', error);
    res.status(500).json({ error: 'Erro ao concluir tarefa' });
  }
});

// Criar tarefa personalizada
router.post('/daily-tasks', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { task, xp, icon } = req.body;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const newTask = await prisma.patientDailyTask.create({
      data: {
        patientId: patient.id,
        task,
        xp: xp || 50,
        icon: icon || '✅',
        date: new Date()
      }
    });

    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar tarefa personalizada' });
  }
});

// Excluir tarefa
router.delete('/daily-tasks/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    await prisma.patientDailyTask.deleteMany({
      where: { id, patientId: patient.id }
    });

    res.json({ message: 'Tarefa excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir tarefa' });
  }
});

// Perfil do Paciente completo
router.get('/profile', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const personId = req.user?.personId;

    const patient = await ensurePatient(userId, personId);

    const profile = await prisma.patient.findUnique({
      where: { id: patient.id },
      include: {
        User: {
          select: {
            name: true,
            email: true,
            avatar: true,
            phone: true
          }
        },
        Subscription: {
          include: { Plan: true },
          where: { status: 'ACTIVE' },
          take: 1
        }
      }
    });
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado' });

    // Mapeia o plano para o frontend (Prioridade: planType > Subscription)
    const patientPlan = (profile as any).planType;
    const subscriptionPlan = (profile as any).Subscription?.[0]?.Plan?.key;
    let finalPlan = 'basic';

    if (patientPlan && patientPlan !== 'Gratuito' && patientPlan !== 'Básico') {
      finalPlan = patientPlan;
    } else if (subscriptionPlan) {
      finalPlan = subscriptionPlan;
    } else {
      finalPlan = patientPlan || 'basic';
    }

    const user = (profile as any).User;
    // Resposta completa para Dados Vitais / prontuário (telefone e avatar ficam em User)
    const safeResponse = {
      id: profile.id,
      userId: profile.userId,
      cpf: profile.cpf,
      phone: user?.phone ?? null,
      birthDate: profile.birthDate,
      gender: profile.gender,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      zipCode: profile.zipCode,
      bloodType: profile.bloodType,
      allergies: profile.allergies ?? [],
      chronicDiseases: profile.chronicDiseases ?? [],
      currentMedications: profile.currentMedications ?? [],
      emergencyContact: profile.emergencyContact,
      emergencyPhone: profile.emergencyPhone,
      avatar: user?.avatar ?? null,
      planType: (profile as any).planType,
      plan: finalPlan,
      user,
      subscriptions: (profile as any).Subscription,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };

    res.json(safeResponse);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Obter assinatura atual
router.get('/subscription', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = (req.user as any).userId;
    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: {
        Subscription: {
          where: { status: 'ACTIVE' },
          include: { Plan: true },
          orderBy: { startedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!patient || !patient.Subscription.length) {
      return res.status(404).json({ error: 'Nenhuma assinatura ativa encontrada' });
    }

    res.json(patient.Subscription[0]);
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
});

// Criar nova assinatura
router.post('/subscription', authenticate, authorize('PATIENT'), validate(SubscriptionSchema), async (req, res) => {
  try {
    const userId = (req.user as any).userId;
    const { planId, paymentMethod } = req.body;

    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: { Subscription: { where: { status: 'ACTIVE' } } }
    });

    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Cancelar assinaturas ativas anteriores se existirem
    if (patient.Subscription.length > 0) {
      await prisma.subscription.updateMany({
        where: { patientId: patient.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED', cancelledAt: new Date(), updatedAt: new Date() }
      });
      
      // Sync cancelled subscriptions
      for (const sub of patient.Subscription) {
          await syncSubscriptionWithSupabase(sub, 'update');
      }
    }

    const subscription = await prisma.subscription.create({
      data: {
        patientId: patient.id,
        planId,
        paymentMethod,
        status: 'ACTIVE',
        startedAt: new Date(),
        updatedAt: new Date()
      },
      include: { Plan: true }
    });

    // 🎁 Gamificação: Bonificação por nova assinatura
    await LoyaltyService.awardPoints(
      patient.id,
      100,
      'SUBSCRIPTION_AWARD',
      `Bônus por assinatura do Plano ID: ${planId}`
    );

    // Sync new subscription
    await syncSubscriptionWithSupabase(subscription, 'create');

    res.status(201).json(subscription);
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    res.status(500).json({ error: 'Erro ao criar assinatura' });
  }
});

// Mudar plano
router.put('/subscription/change', authenticate, authorize('PATIENT'), validate(ChangePlanSchema), async (req, res) => {
  try {
    const userId = (req.user as any).userId;
    const { planId } = req.body;

    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: { Subscription: { where: { status: 'ACTIVE' } } }
    });

    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Cancelar ativa anterior
    await prisma.subscription.updateMany({
      where: { patientId: patient.id, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: new Date(), updatedAt: new Date() }
    });
    
    // Sync cancelled subscription
    for (const sub of patient.Subscription) {
        await syncSubscriptionWithSupabase(sub, 'update');
    }

    const subscription = await prisma.subscription.create({
      data: {
        patientId: patient.id,
        planId,
        paymentMethod: 'PLAN_CHANGE',
        status: 'ACTIVE',
        startedAt: new Date(),
        updatedAt: new Date()
      },
      include: { Plan: true }
    });

    // 🎁 Gamificação: Bonificação por upgrade/mudança de assinatura
    await LoyaltyService.awardPoints(
      patient.id,
      50,
      'SUBSCRIPTION_CHANGE',
      `Bônus por mudança para o Plano ID: ${planId}`
    );

    // Sync new subscription
    await syncSubscriptionWithSupabase(subscription, 'create');

    res.json(subscription);
  } catch (error) {
    console.error('Erro ao mudar plano:', error);
    res.status(500).json({ error: 'Erro ao mudar plano' });
  }
});

// Cancelar assinatura
router.delete('/subscription', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = (req.user as any).userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Get active subscriptions first
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { patientId: patient.id, status: 'ACTIVE' }
    });

    await prisma.subscription.updateMany({
      where: { patientId: patient.id, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: new Date(), updatedAt: new Date() }
    });

    // Sync cancelled subscriptions
    for (const sub of activeSubscriptions) {
      await syncSubscriptionWithSupabase(sub, 'update');
    }

    res.json({ message: 'Assinatura cancelada com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({ error: 'Erro ao cancelar assinatura' });
  }
});

// Upload de Avatar
router.post('/profile/avatar', authenticate, authorize('PATIENT'), upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    let publicUrl: string;

    try {
      publicUrl = await storageService.uploadAvatar(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    } catch (storageError: any) {
      // Diagnóstico detalhado do erro do Supabase Storage
      const storageMsg = storageError?.message || String(storageError);
      console.error('[AVATAR UPLOAD] Falha no Supabase Storage:', storageMsg);

      // Verificar causa mais comum: bucket inexistente ou sem permissão
      if (storageMsg.includes('Bucket not found') || storageMsg.includes('not found') || storageMsg.includes('does not exist')) {
        return res.status(503).json({
          error: 'Serviço de armazenamento indisponível',
          details: 'O bucket de avatares não foi encontrado no Supabase. Verifique se o bucket "avatars" existe e está configurado como público.',
          hint: 'Acesse o painel do Supabase > Storage > Crie o bucket "avatars" com policy pública.'
        });
      }

      if (storageMsg.includes('JWT') || storageMsg.includes('Unauthorized') || storageMsg.includes('Invalid API key')) {
        return res.status(503).json({
          error: 'Autenticação do storage inválida',
          details: 'A chave de service role do Supabase pode estar incorreta ou expirada.',
        });
      }

      // Erro genérico de storage — retornar detalhes sem expor stack
      return res.status(503).json({
        error: 'Falha ao fazer upload da foto',
        details: storageMsg
      });
    }

    await prisma.user.update({
      where: { id: req.user?.userId },
      data: { avatar: publicUrl }
    });

    res.json({ avatar: publicUrl });
  } catch (error: any) {
    console.error('[AVATAR UPLOAD] Erro inesperado:', error?.message || error);
    res.status(500).json({ error: 'Erro interno ao processar foto', details: error?.message });
  }
});

// Upload Genérico de Arquivos (Exames, Documentos)
router.post('/uploads', authenticate, authorize('PATIENT'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const folder = req.body.folder || 'others';
    // Validar pastas permitidas para organização
    const allowedFolders = ['exams', 'medical-records', 'documents', 'others'];
    const targetFolder = allowedFolders.includes(folder) ? folder : 'others';

    const publicUrl = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      targetFolder
    );

    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Erro no upload de arquivo:', error);
    res.status(500).json({ error: 'Erro ao processar upload' });
  }
});

router.put('/profile', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { name, email, phone, ...rawData } = req.body;

    const patientData: any = {};
    const allowedFields = [
      'cpf',
      'birthDate', 'gender', 'address', 'city', 'state', 'zipCode',
      'bloodType', 'allergies', 'chronicDiseases', 'currentMedications',
      'emergencyContact', 'emergencyPhone'
    ];

    allowedFields.forEach(field => {
      if (rawData[field] !== undefined) {
        patientData[field] = rawData[field];
      }
    });

    if (patientData.birthDate) {
      patientData.birthDate = new Date(patientData.birthDate);
    } else if (patientData.birthDate === '') {
      patientData.birthDate = null;
    }

    if (Array.isArray(patientData.allergies)) {
      patientData.allergies = patientData.allergies
        .map((a: string) => (typeof a === 'string' ? a.trim() : ''))
        .filter(Boolean);
    }
    if (Array.isArray(patientData.chronicDiseases)) {
      patientData.chronicDiseases = patientData.chronicDiseases
        .map((d: string) => (typeof d === 'string' ? d.trim() : ''))
        .filter(Boolean);
    }

    patientData.updatedAt = new Date();

    const patient = await prisma.patient.findUnique({
      where: { userId: req.user?.userId }
    });

    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Transaction to update both Patient and User if necessary
    const [updatedPatient, updatedUser] = await prisma.$transaction([
      prisma.patient.update({
        where: { id: patient.id },
        data: patientData
      }),
      prisma.user.update({
        where: { id: req.user?.userId },
        data: {
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined
        }
      })
    ]);

    SocketService.sendToUser(req.user!.userId, 'patientProfileUpdate', { ...updatedPatient, user: updatedUser });

    res.json({ ...updatedPatient, user: updatedUser });
  } catch (error: any) {
    console.error('Erro detalhado ao atualizar perfil:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Erro ao atualizar perfil',
      details: error.message // Sending error details to frontend for immediate user feedback
    });
  }
});


// Obter configurações do paciente
router.get('/settings', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user?.userId },
      select: { settings: true }
    });

    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    res.json(patient.settings || {});
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Atualizar configurações do paciente
router.put('/settings', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const settings = req.body;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });

    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Validate if settings is an object
    if (typeof settings !== 'object' || settings === null) {
      return res.status(400).json({ error: 'Formato de configurações inválido' });
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: patient.id },
      data: { settings },
      select: { settings: true }
    });

    res.json(updatedPatient.settings);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// Finalizar Onboarding com "IA" Preditiva
router.post('/onboarding', authenticate, authorize('PATIENT'), async (req, res, next) => {
  try {
    const {
      bloodType,
      allergies,
      chronicDiseases,
      currentMedications,
      lifestyle,
      healthGoals,
      weight,
      height,
      userIntent,   // NOVO: ECONOMIA / RAPIDEZ / ETC
      userPriority  // NOVO: PREÇO / TEMPO / ETC
    } = req.body;

    console.log('[ONBOARDING DEBUG] Recebido para processamento:', JSON.stringify(req.body));

    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Lógica Preditiva (Simulação de ML Clustering)
    let archetype = 'Buscador de Bem-estar'; // Default

    const hasChronic = chronicDiseases && chronicDiseases.length > 0;
    const highIntensity = lifestyle?.activityLevel === 'athlete' || lifestyle?.activityLevel === 'active';
    const focusOnDisease = healthGoals?.includes('manage_condition');

    if (hasChronic || focusOnDisease) {
      archetype = 'Gestor de Saúde Ativo';
    } else if (highIntensity) {
      archetype = 'Focado em Performance';
    } else if (healthGoals?.includes('mental_health')) {
      archetype = 'Equilíbrio e Mente';
    }

    // Limpeza e normalização de dados antes de salvar
    const allergiesValue = Array.isArray(allergies) ? allergies.join(', ') : (typeof allergies === 'string' ? allergies : '');
    const weightValue = weight ? Number(weight) : undefined;
    const heightValue = height ? Number(height) : undefined;

    console.log(`[ONBOARDING] Processando onboarding para paciente ${patient.id}`, {
      archetype,
      allergies: allergiesValue,
      weight: weightValue,
      height: heightValue
    });

    // Criar Logs iniciais de Saúde (CRUD real)
    if (weightValue) await prisma.healthLog.create({
      data: { patientId: patient.id, type: 'WEIGHT', value: String(weightValue), unit: 'kg', logDate: new Date() }
    });

    if (weightValue && heightValue) {
      const bmi = (weightValue / (heightValue * heightValue)).toFixed(1);
      await Promise.all([
        prisma.healthLog.create({
          data: { patientId: patient.id, type: 'BMI', value: bmi, logDate: new Date() }
        }),
        prisma.healthLog.create({
          data: { patientId: patient.id, type: 'HEIGHT', value: String(heightValue), unit: 'm', logDate: new Date() }
        })
      ]);
    }

    // Atualizar paciente - campos principais do onboarding (agora com alergias inclusas)
    const updatedPatient = await (prisma.patient as any).update({
      where: { id: patient.id },
      data: {
        bloodType,
        allergies: Array.isArray(allergies) ? allergies : (allergies ? [String(allergies)] : []),
        chronicDiseases: Array.isArray(chronicDiseases) ? chronicDiseases : [], 
        currentMedications: Array.isArray(currentMedications) ? currentMedications : [],
        lifestyle: lifestyle || {},
        healthGoals: Array.isArray(healthGoals) ? healthGoals : [],
        userIntent: userIntent || null,
        userPriority: userPriority || null,
        archetype,
        onboardingCompleted: true,
        level: 2,
        levelTitle: 'Iniciado em Saúde',
        updatedAt: new Date()
      }
    });

    // Registrar bônus de boas-vindas (isolado para não travar o onboarding se a transação do pooler falhar)
    try {
      await LoyaltyService.awardPoints(
        patient.id,
        500,
        'onboarding_complete',
        'Bônus de Boas-vindas Docton'
      );
    } catch (loyaltyErr: any) {
      console.error('[ONBOARDING] Aviso: falha ao atribuir pontos de bônus:', loyaltyErr.message);
    }

    // Inicializar motor de IA baseado na intenção (NIVEL 1)
    try {
      if (userIntent) {
        await AIRecommendationService.updatePurchaseStats(
          req.user!.userId, 
          `Perfil: ${userIntent}` // Mark inicial de intenção
        );
      }
    } catch (aiErr: any) {
      console.error('[ONBOARDING] IA Warning: falha ao inicializar perfil preditivo:', aiErr.message);
    }

    // Notificar conclusão de onboarding (atualiza perfil e logs)
    await patientService.invalidateDashboardCache(req.user!.userId);
    SocketService.sendToUser(req.user!.userId, 'patientProfileUpdate', updatedPatient);
    SocketService.sendToUser(req.user!.userId, 'healthLogsUpdate', { type: 'onboarding' });

    return res.status(200).json({
      message: 'Onboarding concluído!',
      archetype,
      bonus: { points: 500, xp: 1000 },
      patient: updatedPatient
    });
  } catch (error: any) {
    next(error);
  }
});

// Rotas de Favoritos
router.get('/favorites', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const favorites = await prisma.favoritePartner.findMany({
      where: { patientId: patient.id },
      select: { partnerId: true }
    });

    res.json(favorites.map(f => f.partnerId));
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    res.status(500).json({ error: 'Erro ao buscar favoritos' });
  }
});

router.post('/favorites/:partnerId/toggle', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { partnerId } = req.params;
    const userId = req.user?.userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const existing = await prisma.favoritePartner.findUnique({
      where: {
        patientId_partnerId: {
          patientId: patient.id,
          partnerId
        }
      }
    });

    if (existing) {
      await prisma.favoritePartner.delete({
        where: { id: existing.id }
      });
      return res.json({ favorited: false });
    } else {
      await prisma.favoritePartner.create({
        data: {
          patientId: patient.id,
          partnerId
        }
      });
      return res.json({ favorited: true });
    }
  } catch (error) {
    console.error('Erro ao alternar favorito:', error);
    res.status(500).json({ error: 'Erro ao processar favorito' });
  }
});

// --- MÓDULO PRONTUÁRIO ---

// Listar Prontuários (Documentos Oficiais preenchidos por Profissionais)
router.get('/medical-records', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const records = await prisma.medicalRecord.findMany({
      where: { patientId: patient.id },
      include: {
        Partner: {
          include: { User: { select: { name: true } } },
        },
        Appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      records.map((r) => ({
        ...r,
        partner: r.Partner ? { ...r.Partner, user: r.Partner.User } : null,
        appointment: r.Appointment,
      }))
    );
  } catch (error) {
    console.error('Erro ao buscar prontuários:', error);
    res.status(500).json({ error: 'Erro ao buscar prontuários' });
  }
});

// Detalhes de um Prontuário Específico
router.get('/medical-records/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const record = await prisma.medicalRecord.findFirst({
      where: { id, patientId: patient.id },
      include: {
        Partner: {
          include: { User: { select: { name: true } } },
        },
        Appointment: true,
      },
    });

    if (!record) return res.status(404).json({ error: 'Prontuário não encontrado' });

    res.json({
      ...record,
      partner: record.Partner ? { ...record.Partner, user: record.Partner.User } : null,
      appointment: record.Appointment,
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do prontuário:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes' });
  }
});

// Histórico Médico
router.get('/medical-history', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const history = await prisma.medicalHistory.findMany({
      where: { patientId: patient.id },
      orderBy: { date: 'desc' }
    });
    res.json(history);
  } catch (error) {
    console.error('Erro ao buscar histórico médico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico médico', details: (error as Error).message });
  }
});

// Histórico de atendimentos: somente leitura para o paciente (registro feito pelo profissional) (registro feito pelo profissional)
router.post('/medical-history', authenticate, authorize('PATIENT'), (_req, res) => {
  return res.status(403).json({
    error: 'O histórico de atendimentos deve ser registrado pelo profissional de saúde.',
  });
});

router.put('/medical-history/:id', authenticate, authorize('PATIENT'), (_req, res) => {
  return res.status(403).json({
    error: 'O histórico de atendimentos não pode ser alterado pelo paciente.',
  });
});

router.delete('/medical-history/:id', authenticate, authorize('PATIENT'), (_req, res) => {
  return res.status(403).json({
    error: 'O histórico de atendimentos não pode ser excluído pelo paciente.',
  });
});

// Anamnese
router.get('/anamnesis', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const anamneses = await prisma.anamnesis.findMany({
      where: { patientId: patient.id },
      orderBy: { date: 'desc' }
    });
    res.json(anamneses);
  } catch (error) {
    console.error('Erro ao buscar anamnese:', error);
    res.status(500).json({ error: 'Erro ao buscar anamneses' });
  }
});

// Anamnese: somente leitura para o paciente (registro feito pelo profissional — ver rotas em /partners/anamnesis)
router.post('/anamnesis', authenticate, authorize('PATIENT'), (_req, res) => {
  return res.status(403).json({
    error: 'A anamnese deve ser registrada pelo profissional de saúde durante ou após a consulta.',
  });
});

router.put('/anamnesis/:id', authenticate, authorize('PATIENT'), (_req, res) => {
  return res.status(403).json({
    error: 'A anamnese não pode ser alterada pelo paciente. Solicite correção ao seu médico.',
  });
});

router.delete('/anamnesis/:id', authenticate, authorize('PATIENT'), (_req, res) => {
  return res.status(403).json({
    error: 'A anamnese não pode ser excluída pelo paciente.',
  });
});

// Exames
router.get('/exams', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    console.log('[Exams GET] UserId:', userId);

    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) {
      console.log('[Exams GET] Patient not found for userId:', userId);
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    console.log('[Exams GET] Patient found:', patient.id);

    const exams = await prisma.healthExam.findMany({
      where: { patientId: patient.id },
      orderBy: { date: 'desc' }
    });
    console.log('[Exams GET] Exams found:', exams.length);
    res.json(exams);
  } catch (error) {
    console.error('[Exams GET] Erro ao buscar exames:', error);
    res.status(500).json({ error: 'Erro ao buscar exames', details: (error as Error).message });
  }
});

router.post('/exams', authenticate, authorize('PATIENT'), validate(HealthExamSchema), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const data = { ...req.body };
    delete (data as any).id;
    delete (data as any).createdAt;
    delete (data as any).updatedAt;
    delete (data as any).patientId;
    
    const newRecord = await prisma.healthExam.create({
      data: {
        ...data,
        patientId: patient.id,
        date: new Date(req.body.date),
        updatedAt: new Date(),
      }
    });
    SocketService.sendToUser(req.user!.userId, 'examsUpdate', newRecord);
    SocketService.sendToUser(req.user!.userId, 'timelineUpdate', { type: 'exam', id: newRecord.id });
 
    // GATILHO DE DESAFIO (Conectividade Gamification)
    try {
      await wearablesPilotService.triggerChallengeAction(req.user?.userId, 'exam_added');
    } catch (error) {
      console.warn('Erro ao acionar desafio gamificação para exame adicionado:', error);
    }

    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Erro ao salvar exame:', error);
    res.status(500).json({ error: 'Erro ao salvar exame', details: (error as Error).message });
  }
});

router.put('/exams/:id', authenticate, authorize('PATIENT'), validate(HealthExamSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const data = { ...req.body };
    delete (data as any).id;
    delete (data as any).createdAt;
    delete (data as any).updatedAt;
    delete (data as any).patientId;
    
    const updated = await prisma.healthExam.update({
      where: { id, patientId: patient.id },
      data: {
        ...data,
        date: req.body.date ? new Date(req.body.date) : undefined,
        updatedAt: new Date(),
      }
    });
    SocketService.sendToUser(req.user!.userId, 'examsUpdate', updated);
    SocketService.sendToUser(req.user!.userId, 'timelineUpdate', { type: 'exam', id: updated.id });
 
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar exame:', error);
    res.status(500).json({ error: 'Erro ao atualizar exame', details: (error as Error).message });
  }
});

router.delete('/exams/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    await prisma.healthExam.delete({
      where: { id, patientId: patient.id }
    });

    SocketService.sendToUser(req.user!.userId, 'examsUpdate', { id, deleted: true });
    SocketService.sendToUser(req.user!.userId, 'timelineUpdate', { type: 'exam', id, deleted: true });

    res.json({ message: 'Exame excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir exame:', error);
    res.status(500).json({ error: 'Erro ao excluir exame', details: (error as Error).message });
  }
});

// Prescrições
router.get('/prescriptions', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const prescriptions = await prisma.prescription.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(prescriptions);
  } catch (error) {
    console.error('Erro ao buscar prescrições:', error);
    res.status(500).json({ error: 'Erro ao buscar prescrições' });
  }
});

router.post('/prescriptions', authenticate, authorize('PATIENT'), validate(PrescriptionSchema), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const parsed = req.body;
    const newRecord = await prisma.prescription.create({
      data: {
        medication: parsed.medication,
        dosage: parsed.dosage,
        frequency: parsed.frequency,
        duration: parsed.duration,
        instructions: parsed.instructions,
        doctor: parsed.doctor,
        status: parsed.status || 'Ativo',
        category: parsed.category,
        sideEffects: parsed.sideEffects,
        contraindications: parsed.contraindications,
        patientId: patient.id,
        updatedAt: new Date(),
        startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
        endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
        date: parsed.date ? new Date(parsed.date) : new Date(),
      }
    });

    // ANALISE DE IA PREDITIVA (RECOMPRA)
    try {
      await AIRecommendationService.analyzePrescription(patient.id, newRecord.id);
    } catch (aiErr: any) {
      console.error('[PRESCRIPTION IA] Warning: falha ao processar predição:', aiErr.message);
    }

    SocketService.sendToUser(req.user!.userId, 'prescriptionUpdate', newRecord);
    SocketService.sendToUser(req.user!.userId, 'prescriptionAlertsUpdate', { refresh: true });
    SocketService.sendToUser(req.user!.userId, 'timelineUpdate', { type: 'prescription', id: newRecord.id });

    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Erro ao salvar prescrição:', error);
    res.status(500).json({ error: 'Erro ao salvar prescrição', details: (error as Error).message });
  }
});

router.put('/prescriptions/:id', authenticate, authorize('PATIENT'), validate(PrescriptionSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const parsed = req.body;
    const updated = await prisma.prescription.update({
      where: { id, patientId: patient.id },
      data: {
        medication: parsed.medication,
        dosage: parsed.dosage,
        frequency: parsed.frequency,
        duration: parsed.duration,
        instructions: parsed.instructions,
        doctor: parsed.doctor,
        status: parsed.status,
        category: parsed.category,
        sideEffects: parsed.sideEffects,
        contraindications: parsed.contraindications,
        updatedAt: new Date(),
        startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
        endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
        date: parsed.date ? new Date(parsed.date) : undefined,
      }
    });
    SocketService.sendToUser(req.user!.userId, 'prescriptionUpdate', updated);
    SocketService.sendToUser(req.user!.userId, 'prescriptionAlertsUpdate', { refresh: true });
    SocketService.sendToUser(req.user!.userId, 'timelineUpdate', { type: 'prescription', id: updated.id });
 
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar prescrição:', error);
    res.status(500).json({ error: 'Erro ao atualizar prescrição' });
  }
});

router.delete('/prescriptions/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    await prisma.prescription.delete({
      where: { id, patientId: patient.id }
    });
 
    SocketService.sendToUser(req.user!.userId, 'prescriptionUpdate', { id, deleted: true });
    SocketService.sendToUser(req.user!.userId, 'prescriptionAlertsUpdate', { refresh: true });
    SocketService.sendToUser(req.user!.userId, 'timelineUpdate', { type: 'prescription', id, deleted: true });
 
    res.json({ message: 'Prescrição excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir prescrição:', error);
    res.status(500).json({ error: 'Erro ao excluir prescrição' });
  }
});


// Lembretes de Medicação
router.get('/medication-reminders', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const reminders = await prisma.medicationReminder.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = await Promise.all(reminders.map((r) => mapReminderForApi(r)));
    res.json(mapped);
  } catch (error) {
    console.error('Erro ao buscar lembretes:', error);
    res.status(500).json({ error: 'Erro ao buscar lembretes' });
  }
});

router.post('/medication-reminders', authenticate, authorize('PATIENT'), validate(MedicationReminderSchema), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const reminderPayload = sanitizeReminderInput(req.body);
    const nextDue = computeNextDueFromTimes(reminderPayload.times as string[]);

    const newRecord = await prisma.medicationReminder.create({
      data: {
        medicationName: reminderPayload.medicationName as string,
        dosage: reminderPayload.dosage as string,
        times: reminderPayload.times as string[],
        startDate: (reminderPayload.startDate as Date) || new Date(),
        endDate: (reminderPayload.endDate as Date | null) ?? null,
        isActive: reminderPayload.isActive !== false,
        notes: (reminderPayload.notes as string | null) ?? null,
        prescriptionId: (reminderPayload.prescriptionId as string | null) ?? null,
        nextDue,
        adherenceRate: 100,
        patientId: patient.id,
        updatedAt: new Date(),
      },
    });

    const mapped = await mapReminderForApi(newRecord, { skipAdherence: true });
    SocketService.sendToUser(req.user!.userId, 'medicationRemindersUpdate', { reminder: mapped });
    SocketService.sendToUser(req.user!.userId, 'medicationAdherenceUpdate', { refresh: true });
    res.status(201).json(mapped);
  } catch (error) {
    console.error('Erro ao salvar lembrete:', error);
    res.status(500).json({ error: 'Erro ao salvar lembrete' });
  }
});

router.put('/medication-reminders/:id', authenticate, authorize('PATIENT'), validate(MedicationReminderSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const existing = await prisma.medicationReminder.findFirst({
      where: { id, patientId: patient.id },
    });
    if (!existing) return res.status(404).json({ error: 'Lembrete não encontrado' });

    const reminderPayload = sanitizeReminderInput(req.body);
    const times = (reminderPayload.times as string[]) || existing.times;
    const nextDue = computeNextDueFromTimes(times);

    const updated = await prisma.medicationReminder.update({
      where: { id },
      data: {
        medicationName: reminderPayload.medicationName as string,
        dosage: reminderPayload.dosage as string,
        times,
        startDate: (reminderPayload.startDate as Date) || existing.startDate,
        endDate:
          reminderPayload.endDate === undefined
            ? existing.endDate
            : ((reminderPayload.endDate as Date | null) ?? null),
        isActive:
          reminderPayload.isActive !== undefined
            ? Boolean(reminderPayload.isActive)
            : existing.isActive,
        notes:
          reminderPayload.notes !== undefined
            ? ((reminderPayload.notes as string | null) ?? null)
            : existing.notes,
        prescriptionId:
          reminderPayload.prescriptionId !== undefined
            ? ((reminderPayload.prescriptionId as string | null) ?? null)
            : existing.prescriptionId,
        nextDue,
        updatedAt: new Date(),
      },
    });

    const mapped = await mapReminderForApi(updated);
    SocketService.sendToUser(req.user!.userId, 'medicationRemindersUpdate', mapped);
    SocketService.sendToUser(req.user!.userId, 'medicationAdherenceUpdate', { refresh: true });
    res.json(mapped);
  } catch (error) {
    console.error('Erro ao atualizar lembrete:', error);
    res.status(500).json({ error: 'Erro ao atualizar lembrete' });
  }
});

router.patch('/medication-reminders/:id/toggle', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const existing = await prisma.medicationReminder.findFirst({
      where: { id, patientId: patient.id },
    });
    if (!existing) return res.status(404).json({ error: 'Lembrete não encontrado' });

    const updated = await prisma.medicationReminder.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
        nextDue: !existing.isActive
          ? computeNextDueFromTimes(existing.times)
          : existing.nextDue,
        updatedAt: new Date(),
      },
    });

    const mapped = await mapReminderForApi(updated);
    SocketService.sendToUser(req.user!.userId, 'medicationRemindersUpdate', mapped);
    SocketService.sendToUser(req.user!.userId, 'medicationAdherenceUpdate', { refresh: true });
    res.json(mapped);
  } catch (error) {
    console.error('Erro ao alternar lembrete:', error);
    res.status(500).json({ error: 'Erro ao alternar lembrete' });
  }
});

router.post('/medication-reminders/:id/take', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const mapped = await markReminderTaken(id, patient.id);
    SocketService.sendToUser(req.user!.userId, 'medicationRemindersUpdate', mapped);
    SocketService.sendToUser(req.user!.userId, 'medicationAdherenceUpdate', { refresh: true });
    SocketService.sendToUser(req.user!.userId, 'medicationLogsUpdate', { refresh: true });
    res.json(mapped);
  } catch (error: any) {
    console.error('Erro ao registrar dose:', error);
    res.status(error.message === 'Lembrete não encontrado' ? 404 : 500).json({
      error: error.message || 'Erro ao registrar dose',
    });
  }
});

router.delete('/medication-reminders/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const existing = await prisma.medicationReminder.findFirst({
      where: { id, patientId: patient.id },
    });
    if (!existing) return res.status(404).json({ error: 'Lembrete não encontrado' });

    await prisma.medicationReminder.delete({ where: { id } });

    SocketService.sendToUser(req.user!.userId, 'medicationRemindersUpdate', { id, deleted: true });
    SocketService.sendToUser(req.user!.userId, 'medicationAdherenceUpdate', { refresh: true });
    res.json({ message: 'Lembrete excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir lembrete:', error);
    res.status(500).json({ error: 'Erro ao excluir lembrete' });
  }
});

// Alertas de Prescrição (Medicamentos)
router.get('/prescription-alerts', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const filter = String(req.query.filter || 'all');
    const allowed = ['all', 'unread', 'high', 'critical'];
    const safeFilter = allowed.includes(filter)
      ? (filter as 'all' | 'unread' | 'high' | 'critical')
      : 'all';

    const data = await getPrescriptionAlerts(patient.id, safeFilter);
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar alertas de prescrição:', error);
    res.status(500).json({ error: 'Erro ao buscar alertas de prescrição' });
  }
});

router.patch('/prescription-alerts/:id/read', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const alert = await markPrescriptionAlertRead(patient.id, req.params.id);
    SocketService.sendToUser(req.user!.userId, 'prescriptionAlertsUpdate', alert);
    res.json(alert);
  } catch (error: any) {
    console.error('Erro ao marcar alerta como lido:', error);
    res.status(error.message === 'Alerta não encontrado' ? 404 : 500).json({
      error: error.message || 'Erro ao marcar alerta como lido',
    });
  }
});

router.patch('/prescription-alerts/:id/dismiss', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const alert = await dismissPrescriptionAlert(patient.id, req.params.id);
    SocketService.sendToUser(req.user!.userId, 'prescriptionAlertsUpdate', alert);
    res.json(alert);
  } catch (error: any) {
    console.error('Erro ao dispensar alerta:', error);
    res.status(error.message === 'Alerta não encontrado' ? 404 : 500).json({
      error: error.message || 'Erro ao dispensar alerta',
    });
  }
});

router.post('/prescription-alerts/mark-all-read', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const result = await markAllPrescriptionAlertsRead(patient.id);
    SocketService.sendToUser(req.user!.userId, 'prescriptionAlertsUpdate', { refresh: true });
    res.json(result);
  } catch (error) {
    console.error('Erro ao marcar todos os alertas:', error);
    res.status(500).json({ error: 'Erro ao marcar alertas como lidos' });
  }
});

// Relatório de Adesão (Minha Adesão)
router.get('/medication-adherence', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const periodParam = String(req.query.period || 'week');
    const period = periodParam === 'month' ? 'month' : 'week';

    const report = await getMedicationAdherenceReport(patient.id, period);
    res.json(report);
  } catch (error) {
    console.error('Erro ao buscar adesão:', error);
    res.status(500).json({ error: 'Erro ao buscar relatório de adesão' });
  }
});

// Calendário de Medicação
router.get('/medication-calendar', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const now = new Date();
    const year = parseInt(String(req.query.year || now.getFullYear()), 10);
    const month = parseInt(String(req.query.month || now.getMonth() + 1), 10);

    if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Parâmetros year e month inválidos' });
    }

    const calendar = await getMedicationCalendar(patient.id, year, month);
    res.json(calendar);
  } catch (error) {
    console.error('Erro ao buscar calendário de medicação:', error);
    res.status(500).json({ error: 'Erro ao buscar calendário de medicação' });
  }
});

// Logs de Medicação (Gamificação / Adesão / Calendário)
router.get('/medication-logs', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const logs = await prisma.medicationLog.findMany({
      where: {
        patientId: patient.id,
        ...(from || to
          ? {
              scheduledTime: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { scheduledTime: 'desc' },
    });

    res.json(
      logs.map((log) => ({
        ...log,
        scheduledTime: log.scheduledTime.toISOString(),
        takenTime: log.takenTime?.toISOString() ?? null,
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Erro ao buscar logs de medicação:', error);
    res.status(500).json({ error: 'Erro ao buscar logs de medicação' });
  }
});

router.post('/medication-logs', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const { medicationName, dosage, scheduledTime, status, notes } = req.body;
    if (!medicationName || !scheduledTime || !status) {
      return res.status(400).json({ error: 'Campos obrigatórios: medicationName, scheduledTime, status' });
    }
    if (!['taken', 'missed', 'skipped'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const result = await upsertMedicationLog(patient.id, {
      medicationName,
      dosage,
      scheduledTime,
      status,
      notes,
    });

    SocketService.sendToUser(req.user!.userId, 'medicationLogsUpdate', result);
    SocketService.sendToUser(req.user!.userId, 'medicationRemindersUpdate', { refresh: true });
    SocketService.sendToUser(req.user!.userId, 'prescriptionAlertsUpdate', { refresh: true });
    SocketService.sendToUser(req.user!.userId, 'medicationAdherenceUpdate', { refresh: true });

    res.status(200).json({
      ...result,
      scheduledTime: result.scheduledTime.toISOString(),
      takenTime: result.takenTime?.toISOString() ?? null,
    });
  } catch (error: any) {
    console.error('Erro ao salvar log de medicação:', error);
    res.status(400).json({ error: error.message || 'Erro ao salvar log de medicação' });
  }
});

// Exportar PDF
router.get('/export-pdf', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const buffer = await PatientReportService.generateMedicalRecordPDF(patient.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=prontuario-${patient.id.slice(0, 8)}.pdf`);
    res.send(buffer);
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    res.status(500).json({ error: 'Erro ao gerar PDF do prontuário' });
  }
});

// Alertas clínicos (aba Ferramentas de Saúde — PatientInsight, exceto prescrição)
router.get('/clinical-alerts', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    await aiInsightService.generatePatientInsights(userId);

    const rows = await prisma.patientInsight.findMany({
      where: {
        patientId: patient.id,
        isDismissed: false,
        OR: [{ category: null }, { category: { not: 'prescription_alert' } }],
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    });

    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1, critico: 4, alto: 3 };
    rows.sort(
      (a, b) =>
        (priorityOrder[b.priority?.toLowerCase() || ''] || 0) -
        (priorityOrder[a.priority?.toLowerCase() || ''] || 0)
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        description: r.description,
        priority: r.priority,
        category: r.category,
        actionable: r.actionable,
        isRead: r.isRead,
        isDismissed: r.isDismissed,
        metadata: r.metadata,
        metadataJson: r.metadataJson,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (error: any) {
    console.error('Erro ao buscar alertas clínicos:', error);
    res.status(500).json({ error: 'Erro ao buscar alertas clínicos' });
  }
});

// Insights de Saúde (Geração via IA Insight Service)
router.get('/insights', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;

    // 1. Obter insights gerados pelo motor de IA
    const insights = await aiInsightService.generatePatientInsights(userId);

    // 2. Buscar as métricas brutas para os gráficos (conforme lógica anterior adaptada)
    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: { User: { select: { name: true } } }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const { period = '30d' } = req.query as any;
    let startDate = new Date();
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    startDate.setDate(startDate.getDate() - (daysMap[String(period)] || 30));

    const logs = await prisma.healthLog.findMany({
      where: {
        patientId: patient.id,
        logDate: { gte: startDate }
      },
      orderBy: { logDate: 'asc' }
    });

    const metricsMap = new Map();
    
    // Helper to get default unit for type
    const getDefaultUnit = (type: string): string => {
      const units: Record<string, string> = {
        'WEIGHT': 'kg',
        'HEIGHT': 'm',
        'BMI': 'kg/m²',
        'HEART_RATE': 'bpm',
        'BPM': 'bpm',
        'BLOOD_PRESSURE': 'mmHg',
        'GLUCOSE': 'mg/dL',
        'SUGAR': 'mg/dL',
        'TEMPERATURE': '°C',
        'OXYGEN_SATURATION': '%',
        'SPO2': '%',
        'MOOD': '',
        'STEPS': 'passos',
        'SLEEP': 'h'
      };
      return units[type] || '';
    };

    logs.forEach(log => {
      let valueToUse: number;
      let typeToUse: string = log.type;
      
      // Handle BLOOD_PRESSURE JSON
      if (log.type === 'BLOOD_PRESSURE') {
        try {
          const parsed = typeof log.value === 'string' 
            ? JSON.parse(log.value) 
            : log.value;
          
          // For display, use systolic as main value, but create both if needed
          if (parsed.systolic) {
            valueToUse = parsed.systolic;
          } else {
            valueToUse = Number(log.value);
          }
        } catch (e) {
          valueToUse = Number(log.value);
        }
      } else {
        valueToUse = Number(log.value);
      }

      if (!metricsMap.has(typeToUse)) {
        metricsMap.set(typeToUse, {
          id: typeToUse.toLowerCase(),
          name: getMetricName(typeToUse),
          unit: log.unit || getDefaultUnit(typeToUse),
          history: []
        });
      }
      
      const metric = metricsMap.get(typeToUse);
      metric.history.push({ date: log.logDate.toISOString().split('T')[0], value: valueToUse });
      metric.value = valueToUse;
      metric.lastUpdate = log.logDate.toISOString();
    });

    const metrics = Array.from(metricsMap.values()).map(m => {
      const history = m.history;
      const latest = history[history.length - 1]?.value || 0;
      const previous = history.length > 1 ? history[history.length - 2]?.value : latest;
      let trend = 'stable';
      if (latest > previous) trend = 'up';
      else if (latest < previous) trend = 'down';

      // Calculate status based on metric type
      let status: 'excellent' | 'good' | 'warning' | 'critical' = 'good';
      const type = m.id.toLowerCase();
      
      if (type === 'heart_rate' || type === 'bpm') {
        if (latest >= 60 && latest <= 100) status = 'excellent';
        else if (latest >= 50 && latest <= 110) status = 'good';
        else status = 'warning';
      } else if (type === 'weight') {
        status = 'good';
      } else if (type === 'glucose' || type === 'blood_sugar' || type === 'sugar') {
        if (latest >= 70 && latest <= 99) status = 'excellent';
        else if (latest >= 60 && latest <= 140) status = 'good';
        else status = 'warning';
      } else if (type === 'temperature') {
        if (latest >= 36.1 && latest <= 37.2) status = 'excellent';
        else if (latest >= 35.5 && latest <= 37.8) status = 'good';
        else status = 'warning';
      } else if (type === 'oxygen_saturation' || type === 'spo2') {
        if (latest >= 95 && latest <= 100) status = 'excellent';
        else if (latest >= 90) status = 'good';
        else status = 'critical';
      } else if (type === 'blood_pressure') {
        // For blood pressure, we use systolic (latest is already systolic)
        if (latest >= 90 && latest <= 120) status = 'excellent';
        else if ((latest >= 80 && latest < 90) || (latest > 120 && latest <= 140)) status = 'good';
        else if (latest > 140 && latest <= 180) status = 'warning';
        else status = 'critical';
      }

      // Find the latest log ID for this metric type
      const logsForType = logs.filter(l => l.type.toLowerCase() === m.id);
      const latestLogForType = logsForType.sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())[0];

      return { 
        ...m, 
        trend, 
        status, 
        latestLogId: latestLogForType?.id 
      };
    });

    // 3. Score Combinado (Simplificado e Dinâmico)
    const baseScore = 40;
    const logBonus = Math.min(30, logs.length * 3);
    const metricsBonus = Math.min(30, metrics.length * 10);
    const dynamicOverall = logs.length > 0 ? Math.round(baseScore + logBonus + metricsBonus) : null;
    
    const healthScore = {
      overall: dynamicOverall,
      cardiovascular: 80,
      metabolic: 85,
      lifestyle: 70,
      preventive: 90
    };

    // 4. FASE 4 & 5: Plano de Ação Diário + Modo Ruim
    const isLowDay = aiInsightService.detectLowDay(logs);
    const weeklyNarrative = aiInsightService.generateWeeklyNarrative(logs, patient.User?.name || 'Paciente');
    const contextualMemory = aiInsightService.getContextualMemory(logs);

    // Adicionar memória contextual aos insights se existir
    if (contextualMemory) {
      insights.push({
        id: 'contextual_memory_dynamic',
        type: 'recommendation',
        title: 'Memória de Sucesso',
        description: contextualMemory,
        priority: 'high',
        category: 'mental_health',
        actionable: true,
        createdAt: new Date().toISOString()
      } as any);
    }

    const actionPlan = await aiInsightService.generateDailyActions({
      ...patient,
      healthLogs: logs
    }, isLowDay);

    res.json({
      healthScore,
      healthMetrics: metrics,
      insights,
      actionPlan,
      isLowDay,
      weeklyNarrative
    });

  } catch (error: any) {
    console.error('Erro detalhado ao gerar insights:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId
    });
    res.status(500).json({ error: 'Erro ao gerar insights de saúde', details: error.message });
  }
});

// Análise de Cronobiologia (Tendências de Horário)
router.get('/insights/chronobiology', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;

    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const chronobiology = await chronobiologyService.analyzePeakPerformance(patient.id);
    res.json(chronobiology || { message: 'Dados insuficientes para análise cronobiológica.', lowData: true });
  } catch (error) {
    console.error('Erro na rota de cronobiologia:', error);
    // Retorna 200 com mensagem de erro para não quebrar o dashboard
    res.json({ message: 'Análise cronobiológica temporariamente indisponível.', error: true });
  }
});

// Helper functions locais
function getMetricName(type: string): string {
  const names: Record<string, string> = {
    'WEIGHT': 'Peso',
    'HEIGHT': 'Altura',
    'BMI': 'IMC',
    'HEART_RATE': 'Frequência Cardíaca',
    'BPM': 'Frequência Cardíaca',
    'SYSTOLIC': 'Pressão Sistólica',
    'DIASTOLIC': 'Pressão Diastólica',
    'BLOOD_PRESSURE': 'Pressão Arterial',
    'GLUCOSE': 'Glicemia',
    'SUGAR': 'Glicemia',
    'MOOD': 'Humor',
    'STEPS': 'Passos',
    'SLEEP': 'Sono',
    'TEMPERATURE': 'Temperatura',
    'OXYGEN_SATURATION': 'Saturação de Oxigênio',
    'SPO2': 'Saturação de Oxigênio'
  };
  return names[type] || type;
}

function getMetricTarget(type: string): number | undefined {
  const targets: Record<string, number> = {
    'weight': 70,
    'bmi': 24.9,
    'systolic': 120,
    'glucose': 100,
    'sugar': 100,
    'steps': 10000,
    'sleep': 8,
    'temperature': 37,
    'oxygen_saturation': 98,
    'spo2': 98
  };
  return targets[type.toLowerCase()];
}

// Listar planos disponíveis
router.get('/plans', authenticate, async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });
    res.json({ data: plans });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar planos' });
  }
});

// Obter dados de indicação
router.get('/referral', authenticate, async (req, res) => {
  try {
    const patientUserId = (req.user as any).userId;
    let patient = await prisma.patient.findUnique({
      where: { userId: patientUserId }
    });

    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Se não tiver código, gerar e salvar
    if (!(patient as any).referralCode) {
      const user = await prisma.user.findUnique({ where: { id: patientUserId } });
      const baseCode = (user?.name?.split(' ')[0] || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const newCode = `${baseCode}${randomSuffix}`;

      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: { referralCode: newCode } as any
      });
    }

    res.json({
      referralCode: (patient as any).referralCode,
      referralCount: (patient as any).referralCount || 0,
      referralEarnings: (patient as any).referralEarnings || 0,
      loyaltyPoints: (patient as any).healthPoints || 0
    });
  } catch (error) {
    console.error('Erro ao obter dados de indicação:', error);
    res.status(500).json({ error: 'Erro ao processar dados de indicação' });
  }
});

// Validar cupom
router.get('/coupons/validate', authenticate, async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Código de cupom obrigatório' });
  }

  try {
    // Cast to any to access coupon model until prisma client is regenerated
    const coupon = await (prisma as any).coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ error: 'Cupom inválido ou inativo' });
    }

    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return res.status(400).json({ error: 'Cupom expirado' });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ error: 'Limite de uso do cupom atingido' });
    }

    res.json({ data: coupon });
  } catch (error) {
    console.error('Erro na validação do cupom:', error);
    res.status(500).json({ error: 'Erro ao validar cupom' });
  }
});

// Cobrança PIX — leitura / atualizar QR (Supabase + Prisma)
router.get('/payments/:chargeId', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const row = await getPaymentChargeForPatient(req.params.chargeId, userId!);
    if (!row) return res.status(404).json({ error: 'Cobrança não encontrada' });
    res.json({
      id: row.id,
      gatewayChargeId: row.gatewayChargeId,
      status: row.status,
      amount: row.amount,
      paymentMethod: row.paymentMethod,
      paymentDetails: {
        pixQrCode: row.pixQrCode,
        pixCopyPaste: row.pixCopyPaste,
        paymentUrl: row.paymentUrl,
        boletoLine: row.boletoLine,
      },
      expiresAt: row.expiresAt,
    });
  } catch (error) {
    console.error('Erro ao buscar cobrança:', error);
    res.status(500).json({ error: 'Erro ao buscar cobrança' });
  }
});

router.post('/payments/:chargeId/refresh-pix-qr', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const updated = await refreshPixQrForCharge(req.params.chargeId, userId!);
    if (!updated) return res.status(404).json({ error: 'Cobrança PIX não encontrada' });
    res.json({
      pixQrCode: updated.pixQrCode,
      pixCopyPaste: updated.pixCopyPaste,
    });
  } catch (error) {
    console.error('Erro ao atualizar QR PIX:', error);
    res.status(500).json({ error: 'Erro ao gerar QR Code' });
  }
});

router.post('/payments/:chargeId/confirm', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const updated = await confirmPaymentCharge(req.params.chargeId, userId!);
    if (!updated) return res.status(404).json({ error: 'Cobrança não encontrada' });

    if (updated.patientUserId) {
      SocketService.sendToUser(updated.patientUserId, 'paymentConfirmed', {
        chargeId: updated.id,
        status: 'PAID',
      });
    }

    res.json({
      success: true,
      status: updated.status,
      paidAt: updated.paidAt,
    });
  } catch (error: any) {
    console.error('Erro ao confirmar pagamento:', error);
    res.status(400).json({ error: error.message || 'Erro ao confirmar pagamento' });
  }
});

function groupPharmacyCartItems(cartItems: any[] = []) {
  const groups = new Map<string, any[]>();
  for (const item of cartItems) {
    if (item.type !== 'medication' && item.type !== 'pharmacy_quote') continue;
    const pharmacyId = item.partnerId;
    if (!pharmacyId) continue;
    if (!groups.has(pharmacyId)) groups.set(pharmacyId, []);
    groups.get(pharmacyId)!.push(item);
  }
  return groups;
}

// Finalizar Checkout (Processamento de Pedido)
router.post('/checkout', authenticate, authorize('PATIENT'), async (req, res, next) => {
  try {
    const { appointmentData, cartItems = [], paymentMethod, couponCode, totalPrice } = req.body;
    const userId = req.user?.userId;
    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: { User: { select: { name: true, email: true, phone: true } } },
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const patientUser = patient.User;
    if (!patientUser?.email) {
      return res.status(400).json({ error: 'Complete seu perfil (e-mail) antes de pagar' });
    }

    const amount = Number(totalPrice) || 0;
    if (amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido para pagamento' });
    }

    // Mapear método de pagamento do frontend para o gateway
    const methodMap: Record<string, 'PIX' | 'CREDIT_CARD' | 'BOLETO'> = {
      'pix':    'PIX',
      'credit': 'CREDIT_CARD',
      'boleto': 'BOLETO'
    };
    const gatewayMethod = methodMap[paymentMethod] || 'PIX';

    const pharmacyCartItems = (cartItems as any[]).filter(
      (i) => i.type === 'medication' || i.type === 'pharmacy_quote'
    );
    const hasPharmacyCart = pharmacyCartItems.length > 0;

    // Criar o agendamento como PENDING_PAYMENT (aguardando confirmação de pagamento)
    let createdAppointment: any = null;
    if (appointmentData) {
      const { partnerId, date, time, isOnline, availabilityRequestId } = appointmentData;

      createdAppointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          partnerId,
          dateTime: new Date(`${date}T${time}`),
          duration: 30,
          status: 'PENDING_PAYMENT',
          isOnline: !!isOnline,
          notes: `Aguardando pagamento via ${gatewayMethod}`,
          updatedAt: new Date(),
        },
        include: { Partner: { include: { User: { select: { name: true } } } } },
      });

      // Atualizar solicitação de disponibilidade original
      if (availabilityRequestId) {
        await prisma.availabilityRequest.update({
          where: { id: availabilityRequestId },
          data: { status: 'scheduled' } as any
        }).catch(err => console.error('Erro ao atualizar solicitação:', err));
      }
    }

    // Criar cobrança no gateway de pagamento
    const { paymentGateway } = await import('../services/payment-gateway.service.js');

    const description = appointmentData
      ? `Consulta com ${appointmentData.partnerName} - Docton Saúde`
      : hasPharmacyCart
        ? `Pedido de farmácia - Docton Saúde`
        : `Serviços de Saúde - Docton Saúde`;

    const externalReference = createdAppointment?.id
      ? `appointment_${createdAppointment.id}`
      : hasPharmacyCart
        ? `pharmacy_${patient.id}_${Date.now()}`
        : `order_${patient.id}_${Date.now()}`;

    // Pedidos de farmácia antes da cobrança (vinculados no PaymentCharge)
    const pharmacyOrders: any[] = [];
    if (hasPharmacyCart) {
      const groups = groupPharmacyCartItems(cartItems as any[]);
      for (const [pharmacyId, groupItems] of groups.entries()) {
        const orderTotal = groupItems.reduce(
          (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
          0
        );
        const itemsSummary = formatCartItemsSummary(groupItems);
        const patientAddress = [patient.address, patient.city, patient.state, patient.zipCode]
          .filter(Boolean)
          .join(', ');
        const deliveryPayload = encodeOrderDeliveryPayload(
          itemsSummary,
          patientAddress || undefined
        );

        const pharmacyRow = await prisma.pharmacy.findUnique({
          where: { id: pharmacyId },
          select: { commissionPercent: true },
        });
        const commissionRate = (pharmacyRow?.commissionPercent ?? 10) / 100;
        const commissionAmount =
          Math.round(orderTotal * commissionRate * 100) / 100;

        const order = await prisma.pharmacyOrder.create({
          data: {
            patientId: patient.id,
            pharmacyId,
            status: 'PENDING_PAYMENT',
            total: orderTotal,
            commissionAmount,
            paymentMethod: gatewayMethod,
            deliveryAddress: deliveryPayload.slice(0, 500),
            updatedAt: new Date(),
          },
        });
        pharmacyOrders.push({
          id: order.id,
          pharmacyId,
          pharmacyName: groupItems[0]?.partnerName,
          total: orderTotal,
          items: groupItems.map((i) => ({
            name: cartItemProductLabel(i),
            price: i.price,
            quantity: i.quantity || 1,
          })),
        });
      }
    }

    let charge = await paymentGateway.createCharge({
      amount,
      method: gatewayMethod,
      description,
      externalReference,
      customer: {
        name: patientUser.name || 'Paciente',
        email: patientUser.email,
        taxId: patient.cpf || undefined,
        phone: patientUser.phone || undefined,
      },
      installments: 1,
      dueDateDays: gatewayMethod === 'BOLETO' ? 3 : 1,
    });

    let paymentChargeId: string | null = null;
    try {
      const persisted = await persistPaymentCharge({
        charge,
        gatewayProvider: paymentGateway.providerName,
        externalReference,
        description,
        patientId: patient.id,
        patientUserId: userId!,
        appointmentId: createdAppointment?.id || null,
        couponCode: couponCode || null,
        metadata: {
          cartItems,
          couponCode,
          paymentMethod,
          pharmacyOrderIds: pharmacyOrders.map((o) => o.id),
        },
      });
      charge = persisted.charge;
      paymentChargeId = persisted.record.id;
    } catch (err: any) {
      console.warn('[Checkout] PaymentCharge não persistido:', err.message);
    }

    for (const order of pharmacyOrders) {
      try {
        await notifyPharmacyAboutOrder({
          pharmacyId: order.pharmacyId,
          orderId: order.id,
          total: order.total,
          status: 'PENDING_PAYMENT',
          paymentMethod: gatewayMethod,
        });
      } catch (notifyErr) {
        console.warn('[Checkout] Falha ao notificar farmácia:', notifyErr);
      }
    }

    // Ambiente mock: considerar pagamento concluído ao finalizar checkout (vitrine/carrinho)
    let paymentSettled = false;
    if (paymentChargeId && paymentGateway.providerName.includes('Mock')) {
      try {
        await confirmPaymentCharge(paymentChargeId, userId!);
        paymentSettled = true;
        for (const o of pharmacyOrders) {
          o.status = 'RECEIVED';
        }
      } catch (autoErr: any) {
        console.warn('[Checkout] Auto-confirmação mock:', autoErr.message);
      }
    }

    const hasConsultation =
      !!createdAppointment ||
      (cartItems as any[]).some((i) => i.type === 'consultation');

    const orderType =
      hasConsultation && hasPharmacyCart
        ? 'mixed'
        : hasPharmacyCart
          ? 'pharmacy'
          : 'consultation';

    const mappedAppointments = createdAppointment
      ? [
          {
            id: createdAppointment.id,
            date: appointmentData?.date,
            time: appointmentData?.time,
            partnerName:
              appointmentData?.partnerName ||
              createdAppointment.Partner?.User?.name ||
              createdAppointment.Partner?.name,
          },
        ]
      : [];

    // Resposta com dados para o frontend exibir o pagamento
    const responseData: any = {
      success: true,
      chargeId: charge.gatewayId,
      paymentChargeId,
      paymentSettled,
      status: paymentSettled ? 'PAID' : charge.status,
      method: gatewayMethod,
      amount,
      orderType,
      expiresAt: charge.expiresAt,
      appointments: mappedAppointments,
      pharmacyOrders,
      paymentDetails: {
        pixQrCode: charge.pixQrCode || null,
        pixCopyPaste: charge.pixCopyPaste || null,
        paymentUrl: charge.paymentUrl || null,
        boletoLine: charge.boletoLine || null,
      },
    };

    // Notificar parceiro via Socket.io (aguardando pagamento)
    if (createdAppointment?.partnerId) {
      const partner = await prisma.partner.findUnique({
        where: { id: createdAppointment.partnerId },
        select: { userId: true }
      });
      if (partner?.userId) {
        SocketService.sendToUser(partner.userId, 'appointmentUpdate', {
          appointmentId: createdAppointment.id,
          status: 'PENDING_PAYMENT'
        });
      }
    }

    return res.status(201).json(responseData);

  } catch (error: any) {
    console.error('[Checkout] Erro ao processar pedido:', error);
    // Se o erro foi no gateway, retornar mensagem amigável
    if (error.message?.includes('[PaymentGateway]')) {
      return res.status(502).json({
        error: 'Erro ao processar pagamento. Tente novamente ou escolha outro método.'
      });
    }
    next(error);
  }
});


// --- Pedidos diretos de farmácia (vitrine / carrinho) ---
router.get('/pharmacy/orders', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const orders = await prisma.pharmacyOrder.findMany({
      where: { patientId: patient.id },
      include: {
        Pharmacy: {
          select: { id: true, name: true, logo: true, address: true, phone: true },
        },
        PharmacyOrderItem: {
          include: { PharmacyProduct: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ordersForMeta = orders.map((o) => ({ id: o.id, pharmacyId: o.pharmacyId }));
    const charges = await prisma.paymentCharge.findMany({
      where: { patientId: patient.id, status: { in: ['PAID', 'PENDING'] } },
      select: { metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    const itemsFromCharges = buildItemsMapFromPaymentCharges(charges, ordersForMeta);

    res.json(
      orders.map((order) => {
        const itemsFromDb = order.PharmacyOrderItem.map((item) => ({
          id: item.id,
          name: item.PharmacyProduct?.name || 'Medicamento',
          quantity: item.quantity,
          price: item.price,
        }));
        const { itemsText } = decodeOrderDeliveryPayload(order.deliveryAddress);
        const summaryItems = parseSummaryLineItems(itemsText, order.id, order.total);
        const metaItems = itemsFromCharges.get(order.id);

        const resolvedItems =
          itemsFromDb.length > 0
            ? itemsFromDb
            : metaItems?.length
              ? metaItems.map((i) => ({
                  id: i.id,
                  name: i.product.name,
                  quantity: i.quantity,
                  price: i.price,
                }))
              : summaryItems.length
                ? summaryItems.map((i) => ({
                    id: i.id,
                    name: i.product.name,
                    quantity: i.quantity,
                    price: i.price,
                  }))
                : [{ id: `${order.id}-s`, name: 'Pedido de medicamentos', quantity: 1, price: order.total }];

        return {
          id: order.id,
          status: order.status,
          total: order.total,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
          deliverySummary: itemsText,
          pharmacy: order.Pharmacy
            ? {
                id: order.Pharmacy.id,
                name: order.Pharmacy.name,
                logo: order.Pharmacy.logo,
                address: order.Pharmacy.address,
                phone: order.Pharmacy.phone,
              }
            : null,
          items: resolvedItems,
        };
      })
    );
  } catch (error) {
    console.error('Erro ao listar pedidos de farmácia do paciente:', error);
    res.status(500).json({ error: 'Erro ao listar pedidos' });
  }
});

// --- NOVO: Motor de Cotações Farmácia Pro 2.0 ---

// Solicitar cotação de medicamento
router.post('/pharmacy/quotations', authenticate, authorize('PATIENT'), upload.single('prescription'), async (req, res) => {
  try {
    const { medicamentName, quantity, description, lat, lng, maxDistanceKm } = req.body;
    const userId = req.user?.userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    let imageUrl = null;
    if (req.file) {
      // Simulação de upload (em prod usaria o storageService)
      imageUrl = `https://storage.docton.com.br/prescriptions/${Date.now()}-${req.file.originalname}`;
    }

    const quotation = await prisma.quotationRequest.create({
      data: {
        patientId: patient.id,
        medicamentName,
        quantity: parseInt(quantity) || 1,
        description,
        imageUrl,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        maxDistanceKm: maxDistanceKm ? parseFloat(maxDistanceKm) : 10,
        status: 'OPEN'
      }
    });

    // Notificar farmácias próximas baseadas no raio de entrega de cada uma
    try {
      const pharmacies = await prisma.pharmacy.findMany({
        where: { isActive: true },
        include: { User: true }
      });

      for (const pharmacy of pharmacies) {
        // Verifica se o paciente está dentro do raio da farmácia
        let isWithinRange = true;
        if (lat && lng && pharmacy.lat && pharmacy.lng) {
          const distance = calculateDistanceKm(parseFloat(lat), parseFloat(lng), pharmacy.lat, pharmacy.lng);
          isWithinRange = distance <= (pharmacy.deliveryRadius || 10);
        }

        if (isWithinRange) {
          const pharmacyUsers = pharmacy.User || [];
          for (const pharmacyUser of pharmacyUsers) {
            await inAppNotificationService.createNotification({
              userId: pharmacyUser.id,
              type: 'SYSTEM',
              title: 'Nova Demanda de Medicamento!',
              message: `Um paciente solicitou cotação para: ${medicamentName}. Responda rápido para ganhar a venda!`,
              priority: 'high',
              link: '/pharmacy/dashboard'
            });
          }
        }
      }
    } catch (notifErr) {
      console.error('Erro ao notificar farmácias:', notifErr);
    }

    res.status(201).json({ success: true, quotation });
  } catch (error) {
    console.error('Erro ao criar cotação:', error);
    res.status(500).json({ error: 'Erro ao processar sua solicitação de cotação' });
  }
});

// Listar minhas cotações de farmácia
router.get('/pharmacy/quotations', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const paidQuotePairs: Array<{ quoteId: string; responseId?: string }> = [];
    try {
      const paidCharges = await prisma.paymentCharge.findMany({
        where: { patientUserId: userId, status: 'PAID' },
        select: { metadata: true },
        orderBy: { paidAt: 'desc' },
        take: 30,
      });
      for (const c of paidCharges) {
        const meta = c.metadata ? JSON.parse(c.metadata) : {};
        for (const item of meta.cartItems || []) {
          if (item.type === 'pharmacy_quote' && item.quoteId) {
            paidQuotePairs.push({ quoteId: item.quoteId, responseId: item.responseId });
          }
        }
      }
    } catch {
      /* metadata opcional */
    }
    const paidQuoteIds = new Set(paidQuotePairs.map((p) => p.quoteId));

    const quotations = await prisma.quotationRequest.findMany({
      where: { patientId: patient.id },
      include: {
        QuotationRequestItem: true,
        responses: {
          include: {
            pharmacy: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                logo: true,
                performanceScore: true,
                User: { select: { avatar: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(
      quotations.map((q) => {
        const responseCount = q.responses?.length || 0;
        const hasAccepted = (q.responses || []).some((r: any) => r.status === 'ACCEPTED');
        const wasPaidViaCheckout = paidQuoteIds.has(q.id);
        let displayStatus = q.status;
        if (q.status === 'CLOSED' || hasAccepted || wasPaidViaCheckout) displayStatus = 'CLOSED';
        else if (q.status === 'OPEN' && responseCount > 0) displayStatus = 'RESPONDED';
        else if (q.status === 'RESPONDED') displayStatus = 'RESPONDED';

        if (displayStatus === 'CLOSED' && q.status !== 'CLOSED') {
          const pair = paidQuotePairs.find((p) => p.quoteId === q.id);
          void prisma.quotationRequest
            .update({ where: { id: q.id }, data: { status: 'CLOSED', updatedAt: new Date() } })
            .catch(() => {});
          if (pair?.responseId) {
            void prisma.quotationResponse
              .update({ where: { id: pair.responseId }, data: { status: 'ACCEPTED' } })
              .catch(() => {});
          }
        } else if (displayStatus === 'RESPONDED' && q.status === 'OPEN') {
          void prisma.quotationRequest
            .update({ where: { id: q.id }, data: { status: 'RESPONDED', updatedAt: new Date() } })
            .catch(() => {});
        }

        return {
        ...q,
        items: (q.QuotationRequestItem || []).map((item) => ({
          id: item.id,
          name: item.name,
          dosage: item.dosage,
          form: item.form,
          quantity: item.quantity,
        })),
        displayStatus,
        responses: (q.responses || []).map((r: any) => ({
          ...r,
          pharmacy: r.pharmacy
            ? {
                name: r.pharmacy.name,
                address: r.pharmacy.address,
                phone: r.pharmacy.phone,
                logo: r.pharmacy.logo,
                User: r.pharmacy.User,
              }
            : null,
        })),
      };
      })
    );
  } catch (error) {
    console.error('Erro ao buscar cotações:', error);
    res.status(500).json({ error: 'Erro ao listar suas cotações' });
  }
});

// Aceitar Cotação / Simular Pagamento Farmácia Pro 2.0 (Fase 3)
router.post('/pharmacy/quotations/:id/accept', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params; // ID do QuotationResponse
    const { addressId } = req.body;
    const userId = req.user?.userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Buscar a resposta e a solicitação
    const response = await prisma.quotationResponse.findUnique({
      where: { id },
      include: { quotation: true }
    });

    if (!response || response.quotation.patientId !== patient.id) {
      return res.status(404).json({ error: 'Oferta não encontrada' });
    }

    // Atualiza a resposta para ACCEPTED
    await prisma.quotationResponse.update({
      where: { id },
      data: { status: 'ACCEPTED' }
    });

    // Atualiza o Request principal para CLOSED
    await prisma.quotationRequest.update({
      where: { id: response.quotationId },
      data: { status: 'CLOSED' }
    });

    // Notificar Farmácia da Venda/Entrega!
    const pharmacyUsers = await prisma.user.findMany({
      where: { pharmacyId: response.pharmacyId }
    });
    
    for (const pharmacyUser of pharmacyUsers) {
      await inAppNotificationService.createNotification({
        userId: pharmacyUser.id,
        type: 'SYSTEM',
        title: 'Nova Venda Concluída! 💰',
        message: `O paciente ${patient.userId} pagou o pedido de ${response.quotation.medicamentName}. Prepare o envio!`,
        priority: 'high',
        link: '/pharmacy/dashboard'
      });
    }

    res.json({ success: true, message: 'Pagamento confirmado e pedido enviado para a farmácia!' });
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    res.status(500).json({ error: 'Erro no pagamento in-app' });
  }
});

function mapPharmacyPromotionForPatient(p: any) {
  const ph = p.Pharmacy;
  return {
    id: p.id,
    pharmacyId: p.pharmacyId,
    title: p.title,
    description: p.description,
    originalPrice: p.originalPrice,
    promotionPrice: p.promotionPrice,
    imageUrl: p.imageUrl,
    startDate: p.startDate,
    endDate: p.endDate,
    isBoosted: p.isBoosted,
    isActive: p.isActive,
    createdAt: p.createdAt,
    pharmacy: ph
      ? {
          id: ph.id,
          name: ph.name,
          logo: ph.logo,
          coverImage: ph.coverImage || ph.logo,
          address: ph.address,
          city: ph.city,
          state: ph.state,
          lat: ph.lat,
          lng: ph.lng,
          phone: ph.phone,
        }
      : null,
  };
}

// Listar Vitrines/Promoções ativas (Supabase via Prisma)
router.get('/pharmacy/promotions', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const now = new Date();
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';

    const promotions = await prisma.pharmacyPromotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        Pharmacy: {
          isActive: true,
          isApproved: true,
          ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
        },
      },
      include: {
        Pharmacy: {
          select: {
            id: true,
            name: true,
            logo: true,
            coverImage: true,
            address: true,
            city: true,
            state: true,
            lat: true,
            lng: true,
            phone: true,
          },
        },
      },
      orderBy: [{ isBoosted: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    res.json(promotions.map(mapPharmacyPromotionForPatient));
  } catch (error) {
    console.error('Erro ao buscar vitrines:', error);
    res.status(500).json({ error: 'Erro ao buscar promoções locais', details: (error as Error).message });
  }
});

// Detalhe de uma promoção
router.get('/pharmacy/promotions/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const now = new Date();
    const promotion = await prisma.pharmacyPromotion.findFirst({
      where: {
        id: req.params.id,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        Pharmacy: {
          select: {
            id: true,
            name: true,
            logo: true,
            coverImage: true,
            address: true,
            city: true,
            state: true,
            lat: true,
            lng: true,
            phone: true,
          },
        },
      },
    });

    if (!promotion) {
      return res.status(404).json({ error: 'Oferta não encontrada ou expirada' });
    }

    res.json(mapPharmacyPromotionForPatient(promotion));
  } catch (error) {
    console.error('Erro ao buscar promoção:', error);
    res.status(500).json({ error: 'Erro ao buscar oferta', details: (error as Error).message });
  }
});

// Solicitar cotação a partir de uma vitrine (paciente)
router.post('/pharmacy/promotions/:id/request-quote', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { quantity = 1, notes } = req.body;
    const now = new Date();
    const userId = req.user?.userId;

    const patient = await prisma.patient.findUnique({
      where: { userId },
      select: { id: true, city: true, address: true },
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const promotion = await prisma.pharmacyPromotion.findFirst({
      where: {
        id: req.params.id,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: { Pharmacy: { include: { User: { select: { id: true } } } } },
    });

    if (!promotion?.Pharmacy) {
      return res.status(404).json({ error: 'Oferta não encontrada ou expirada' });
    }

    const qty = Math.max(1, parseInt(String(quantity), 10) || 1);
    const description = [
      `Oferta da vitrine: ${promotion.title}`,
      promotion.description || '',
      notes ? `Observação do paciente: ${notes}` : '',
      `Preço vitrine: R$ ${promotion.promotionPrice.toFixed(2)}`,
    ]
      .filter(Boolean)
      .join('\n');

    const quotation = await prisma.quotationRequest.create({
      data: {
        patientId: patient.id,
        medicamentName: promotion.title,
        quantity: qty,
        description,
        type: 'PROMOTION',
        status: 'OPEN',
        deliveryType: 'DELIVERY',
      },
    });

    for (const pharmacyUser of promotion.Pharmacy.User || []) {
      await inAppNotificationService.createNotification({
        userId: pharmacyUser.id,
        type: 'SYSTEM',
        title: 'Interesse em oferta da vitrine',
        message: `Um paciente solicitou cotação para "${promotion.title}" (vitrine).`,
        priority: 'high',
        link: '/pharmacy/dashboard',
        data: { promotionId: promotion.id, quotationId: quotation.id },
      });
    }

    res.status(201).json({ success: true, quotation });
  } catch (error) {
    console.error('Erro ao solicitar cotação da vitrine:', error);
    res.status(500).json({ error: 'Erro ao solicitar cotação', details: (error as Error).message });
  }
});

// --- Rotas de Gamificação (Missões e Conquistas) ---
router.get('/gamification', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    console.log('[GAMIFICATION] Step 1: Received request');
    const userId = req.user?.userId;
    const personId = req.user?.personId;
    console.log('[GAMIFICATION] Step 2: userId =', userId);
    
    const patient = await ensurePatient(userId, personId);
    console.log('[GAMIFICATION] Step 3: patient =', patient);

    // Obter ou criar desafios para o paciente
    console.log('[GAMIFICATION] Step 4: Querying patient challenges...');
    let patientChallenges = await prisma.patientChallenge.findMany({
      where: { patientId: patient.id },
      include: { Challenge: true },
      orderBy: [{ createdAt: 'desc' }]
    });
    console.log('[GAMIFICATION] Step 5: Found patientChallenges count:', patientChallenges.length);

    // Se não existir nenhum desafio, criar alguns padrões
    if (patientChallenges.length === 0) {
      console.log('[GAMIFICATION] Step 6: Creating default challenges...');
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
        console.log('[GAMIFICATION] Step 6a: Processing challenge type:', challengeData.type);
        let challenge = await prisma.challenge.findFirst({ 
          where: { type: challengeData.type } 
        });
        console.log('[GAMIFICATION] Step 6b: Existing challenge found?', !!challenge);
        
        if (!challenge) {
          console.log('[GAMIFICATION] Step 6c: Creating new challenge...');
          challenge = await prisma.challenge.create({ 
            data: { ...challengeData, isActive: true } 
          });
          console.log('[GAMIFICATION] Step 6d: Challenge created:', challenge.id);
        }

        console.log('[GAMIFICATION] Step 6e: Creating patient challenge...');
        await prisma.patientChallenge.create({
          data: {
            patientId: patient.id,
            challengeId: challenge.id,
            status: 'ACTIVE',
            progress: 0,
            startDate: new Date()
          }
        });
        console.log('[GAMIFICATION] Step 6f: Patient challenge created');
      }

      console.log('[GAMIFICATION] Step 7: Re-querying patient challenges...');
      patientChallenges = await prisma.patientChallenge.findMany({
        where: { patientId: patient.id },
        include: { Challenge: true },
        orderBy: [{ createdAt: 'desc' }]
      });
      console.log('[GAMIFICATION] Step 8: New patientChallenges count:', patientChallenges.length);
    }

    console.log('[GAMIFICATION] Step 9: Mapping missions...');
    const missions = patientChallenges.map(pc => ({
      id: pc.challengeId,
      title: pc.Challenge?.title,
      desc: pc.Challenge?.description,
      points: pc.Challenge?.points,
      done: pc.status === 'COMPLETED',
      icon: pc.Challenge?.icon || 'CheckCircle2',
      progress: pc.progress,
      target: pc.Challenge?.targetValue
    }));
    console.log('[GAMIFICATION] Step 10: Missions mapped:', missions);

    console.log('[GAMIFICATION] Step 11: Getting level info...');
    const levelInfo = getLevelInfo(patient.healthPoints || 0);
    console.log('[GAMIFICATION] Step 12: Level info:', levelInfo);
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

    console.log('[GAMIFICATION] Step 13: Sending data:', gamificationData);
    res.json(gamificationData);
  } catch (error) {
    console.error('[GAMIFICATION] FULL ERROR:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar missões e conquistas',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

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
      pointsEarned,
      alreadyDone,
      bonusStreak,
      longestStreak: updatedPatient.longestStreak
    });
  } catch (error) {
    console.error('Erro ao registrar check-in:', error);
    res.status(500).json({ error: 'Erro ao registrar check-in' });
  }
});

  // Rotas de Programas Corporativos
  router.get('/corporate-programs', authenticate, authorize('PATIENT'), async (req, res) => {
    try {
      // Fallback to mock data while we set up the full model!
      const mockPrograms = [
        {
          id: '1',
          company: 'TechCorp Inc.',
          title: 'Programa Saúde Tech',
          description: 'Desafios exclusivos para colaboradores da TechCorp com recompensas incríveis!',
          type: 'challenges',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          pointsReward: 500,
          isActive: true,
          requirements: ['Passos diários', 'Check-in semanal', 'Avaliações']
        },
        {
          id: '2',
          company: 'HealthPlus',
          title: 'Benefícios de Saúde Premium',
          description: 'Programa de wellness com descontos em exames e consultas.',
          type: 'wellness',
          startDate: '2026-03-01',
          endDate: '2026-09-01',
          pointsReward: 300,
          isActive: true
        },
        {
          id: '3',
          company: 'GreenLife',
          title: 'Equipe Verde Saudável',
          description: 'Desafios de equipe para promover hábitos saudáveis.',
          type: 'challenges',
          startDate: '2026-04-01',
          endDate: '2026-06-30',
          pointsReward: 1000,
          isActive: true
        }
      ];
      res.json(mockPrograms);
    } catch (err) {
      console.error('[Corporate Programs] Erro:', err);
      res.json([]);
    }
  });
  
  router.post('/corporate-programs/:programId/join', authenticate, authorize('PATIENT'), async (req, res) => {
    try {
      const { programId } = req.params;
      res.json({ success: true, message: 'Inscrito com sucesso!' });
    } catch (err) {
      console.error('[Corporate Programs Join] Erro:', err);
      res.status(500).json({ error: 'Erro ao se inscrever no programa' });
    }
  });

export default router;
