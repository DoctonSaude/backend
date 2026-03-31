"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chronobiology_service_js_1 = require("../services/chronobiology.service.js");
const auth_js_1 = require("../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const inAppNotification_service_js_1 = __importDefault(require("../services/inAppNotification.service.js"));
const patient_report_service_js_1 = require("../services/patient-report.service.js");
const loyalty_service_js_1 = require("../services/loyalty.service.js");
const storage_service_js_1 = require("../services/storage.service.js");
const multer_1 = __importDefault(require("multer"));
const patient_schema_js_1 = require("../schemas/patient.schema.js");
const aiInsight_service_js_1 = require("../services/aiInsight.service.js");
const patient_service_js_1 = require("../services/patient.service.js");
const aiRecommendation_service_js_1 = require("../services/aiRecommendation.service.js"); // NOVO: Motor de IA Preditiva
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
// Helper para garantir que o registro de Patient exista para o usuário
const ensurePatient = async (userId, personId) => {
    // 1. Tentar encontrar por userId (mais confiável para novos registros)
    let patient = await prisma_js_1.default.patient.findUnique({
        where: { userId }
    });
    if (patient)
        return patient;
    // 2. Se não achou por userId, tentar por personId se disponível
    if (personId) {
        patient = await prisma_js_1.default.patient.findUnique({
            where: { personId }
        });
        if (patient)
            return patient;
    }
    // 3. Criar registro padrão se não existir (Resiliência)
    console.log(`[ensurePatient] Criando registro de paciente faltante para userId: ${userId}`);
    // Garantir que temos um personId se estiver faltando (opcional mas recomendado no schema)
    let targetPersonId = personId;
    if (!targetPersonId) {
        const user = await prisma_js_1.default.user.findUnique({
            where: { id: userId },
            select: { personId: true }
        });
        targetPersonId = user?.personId || undefined;
    }
    patient = await prisma_js_1.default.patient.create({
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
const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    }
    catch (error) {
        console.warn('[Validation Error]', error.errors || error);
        return res.status(400).json({ error: 'Erro de validação', details: error.errors });
    }
};
// Rota para logs de analytics do paciente
router.post('/analytics', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { event, properties } = req.body;
        await prisma_js_1.default.analyticsEvent.create({
            data: {
                event,
                propertiesJson: properties,
                userId: req.user?.userId,
                timestamp: new Date()
            }
        });
        res.status(201).json({ success: true });
    }
    catch (error) {
        console.error('[Analytics Error]', error);
        res.status(500).json({ error: 'Erro ao registrar evento' });
    }
});
// Rotas de Suporte para Pacientes
// Listar tickets de suporte do paciente
router.get('/support/tickets', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res, next) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const tickets = await prisma_js_1.default.supportTicket.findMany({
            where: { patientId: patient.id },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(tickets);
    }
    catch (error) {
        next(error);
    }
});
// Criar um novo ticket de suporte
router.post('/support/tickets', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { subject, message, category, priority } = req.body;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const newTicket = await prisma_js_1.default.supportTicket.create({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar ticket de suporte' });
    }
});
// Obter detalhes de um ticket
router.get('/support/tickets/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const ticket = await prisma_js_1.default.supportTicket.findFirst({
            where: { id, patientId: patient.id },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        if (!ticket)
            return res.status(404).json({ error: 'Ticket não encontrado' });
        res.json(ticket);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar ticket' });
    }
});
// Adicionar uma mensagem a um ticket
router.post('/support/tickets/:id/messages', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const ticket = await prisma_js_1.default.supportTicket.findFirst({
            where: { id, patientId: patient.id },
        });
        if (!ticket)
            return res.status(404).json({ error: 'Ticket não encontrado' });
        if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
            return res.status(403).json({ error: 'Não é possível adicionar mensagens a um ticket fechado ou resolvido.' });
        }
        const newMessage = await prisma_js_1.default.supportMessage.create({
            data: {
                ticketId: id,
                message,
                sender: 'PATIENT',
            },
        });
        await prisma_js_1.default.supportTicket.update({
            where: { id },
            data: { updatedAt: new Date(), status: 'OPEN' },
        });
        res.status(201).json(newMessage);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao adicionar mensagem' });
    }
});
// Avaliar um ticket de suporte
router.post('/support/tickets/:id/rating', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { rating } = req.body;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const ticket = await prisma_js_1.default.supportTicket.findFirst({
            where: { id, patientId: patient.id },
        });
        if (!ticket)
            return res.status(404).json({ error: 'Ticket não encontrado' });
        if (ticket.status !== 'RESOLVED') {
            return res.status(403).json({ error: 'Só é possível avaliar tickets resolvidos.' });
        }
        const updatedTicket = await prisma_js_1.default.supportTicket.update({
            where: { id },
            data: { rating: parseInt(rating, 10) },
        });
        res.json(updatedTicket);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao avaliar ticket' });
    }
});
// Dashboard Unificado do Paciente
router.get('/dashboard', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        try {
            const dashboardData = await patient_service_js_1.patientService.getDashboardData(userId);
            if (!dashboardData)
                return res.status(404).json({ error: 'Paciente não encontrado' });
            res.json(dashboardData);
        }
        catch (serviceErr) {
            const msg = serviceErr?.message ? String(serviceErr.message) : String(serviceErr);
            const code = serviceErr?.code;
            const dbUnavailable = process.env.NODE_ENV === 'production' &&
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
    }
    catch (error) {
        console.error('[Dashboard Error]', error);
        res.status(500).json({ error: 'Erro ao carregar dashboard' });
    }
});
// Dashboard consolidado via PatientService com Cache (Fase 3)
// Rotas de Agendamentos para Pacientes
// Listar agendamentos do paciente
router.get('/appointments', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const personId = req.user?.personId;
        const patient = await ensurePatient(userId, personId);
        const appointments = await prisma_js_1.default.appointment.findMany({
            where: { patientId: patient.id },
            include: {
                partner: {
                    include: {
                        user: { select: { name: true, avatar: true } }
                    }
                }
            },
            orderBy: { dateTime: 'desc' }
        });
        res.json(appointments);
    }
    catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
});
// Confirmar um agendamento
router.put('/appointments/:id/confirm', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const appointment = await prisma_js_1.default.appointment.findFirst({
            where: { id, patientId: patient.id }
        });
        if (!appointment)
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        const updated = await prisma_js_1.default.appointment.update({
            where: { id },
            data: { status: 'CONFIRMED' },
            include: { partner: { include: { user: true } } }
        });
        // Notificar o parceiro
        try {
            await inAppNotification_service_js_1.default.createNotification({
                userId: updated.partner.userId,
                type: 'SYSTEM',
                title: 'Consulta Confirmada',
                message: `O paciente confirmou o agendamento para ${new Date(updated.dateTime).toLocaleString('pt-BR')}.`,
                priority: 'medium',
                link: '/partner/agenda'
            });
        }
        catch (notifyErr) {
            console.error('Erro ao notificar parceiro sobre confirmação:', notifyErr);
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Erro ao confirmar agendamento:', error);
        res.status(500).json({ error: 'Erro ao confirmar agendamento' });
    }
});
// Cancelar um agendamento
router.put('/appointments/:id/cancel', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user?.userId;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const appointment = await prisma_js_1.default.appointment.findFirst({
            where: { id, patientId: patient.id }
        });
        if (!appointment)
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        const updated = await prisma_js_1.default.appointment.update({
            where: { id },
            data: { status: 'CANCELLED', notes: reason ? `Cancelado: ${reason}` : undefined },
            include: { partner: { include: { user: true } } }
        });
        // Notificar o parceiro
        try {
            await inAppNotification_service_js_1.default.createNotification({
                userId: updated.partner.userId,
                type: 'SYSTEM',
                title: 'Consulta Cancelada',
                message: `O paciente cancelou o agendamento de ${new Date(updated.dateTime).toLocaleString('pt-BR')}. Motivo: ${reason || 'Não informado'}.`,
                priority: 'high',
                link: '/partner/agenda'
            });
        }
        catch (notifyErr) {
            console.error('Erro ao notificar parceiro sobre cancelamento:', notifyErr);
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        res.status(500).json({ error: 'Erro ao cancelar agendamento' });
    }
});
// Reagendar um agendamento
router.put('/appointments/:id/reschedule', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { dateTime } = req.body;
        const userId = req.user?.userId;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const appointment = await prisma_js_1.default.appointment.findFirst({
            where: { id, patientId: patient.id }
        });
        if (!appointment)
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        const updated = await prisma_js_1.default.appointment.update({
            where: { id },
            data: {
                dateTime: new Date(dateTime),
                status: 'SCHEDULED', // Volta para agendado para o parceiro confirmar se quiser, ou mantém como solicitado
                notes: appointment.notes ? `${appointment.notes} | Solicitação de reagendamento para ${new Date(dateTime).toLocaleString('pt-BR')}` : `Solicitação de reagendamento para ${new Date(dateTime).toLocaleString('pt-BR')}`
            },
            include: { partner: { include: { user: true } } }
        });
        // Notificar o parceiro
        try {
            await inAppNotification_service_js_1.default.createNotification({
                userId: updated.partner.userId,
                type: 'SYSTEM',
                title: 'Solicitação de Reagendamento',
                message: `O paciente solicitou reagendar a consulta para ${new Date(updated.dateTime).toLocaleString('pt-BR')}.`,
                priority: 'medium',
                link: `/partner/agenda?id=${updated.id}`
            });
        }
        catch (notifyErr) {
            console.error('Erro ao notificar parceiro sobre reagendamento:', notifyErr);
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Erro ao reagendar agendamento:', error);
        res.status(500).json({ error: 'Erro ao reagendar agendamento' });
    }
});
// Avaliar um agendamento
router.post('/appointments/:id/rate', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user?.userId;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const appointment = await prisma_js_1.default.appointment.findFirst({
            where: { id, patientId: patient.id }
        });
        if (!appointment)
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        const review = await prisma_js_1.default.review.create({
            data: {
                appointmentId: id,
                partnerId: appointment.partnerId,
                rating: parseInt(rating, 10),
                comment: comment || '',
            }
        });
        // Atualizar média do parceiro
        const allReviews = await prisma_js_1.default.review.aggregate({
            where: { partnerId: appointment.partnerId },
            _avg: { rating: true },
            _count: { id: true }
        });
        await prisma_js_1.default.partner.update({
            where: { id: appointment.partnerId },
            data: {
                rating: allReviews._avg.rating || 0,
                totalReviews: allReviews._count.id || 0
            }
        });
        // Notificar o parceiro sobre a nova avaliação
        try {
            const partnerUser = await prisma_js_1.default.partner.findUnique({
                where: { id: appointment.partnerId },
                select: { userId: true }
            });
            if (partnerUser) {
                await inAppNotification_service_js_1.default.createNotification({
                    userId: partnerUser.userId,
                    type: 'SYSTEM',
                    title: 'Nova Avaliação Recebida',
                    message: `Você recebeu uma avaliação de ${rating} estrelas pelo seu atendimento.`,
                    priority: 'medium',
                    link: '/partner/dashboard'
                });
            }
        }
        catch (notifyErr) {
            console.error('Erro ao notificar parceiro sobre avaliação:', notifyErr);
        }
        // Award points for review
        loyalty_service_js_1.LoyaltyService.processReviewPoints(patient.id, review.id).catch(err => {
            console.error('Erro ao atribuir pontos por avaliação:', err);
        });
        res.status(201).json(review);
    }
    catch (error) {
        console.error('Erro ao avaliar agendamento:', error);
        res.status(500).json({ error: 'Erro ao avaliar agendamento' });
    }
});
// Rotas de Histórico de Saúde (HealthLog)
// Obter logs de saúde recentes
router.get('/health-logs', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const logs = await prisma_js_1.default.healthLog.findMany({
            where: { patientId: patient.id },
            orderBy: { logDate: 'desc' },
            take: 50
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar logs de saúde' });
    }
});
// Criar um novo log de saúde (Humor, BPM, etc)
router.post('/health-logs', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { type, value, unit, notes, logDate } = req.body;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const newLog = await prisma_js_1.default.healthLog.create({
            data: {
                patientId: patient.id,
                type,
                value: String(value),
                unit,
                notes,
                logDate: logDate ? new Date(logDate) : new Date()
            }
        });
        // Se for um log de humor, dar 5 pontos de XP (Gamificação)
        if (type === 'MOOD') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const existingMoodToday = await prisma_js_1.default.healthLog.findFirst({
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
                    await loyalty_service_js_1.LoyaltyService.awardPoints(patient.id, pointsToAward, 'streak_bonus', `Bônus de constância de ${patient.currentStreak + 1} dias!`);
                }
                else {
                    await loyalty_service_js_1.LoyaltyService.awardPoints(patient.id, pointsToAward, 'daily_checkin', 'Check-in de humor diário');
                }
            }
        }
        res.status(201).json(newLog);
    }
    catch (error) {
        console.error('Erro ao criar log de saúde:', error);
        res.status(500).json({ error: 'Erro ao salvar registro de saúde' });
    }
});
// Atualizar um log de saúde
router.put('/health-logs/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const { value, notes, logDate } = req.body;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const log = await prisma_js_1.default.healthLog.findFirst({
            where: { id, patientId: patient.id }
        });
        if (!log)
            return res.status(404).json({ error: 'Registro não encontrado' });
        const updatedLog = await prisma_js_1.default.healthLog.update({
            where: { id },
            data: {
                value: value ? String(value) : undefined,
                notes,
                logDate: logDate ? new Date(logDate) : undefined
            }
        });
        res.json(updatedLog);
    }
    catch (error) {
        console.error('Erro ao atualizar log de saúde:', error);
        res.status(500).json({ error: 'Erro ao atualizar registro de saúde' });
    }
});
// Excluir um log de saúde
router.delete('/health-logs/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const log = await prisma_js_1.default.healthLog.findFirst({
            where: { id, patientId: patient.id }
        });
        if (!log)
            return res.status(404).json({ error: 'Registro não encontrado' });
        await prisma_js_1.default.healthLog.delete({
            where: { id }
        });
        res.json({ message: 'Registro excluído com sucesso' });
    }
    catch (error) {
        console.error('Erro ao excluir log de saúde:', error);
        res.status(500).json({ error: 'Erro ao excluir registro de saúde' });
    }
});
// Rotas de Insights (Dicas da IA)
router.patch('/insights/:id/read', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        // Cast to any because Client is locked and not generated
        const updated = await prisma_js_1.default.patientInsight.update({
            where: { id, patientId: patient.id },
            data: { isRead: true }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Erro ao marcar insight como lido:', error);
        res.status(500).json({ error: 'Erro ao atualizar insight' });
    }
});
router.patch('/insights/:id/dismiss', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const updated = await prisma_js_1.default.patientInsight.update({
            where: { id, patientId: patient.id },
            data: { isDismissed: true }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao dispensar insight' });
    }
});
// Rotas de Foco do Dia (Tarefas Diárias)
// Listar tarefas de hoje
router.get('/daily-tasks', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tasks = await prisma_js_1.default.patientDailyTask.findMany({
            where: {
                patientId: patient.id,
                date: { gte: today }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(tasks);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar tarefas diárias' });
    }
});
// Listar dicas de saúde (Health Tips)
router.get('/health-tips', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const tips = await prisma_js_1.default.healthTip.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        res.json(tips);
    }
    catch (error) {
        console.error('Erro ao buscar dicas de saúde:', error);
        res.status(500).json({ error: 'Erro ao buscar dicas de saúde' });
    }
});
// Marcar tarefa como concluída e ganhar pontos
router.patch('/daily-tasks/:id/complete', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const task = await prisma_js_1.default.patientDailyTask.findFirst({
            where: { id, patientId: patient.id }
        });
        if (!task)
            return res.status(404).json({ error: 'Tarefa não encontrada' });
        if (task.completed)
            return res.status(400).json({ error: 'Tarefa já concluída' });
        const updatedTask = await prisma_js_1.default.patientDailyTask.update({
            where: { id },
            data: { completed: true }
        });
        // Premiar com XP e Pontos (Loyalty)
        await loyalty_service_js_1.LoyaltyService.awardPoints(patient.id, task.xp, 'daily_task_complete', `Tarefa concluída: ${task.task}`);
        res.json(updatedTask);
    }
    catch (error) {
        console.error('Erro ao concluir tarefa:', error);
        res.status(500).json({ error: 'Erro ao concluir tarefa' });
    }
});
// Criar tarefa personalizada
router.post('/daily-tasks', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { task, xp, icon } = req.body;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const newTask = await prisma_js_1.default.patientDailyTask.create({
            data: {
                patientId: patient.id,
                task,
                xp: xp || 50,
                icon: icon || '✅',
                date: new Date()
            }
        });
        res.status(201).json(newTask);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar tarefa personalizada' });
    }
});
// Excluir tarefa
router.delete('/daily-tasks/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        await prisma_js_1.default.patientDailyTask.deleteMany({
            where: { id, patientId: patient.id }
        });
        res.json({ message: 'Tarefa excluída com sucesso' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao excluir tarefa' });
    }
});
// Perfil do Paciente completo
router.get('/profile', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const personId = req.user?.personId;
        const patient = await ensurePatient(userId, personId);
        const profile = await prisma_js_1.default.patient.findUnique({
            where: { id: patient.id },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        avatar: true,
                        phone: true
                    }
                },
                subscriptions: {
                    include: { plan: true },
                    where: { status: 'ACTIVE' },
                    take: 1
                }
            }
        });
        if (!profile)
            return res.status(404).json({ error: 'Perfil não encontrado' });
        res.json(profile);
    }
    catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});
// Obter assinatura atual
router.get('/subscription', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const patient = await prisma_js_1.default.patient.findUnique({
            where: { userId },
            include: {
                subscriptions: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                    orderBy: { startedAt: 'desc' },
                    take: 1
                }
            }
        });
        if (!patient || !patient.subscriptions.length) {
            return res.status(404).json({ error: 'Nenhuma assinatura ativa encontrada' });
        }
        res.json(patient.subscriptions[0]);
    }
    catch (error) {
        console.error('Erro ao buscar assinatura:', error);
        res.status(500).json({ error: 'Erro ao buscar assinatura' });
    }
});
// Criar nova assinatura
router.post('/subscription', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), validate(patient_schema_js_1.SubscriptionSchema), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { planId, paymentMethod } = req.body;
        const patient = await prisma_js_1.default.patient.findUnique({
            where: { userId },
            include: { subscriptions: { where: { status: 'ACTIVE' } } }
        });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        // Cancelar assinaturas ativas anteriores se existirem
        if (patient.subscriptions.length > 0) {
            await prisma_js_1.default.subscription.updateMany({
                where: { patientId: patient.id, status: 'ACTIVE' },
                data: { status: 'CANCELLED', cancelledAt: new Date() }
            });
        }
        const subscription = await prisma_js_1.default.subscription.create({
            data: {
                patientId: patient.id,
                planId,
                paymentMethod,
                status: 'ACTIVE',
                startedAt: new Date()
            },
            include: { plan: true }
        });
        res.status(201).json(subscription);
    }
    catch (error) {
        console.error('Erro ao criar assinatura:', error);
        res.status(500).json({ error: 'Erro ao criar assinatura' });
    }
});
// Mudar plano
router.put('/subscription/change', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), validate(patient_schema_js_1.ChangePlanSchema), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { planId } = req.body;
        const patient = await prisma_js_1.default.patient.findUnique({
            where: { userId },
            include: { subscriptions: { where: { status: 'ACTIVE' } } }
        });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        // Cancelar ativa anterior
        await prisma_js_1.default.subscription.updateMany({
            where: { patientId: patient.id, status: 'ACTIVE' },
            data: { status: 'CANCELLED', cancelledAt: new Date() }
        });
        const subscription = await prisma_js_1.default.subscription.create({
            data: {
                patientId: patient.id,
                planId,
                paymentMethod: 'PLAN_CHANGE',
                status: 'ACTIVE',
                startedAt: new Date()
            },
            include: { plan: true }
        });
        res.json(subscription);
    }
    catch (error) {
        console.error('Erro ao mudar plano:', error);
        res.status(500).json({ error: 'Erro ao mudar plano' });
    }
});
// Cancelar assinatura
router.delete('/subscription', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        await prisma_js_1.default.subscription.updateMany({
            where: { patientId: patient.id, status: 'ACTIVE' },
            data: { status: 'CANCELLED', cancelledAt: new Date() }
        });
        res.json({ message: 'Assinatura cancelada com sucesso' });
    }
    catch (error) {
        console.error('Erro ao cancelar assinatura:', error);
        res.status(500).json({ error: 'Erro ao cancelar assinatura' });
    }
});
// Upload de Avatar
router.post('/profile/avatar', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        const publicUrl = await storage_service_js_1.storageService.uploadAvatar(req.file.buffer, req.file.originalname, req.file.mimetype);
        await prisma_js_1.default.user.update({
            where: { id: req.user?.userId },
            data: { avatar: publicUrl }
        });
        res.json({ avatar: publicUrl });
    }
    catch (error) {
        console.error('Erro ao fazer upload de avatar:', error);
        res.status(500).json({ error: 'Erro ao processar foto' });
    }
});
// Upload Genérico de Arquivos (Exames, Documentos)
router.post('/uploads', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        const folder = req.body.folder || 'others';
        // Validar pastas permitidas para organização
        const allowedFolders = ['exams', 'medical-records', 'documents', 'others'];
        const targetFolder = allowedFolders.includes(folder) ? folder : 'others';
        const publicUrl = await storage_service_js_1.storageService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, targetFolder);
        res.json({ url: publicUrl });
    }
    catch (error) {
        console.error('Erro no upload de arquivo:', error);
        res.status(500).json({ error: 'Erro ao processar upload' });
    }
});
router.put('/profile', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { name, email, phone, ...rawData } = req.body;
        const patientData = {};
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
        }
        const patient = await prisma_js_1.default.patient.findUnique({
            where: { userId: req.user?.userId }
        });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        // Transaction to update both Patient and User if necessary
        const [updatedPatient, updatedUser] = await prisma_js_1.default.$transaction([
            prisma_js_1.default.patient.update({
                where: { id: patient.id },
                data: patientData
            }),
            prisma_js_1.default.user.update({
                where: { id: req.user?.userId },
                data: {
                    name: name || undefined,
                    email: email || undefined,
                    phone: phone || undefined
                }
            })
        ]);
        res.json({ ...updatedPatient, user: updatedUser });
    }
    catch (error) {
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
router.get('/settings', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({
            where: { userId: req.user?.userId },
            select: { settings: true }
        });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        res.json(patient.settings || {});
    }
    catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});
// Atualizar configurações do paciente
router.put('/settings', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const settings = req.body;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        // Validate if settings is an object
        if (typeof settings !== 'object' || settings === null) {
            return res.status(400).json({ error: 'Formato de configurações inválido' });
        }
        const updatedPatient = await prisma_js_1.default.patient.update({
            where: { id: patient.id },
            data: { settings },
            select: { settings: true }
        });
        res.json(updatedPatient.settings);
    }
    catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});
// Finalizar Onboarding com "IA" Preditiva
router.post('/onboarding', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res, next) => {
    try {
        const { bloodType, allergies, chronicDiseases, currentMedications, lifestyle, healthGoals, weight, height, userIntent, // NOVO: ECONOMIA / RAPIDEZ / ETC
        userPriority // NOVO: PREÇO / TEMPO / ETC
         } = req.body;
        console.log('[ONBOARDING DEBUG] Recebido para processamento:', JSON.stringify(req.body));
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        // Lógica Preditiva (Simulação de ML Clustering)
        let archetype = 'Buscador de Bem-estar'; // Default
        const hasChronic = chronicDiseases && chronicDiseases.length > 0;
        const highIntensity = lifestyle?.activityLevel === 'athlete' || lifestyle?.activityLevel === 'active';
        const focusOnDisease = healthGoals?.includes('manage_condition');
        if (hasChronic || focusOnDisease) {
            archetype = 'Gestor de Saúde Ativo';
        }
        else if (highIntensity) {
            archetype = 'Focado em Performance';
        }
        else if (healthGoals?.includes('mental_health')) {
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
        if (weightValue)
            await prisma_js_1.default.healthLog.create({
                data: { patientId: patient.id, type: 'WEIGHT', value: String(weightValue), unit: 'kg', logDate: new Date() }
            });
        if (weightValue && heightValue) {
            const bmi = (weightValue / (heightValue * heightValue)).toFixed(1);
            await Promise.all([
                prisma_js_1.default.healthLog.create({
                    data: { patientId: patient.id, type: 'BMI', value: bmi, logDate: new Date() }
                }),
                prisma_js_1.default.healthLog.create({
                    data: { patientId: patient.id, type: 'HEIGHT', value: String(heightValue), unit: 'm', logDate: new Date() }
                })
            ]);
        }
        // Atualizar paciente - campos principais do onboarding (agora com alergias inclusas)
        const updatedPatient = await prisma_js_1.default.patient.update({
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
            await loyalty_service_js_1.LoyaltyService.awardPoints(patient.id, 500, 'onboarding_complete', 'Bônus de Boas-vindas Docton');
        }
        catch (loyaltyErr) {
            console.error('[ONBOARDING] Aviso: falha ao atribuir pontos de bônus:', loyaltyErr.message);
        }
        // Inicializar motor de IA baseado na intenção (NIVEL 1)
        try {
            if (userIntent) {
                await aiRecommendation_service_js_1.AIRecommendationService.updatePurchaseStats(req.user.userId, `Perfil: ${userIntent}` // Mark inicial de intenção
                );
            }
        }
        catch (aiErr) {
            console.error('[ONBOARDING] IA Warning: falha ao inicializar perfil preditivo:', aiErr.message);
        }
        return res.status(200).json({
            message: 'Onboarding concluído!',
            archetype,
            bonus: { points: 500, xp: 1000 },
            patient: updatedPatient
        });
    }
    catch (error) {
        next(error);
    }
});
// Rotas de Favoritos
router.get('/favorites', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const patient = await prisma_js_1.default.patient.findUnique({
            where: { userId }
        });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const favorites = await prisma_js_1.default.favoritePartner.findMany({
            where: { patientId: patient.id },
            select: { partnerId: true }
        });
        res.json(favorites.map(f => f.partnerId));
    }
    catch (error) {
        console.error('Erro ao buscar favoritos:', error);
        res.status(500).json({ error: 'Erro ao buscar favoritos' });
    }
});
router.post('/favorites/:partnerId/toggle', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const userId = req.user?.userId;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const existing = await prisma_js_1.default.favoritePartner.findUnique({
            where: {
                patientId_partnerId: {
                    patientId: patient.id,
                    partnerId
                }
            }
        });
        if (existing) {
            await prisma_js_1.default.favoritePartner.delete({
                where: { id: existing.id }
            });
            return res.json({ favorited: false });
        }
        else {
            await prisma_js_1.default.favoritePartner.create({
                data: {
                    patientId: patient.id,
                    partnerId
                }
            });
            return res.json({ favorited: true });
        }
    }
    catch (error) {
        console.error('Erro ao alternar favorito:', error);
        res.status(500).json({ error: 'Erro ao processar favorito' });
    }
});
// --- MÓDULO PRONTUÁRIO ---
// Listar Prontuários (Documentos Oficiais preenchidos por Profissionais)
router.get('/medical-records', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const records = await prisma_js_1.default.medicalRecord.findMany({
            where: { patientId: patient.id },
            include: {
                partner: {
                    include: { user: { select: { name: true } } }
                },
                appointment: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(records);
    }
    catch (error) {
        console.error('Erro ao buscar prontuários:', error);
        res.status(500).json({ error: 'Erro ao buscar prontuários' });
    }
});
// Detalhes de um Prontuário Específico
router.get('/medical-records/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const record = await prisma_js_1.default.medicalRecord.findFirst({
            where: { id, patientId: patient.id },
            include: {
                partner: {
                    include: { user: { select: { name: true } } }
                },
                appointment: true
            }
        });
        if (!record)
            return res.status(404).json({ error: 'Prontuário não encontrado' });
        res.json(record);
    }
    catch (error) {
        console.error('Erro ao buscar detalhes do prontuário:', error);
        res.status(500).json({ error: 'Erro ao buscar detalhes' });
    }
});
// Histórico Médico
router.get('/medical-history', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const history = await prisma_js_1.default.medicalHistory.findMany({
            where: { patientId: patient.id },
            orderBy: { date: 'desc' }
        });
        res.json(history);
    }
    catch (error) {
        console.error('Erro ao buscar histórico médico:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico médico' });
    }
});
router.post('/medical-history', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), validate(patient_schema_js_1.MedicalHistorySchema), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const { id, createdAt, updatedAt, patientId, ...data } = req.body;
        const newRecord = await prisma_js_1.default.medicalHistory.create({
            data: {
                ...data,
                patientId: patient.id,
                date: new Date(req.body.date)
            }
        });
        res.status(201).json(newRecord);
    }
    catch (error) {
        console.error('Erro ao criar histórico:', error);
        res.status(500).json({ error: 'Erro ao criar registro histórico' });
    }
});
router.put('/medical-history/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), validate(patient_schema_js_1.MedicalHistorySchema), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const { id: _, createdAt, updatedAt, patientId, ...data } = req.body;
        const updated = await prisma_js_1.default.medicalHistory.update({
            where: { id, patientId: patient.id },
            data: {
                ...data,
                date: req.body.date ? new Date(req.body.date) : undefined
            }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Erro ao atualizar histórico:', error);
        res.status(500).json({ error: 'Erro ao atualizar registro histórico' });
    }
});
router.delete('/medical-history/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        await prisma_js_1.default.medicalHistory.delete({
            where: { id, patientId: patient.id }
        });
        res.json({ message: 'Registro excluído com sucesso' });
    }
    catch (error) {
        console.error('Erro ao excluir registro histórico:', error);
        res.status(500).json({ error: 'Erro ao excluir registro histórico' });
    }
});
// Anamnese
router.get('/anamnesis', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const anamneses = await prisma_js_1.default.anamnesis.findMany({
            where: { patientId: patient.id },
            orderBy: { date: 'desc' }
        });
        res.json(anamneses);
    }
    catch (error) {
        console.error('Erro ao buscar anamnese:', error);
        res.status(500).json({ error: 'Erro ao buscar anamneses' });
    }
});
router.post('/anamnesis', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), validate(patient_schema_js_1.AnamnesisSchema), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const { id, createdAt, updatedAt, patientId, ...data } = req.body;
        const newRecord = await prisma_js_1.default.anamnesis.create({
            data: {
                ...data,
                patientId: patient.id,
                date: new Date(req.body.date)
            }
        });
        res.status(201).json(newRecord);
    }
    catch (error) {
        console.error('Erro ao salvar anamnese:', error);
        res.status(500).json({ error: 'Erro ao salvar anamnese' });
    }
});
router.put('/anamnesis/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), validate(patient_schema_js_1.AnamnesisSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const { id: _, createdAt, updatedAt, patientId, ...data } = req.body;
        const updated = await prisma_js_1.default.anamnesis.update({
            where: { id, patientId: patient.id },
            data: {
                ...data,
                date: req.body.date ? new Date(req.body.date) : undefined
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar anamnese' });
    }
});
router.delete('/anamnesis/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        await prisma_js_1.default.anamnesis.delete({
            where: { id, patientId: patient.id }
        });
        res.json({ message: 'Anamnese excluída com sucesso' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao excluir anamnese' });
    }
});
// Exames
router.get('/exams', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const exams = await prisma_js_1.default.healthExam.findMany({
            where: { patientId: patient.id },
            orderBy: { date: 'desc' }
        });
        res.json(exams);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar exames' });
    }
});
router.post('/exams', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), validate(patient_schema_js_1.HealthExamSchema), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const { id, createdAt, updatedAt, patientId, ...data } = req.body;
        const newRecord = await prisma_js_1.default.healthExam.create({
            data: {
                ...data,
                patientId: patient.id,
                date: new Date(req.body.date)
            }
        });
        res.status(201).json(newRecord);
    }
    catch (error) {
        console.error('Erro ao salvar exame:', error);
        res.status(500).json({ error: 'Erro ao salvar exame' });
    }
});
router.put('/exams/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), validate(patient_schema_js_1.HealthExamSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const { id: _, createdAt, updatedAt, patientId, ...data } = req.body;
        const updated = await prisma_js_1.default.healthExam.update({
            where: { id, patientId: patient.id },
            data: {
                ...data,
                date: req.body.date ? new Date(req.body.date) : undefined
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar exame' });
    }
});
router.delete('/exams/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        await prisma_js_1.default.healthExam.delete({
            where: { id, patientId: patient.id }
        });
        res.json({ message: 'Exame excluído com sucesso' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao excluir exame' });
    }
});
// Prescrições
router.get('/prescriptions', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const prescriptions = await prisma_js_1.default.prescription.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(prescriptions);
    }
    catch (error) {
        console.error('Erro ao buscar prescrições:', error);
        res.status(500).json({ error: 'Erro ao buscar prescrições' });
    }
});
router.post('/prescriptions', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), validate(patient_schema_js_1.PrescriptionSchema), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const { id, createdAt, updatedAt, patientId, ...data } = req.body;
        const newRecord = await prisma_js_1.default.prescription.create({
            data: {
                ...data,
                patientId: patient.id,
                startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
                endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
                date: req.body.date ? new Date(req.body.date) : new Date()
            }
        });
        // ANALISE DE IA PREDITIVA (RECOMPRA)
        try {
            await aiRecommendation_service_js_1.AIRecommendationService.analyzePrescription(patient.id, newRecord.id);
        }
        catch (aiErr) {
            console.error('[PRESCRIPTION IA] Warning: falha ao processar predição:', aiErr.message);
        }
        res.status(201).json(newRecord);
    }
    catch (error) {
        console.error('Erro ao salvar prescrição:', error);
        res.status(500).json({ error: 'Erro ao salvar prescrição' });
    }
});
router.put('/prescriptions/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), validate(patient_schema_js_1.PrescriptionSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const { id: _, createdAt, updatedAt, patientId, ...data } = req.body;
        const updated = await prisma_js_1.default.prescription.update({
            where: { id, patientId: patient.id },
            data: {
                ...data,
                startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
                endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
                date: req.body.date ? new Date(req.body.date) : undefined
            }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Erro ao atualizar prescrição:', error);
        res.status(500).json({ error: 'Erro ao atualizar prescrição' });
    }
});
router.delete('/prescriptions/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        await prisma_js_1.default.prescription.delete({
            where: { id, patientId: patient.id }
        });
        res.json({ message: 'Prescrição excluída com sucesso' });
    }
    catch (error) {
        console.error('Erro ao excluir prescrição:', error);
        res.status(500).json({ error: 'Erro ao excluir prescrição' });
    }
});
// Lembretes de Medicação
router.get('/medication-reminders', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const reminders = await prisma_js_1.default.medicationReminder.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reminders);
    }
    catch (error) {
        console.error('Erro ao buscar lembretes:', error);
        res.status(500).json({ error: 'Erro ao buscar lembretes' });
    }
});
router.post('/medication-reminders', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), validate(patient_schema_js_1.MedicationReminderSchema), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const { id, createdAt, updatedAt, patientId, ...data } = req.body;
        const newRecord = await prisma_js_1.default.medicationReminder.create({
            data: {
                ...data,
                patientId: patient.id
            }
        });
        res.status(201).json(newRecord);
    }
    catch (error) {
        console.error('Erro ao salvar lembrete:', error);
        res.status(500).json({ error: 'Erro ao salvar lembrete' });
    }
});
router.put('/medication-reminders/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), validate(patient_schema_js_1.MedicationReminderSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const { id: _, createdAt, updatedAt, patientId, ...data } = req.body;
        const updated = await prisma_js_1.default.medicationReminder.update({
            where: { id, patientId: patient.id },
            data
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Erro ao atualizar lembrete:', error);
        res.status(500).json({ error: 'Erro ao atualizar lembrete' });
    }
});
router.delete('/medication-reminders/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const { id } = req.params;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        await prisma_js_1.default.medicationReminder.delete({
            where: { id, patientId: patient.id }
        });
        res.json({ message: 'Lembrete excluído com sucesso' });
    }
    catch (error) {
        console.error('Erro ao excluir lembrete:', error);
        res.status(500).json({ error: 'Erro ao excluir lembrete' });
    }
});
// Logs de Medicação (Gamificação / Adesão)
router.get('/medication-logs', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const logs = await prisma_js_1.default.medicationLog.findMany({
            where: { patientId: patient.id },
            orderBy: { scheduledTime: 'desc' }
        });
        res.json(logs);
    }
    catch (error) {
        console.error('Erro ao buscar logs de medicação:', error);
        res.status(500).json({ error: 'Erro ao buscar logs de medicação' });
    }
});
router.post('/medication-logs', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const { medicationName, dosage, scheduledTime, status, notes } = req.body;
        // Check if log already exists for this exact medication and scheduled time
        const existingLog = await prisma_js_1.default.medicationLog.findFirst({
            where: {
                patientId: patient.id,
                medicationName,
                scheduledTime: new Date(scheduledTime)
            }
        });
        let result;
        if (existingLog) {
            result = await prisma_js_1.default.medicationLog.update({
                where: { id: existingLog.id },
                data: {
                    status,
                    takenTime: status === 'taken' ? new Date() : null,
                    notes
                }
            });
        }
        else {
            result = await prisma_js_1.default.medicationLog.create({
                data: {
                    patientId: patient.id,
                    medicationName,
                    dosage: dosage || '',
                    scheduledTime: new Date(scheduledTime),
                    status,
                    takenTime: status === 'taken' ? new Date() : null,
                    notes
                }
            });
        }
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Erro ao salvar log de medicação:', error);
        res.status(500).json({ error: 'Erro ao salvar log de medicação' });
    }
});
// Exportar PDF
router.get('/export-pdf', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId: req.user?.userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const buffer = await patient_report_service_js_1.PatientReportService.generateMedicalRecordPDF(patient.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=prontuario-${patient.id.slice(0, 8)}.pdf`);
        res.send(buffer);
    }
    catch (error) {
        console.error('Erro ao exportar PDF:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF do prontuário' });
    }
});
// Insights de Saúde (Geração via IA Insight Service)
router.get('/insights', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        // 1. Obter insights gerados pelo motor de IA
        const insights = await aiInsight_service_js_1.aiInsightService.generatePatientInsights(userId);
        // 2. Buscar as métricas brutas para os gráficos (conforme lógica anterior adaptada)
        const patient = await prisma_js_1.default.patient.findUnique({
            where: { userId },
            include: { user: { select: { name: true } } }
        });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const { period = '30d' } = req.query;
        let startDate = new Date();
        const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
        startDate.setDate(startDate.getDate() - (daysMap[String(period)] || 30));
        const logs = await prisma_js_1.default.healthLog.findMany({
            where: {
                patientId: patient.id,
                logDate: { gte: startDate }
            },
            orderBy: { logDate: 'asc' }
        });
        const metricsMap = new Map();
        logs.forEach(log => {
            if (!metricsMap.has(log.type)) {
                metricsMap.set(log.type, {
                    id: log.type.toLowerCase(),
                    name: getMetricName(log.type),
                    unit: log.unit,
                    history: []
                });
            }
            const metric = metricsMap.get(log.type);
            metric.history.push({ date: log.logDate.toISOString().split('T')[0], value: Number(log.value) });
            metric.value = Number(log.value);
            metric.lastUpdate = log.logDate.toISOString();
        });
        const metrics = Array.from(metricsMap.values()).map(m => {
            const history = m.history;
            const latest = history[history.length - 1]?.value || 0;
            const previous = history.length > 1 ? history[history.length - 2]?.value : latest;
            let trend = 'stable';
            if (latest > previous)
                trend = 'up';
            else if (latest < previous)
                trend = 'down';
            return { ...m, trend, status: 'good' };
        });
        // 3. Score Combinado (Simplificado)
        const healthScore = {
            overall: 75,
            cardiovascular: 80,
            metabolic: 85,
            lifestyle: 70,
            preventive: 90
        };
        // 4. FASE 4 & 5: Plano de Ação Diário + Modo Ruim
        const isLowDay = aiInsight_service_js_1.aiInsightService.detectLowDay(logs);
        const weeklyNarrative = aiInsight_service_js_1.aiInsightService.generateWeeklyNarrative(logs, patient.user.name);
        const contextualMemory = aiInsight_service_js_1.aiInsightService.getContextualMemory(logs);
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
            });
        }
        const actionPlan = aiInsight_service_js_1.aiInsightService.generateDailyActions({
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
    }
    catch (error) {
        console.error('Erro detalhado ao gerar insights:', {
            message: error.message,
            stack: error.stack,
            userId: req.user?.userId
        });
        res.status(500).json({ error: 'Erro ao gerar insights de saúde', details: error.message });
    }
});
// Análise de Cronobiologia (Tendências de Horário)
router.get('/insights/chronobiology', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const chronobiology = await chronobiology_service_js_1.chronobiologyService.analyzePeakPerformance(patient.id);
        res.json(chronobiology || { message: 'Dados insuficientes para análise cronobiológica.', lowData: true });
    }
    catch (error) {
        console.error('Erro na rota de cronobiologia:', error);
        // Retorna 200 com mensagem de erro para não quebrar o dashboard
        res.json({ message: 'Análise cronobiológica temporariamente indisponível.', error: true });
    }
});
// Helper functions locais
function getMetricName(type) {
    const names = {
        'WEIGHT': 'Peso',
        'HEIGHT': 'Altura',
        'BMI': 'IMC',
        'HEART_RATE': 'Frequência Cardíaca',
        'SYSTOLIC': 'Pressão Sistólica',
        'DIASTOLIC': 'Pressão Diastólica',
        'GLUCOSE': 'Glicemia',
        'MOOD': 'Humor',
        'STEPS': 'Passos',
        'SLEEP': 'Sono'
    };
    return names[type] || type;
}
function getMetricTarget(type) {
    const targets = {
        'weight': 70,
        'bmi': 24.9,
        'systolic': 120,
        'glucose': 100,
        'steps': 10000,
        'sleep': 8
    };
    return targets[type.toLowerCase()];
}
// Listar planos disponíveis
router.get('/plans', auth_js_1.authenticate, async (req, res) => {
    try {
        const plans = await prisma_js_1.default.plan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });
        res.json({ data: plans });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar planos' });
    }
});
// Obter dados de indicação
router.get('/referral', auth_js_1.authenticate, async (req, res) => {
    try {
        const patientUserId = req.user.userId;
        let patient = await prisma_js_1.default.patient.findUnique({
            where: { userId: patientUserId }
        });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        // Se não tiver código, gerar e salvar
        if (!patient.referralCode) {
            const user = await prisma_js_1.default.user.findUnique({ where: { id: patientUserId } });
            const baseCode = (user?.name?.split(' ')[0] || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
            const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const newCode = `${baseCode}${randomSuffix}`;
            patient = await prisma_js_1.default.patient.update({
                where: { id: patient.id },
                data: { referralCode: newCode }
            });
        }
        res.json({
            referralCode: patient.referralCode,
            referralCount: patient.referralCount || 0,
            referralEarnings: patient.referralEarnings || 0,
            loyaltyPoints: patient.healthPoints || 0
        });
    }
    catch (error) {
        console.error('Erro ao obter dados de indicação:', error);
        res.status(500).json({ error: 'Erro ao processar dados de indicação' });
    }
});
// Validar cupom
router.get('/coupons/validate', auth_js_1.authenticate, async (req, res) => {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Código de cupom obrigatório' });
    }
    try {
        // Cast to any to access coupon model until prisma client is regenerated
        const coupon = await prisma_js_1.default.coupon.findUnique({
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
    }
    catch (error) {
        console.error('Erro na validação do cupom:', error);
        res.status(500).json({ error: 'Erro ao validar cupom' });
    }
});
// Finalizar Checkout (Processamento de Pedido)
router.post('/checkout', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res, next) => {
    try {
        const { appointmentData, cartItems, paymentMethod, couponCode, totalPrice } = req.body;
        const userId = req.user?.userId;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const results = {
            appointments: [],
            transactions: []
        };
        // 1. Processar Agendamento Direto (vindo via Agendar/Solicitação)
        if (appointmentData) {
            const { partnerId, date, time, isOnline, availabilityRequestId } = appointmentData;
            const appointment = await prisma_js_1.default.appointment.create({
                data: {
                    patientId: patient.id,
                    partnerId,
                    dateTime: new Date(`${date}T${time}`),
                    duration: 30,
                    status: 'CONFIRMED',
                    isOnline: !!isOnline,
                    notes: `Agendado via Checkout | Pagamento: ${paymentMethod}`
                },
                include: { partner: { include: { user: { select: { name: true } } } } }
            });
            results.appointments.push(appointment);
            // Atualizar status da solicitação de disponibilidade original
            if (availabilityRequestId) {
                await prisma_js_1.default.availabilityRequest.update({
                    where: { id: availabilityRequestId },
                    data: { status: 'scheduled' } // Use type cast if status isn't updated in prisma schema yet
                }).catch(err => console.error('Erro ao atualizar solicitação:', err));
            }
            // Notificar o Parceiro
            try {
                const partner = await prisma_js_1.default.partner.findUnique({ where: { id: partnerId } });
                if (partner?.userId) {
                    await inAppNotification_service_js_1.default.createNotification({
                        userId: partner.userId,
                        type: 'SYSTEM',
                        title: 'Novo Agendamento Confirmado',
                        message: `Você tem um novo agendamento para ${new Date(date + 'T' + time).toLocaleString('pt-BR')}.`,
                        priority: 'high',
                        link: '/partner/agenda'
                    });
                }
            }
            catch (notifyErr) {
                console.error('Erro ao notificar parceiro:', notifyErr);
            }
        }
        // 2. Registrar a Transação Financeira
        const transaction = await prisma_js_1.default.transaction.create({
            data: {
                description: appointmentData ? `Pagamento Consulta: ${appointmentData.partnerName}` : 'Pagamento de Serviços',
                amount: Number(totalPrice) || 0,
                type: 'INCOME',
                category: 'Checkout',
                status: 'COMPLETED',
                patientId: patient.id,
                metadata: JSON.stringify({ paymentMethod, couponCode, appointmentData })
            }
        });
        results.transactions.push(transaction);
        res.status(201).json({ success: true, ...results });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=patient.routes.js.map