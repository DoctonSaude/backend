"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const uuid_1 = require("uuid");
const multer_1 = __importDefault(require("multer"));
const finance_service_js_1 = require("../../services/finance.service.js");
const socket_js_1 = require("../../lib/socket.js");
const inAppNotification_service_js_1 = __importDefault(require("../../services/inAppNotification.service.js"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
/**
 * @route GET /api/partners/appointments
 */
router.get('/appointments', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { q, status, type, startDate, endDate } = req.query;
        const partner = await prisma_js_1.default.partner.findFirst({
            where: { userId },
            select: { id: true }
        });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const where = { partnerId: partner.id };
        if (q) {
            const term = String(q).toLowerCase();
            where.patient = { user: { name: { contains: term, mode: 'insensitive' } } };
        }
        if (status && status !== 'all')
            where.status = String(status);
        if (type && type !== 'all')
            where.isOnline = type === 'online';
        if (startDate || endDate) {
            where.dateTime = {};
            if (startDate)
                where.dateTime.gte = new Date(String(startDate));
            if (endDate) {
                const end = new Date(String(endDate));
                end.setHours(23, 59, 59, 999);
                where.dateTime.lte = end;
            }
        }
        const appointments = await prisma_js_1.default.appointment.findMany({
            where,
            include: {
                patient: { include: { user: { select: { name: true, email: true, avatar: true } } } },
                professional: true
            },
            orderBy: { dateTime: 'desc' }
        });
        return res.json(appointments);
    }
    catch (error) {
        console.error('Erro ao listar consultas:', error);
        return res.status(500).json({ error: 'Erro ao listar consultas' });
    }
});
/**
 * @route GET /api/partners/appointments/:id
 */
router.get('/appointments/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const appointment = await prisma_js_1.default.appointment.findFirst({
            where: { id, partnerId: partner.id },
            include: { patient: { include: { user: { select: { name: true, email: true, avatar: true } } } } }
        });
        if (!appointment)
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        return res.json(appointment);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar agendamento' });
    }
});
/**
 * @route POST /api/partners/appointments
 */
router.post('/appointments', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { patientName, patientId, dateTime, duration, isOnline, notes, professionalId, serviceId } = req.body;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        let finalPatientId = patientId;
        if (!finalPatientId && patientName) {
            const existingUser = await prisma_js_1.default.user.findFirst({
                where: { name: { contains: patientName, mode: 'insensitive' }, role: 'PATIENT' },
                include: { patient: true }
            });
            if (existingUser?.patient) {
                finalPatientId = existingUser.patient.id;
            }
            else {
                const newUserId = (0, uuid_1.v4)();
                const newUser = await prisma_js_1.default.user.create({
                    data: {
                        id: newUserId,
                        name: patientName,
                        email: `temp_${newUserId}@docton.com`,
                        password: (0, uuid_1.v4)(),
                        role: 'PATIENT'
                    }
                });
                const newPatient = await prisma_js_1.default.patient.create({
                    data: {
                        userId: newUser.id,
                        cpf: `000.${Math.floor(Math.random() * 999)}.${Math.floor(Math.random() * 999)}-${Math.floor(Math.random() * 99)}`,
                        birthDate: new Date('2000-01-01')
                    }
                });
                finalPatientId = newPatient.id;
            }
        }
        if (!finalPatientId)
            return res.status(400).json({ error: 'Paciente é obrigatório' });
        const appointment = await prisma_js_1.default.appointment.create({
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
                patient: { include: { user: { select: { name: true, email: true, avatar: true } } } },
                professional: true
            }
        });
        return res.status(201).json(appointment);
    }
    catch (error) {
        console.error('Erro ao criar agendamento:', error);
        return res.status(500).json({ error: 'Erro ao criar agendamento' });
    }
});
/**
 * @route PUT /api/partners/appointments/:id
 */
router.put('/appointments/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId || req.user.id;
        const { dateTime, duration, isOnline, notes, status, professionalId, serviceId } = req.body;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const appointment = await prisma_js_1.default.appointment.update({
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
                patient: { include: { user: { select: { name: true, email: true, avatar: true } } } },
                professional: true
            }
        });
        if (status === 'COMPLETED') {
            if (appointment.equipmentId) {
                try {
                    await prisma_js_1.default.equipment.update({
                        where: { id: appointment.equipmentId },
                        data: { useCount: { increment: 1 } }
                    });
                }
                catch (e) {
                    console.error('Erro Logística:', e);
                }
            }
            try {
                await finance_service_js_1.financeService.processAppointmentCompletion(appointment.id);
            }
            catch (e) {
                console.error('Erro Financeiro:', e);
            }
        }
        socket_js_1.SocketService.sendToUser(appointment.patientId, 'timelineUpdate', { type: 'appointment', id: appointment.id, status: appointment.status });
        return res.json(appointment);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar agendamento' });
    }
});
/**
 * @route DELETE /api/partners/appointments/:id
 */
router.delete('/appointments/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        await prisma_js_1.default.appointment.delete({ where: { id, partnerId: partner.id } });
        return res.status(204).send();
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao excluir agendamento' });
    }
});
/**
 * @route POST /api/partners/appointments/validate-code
 */
router.post('/appointments/validate-code', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { code, appointmentId } = req.body;
        const userId = req.user.userId || req.user.id;
        if (!code)
            return res.status(400).json({ error: 'Código é obrigatório' });
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true, name: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const searchCode = code.trim().toLowerCase();
        let appointment = null;
        if (appointmentId) {
            appointment = await prisma_js_1.default.appointment.findFirst({
                where: { id: appointmentId, partnerId: partner.id },
                include: { patient: { include: { user: { select: { name: true } } } } }
            });
            if (appointment) {
                if (appointment.status === 'COMPLETED')
                    return res.json({ valid: false, message: 'Já validado.' });
                const idLower = appointment.id.toLowerCase();
                if (!idLower.endsWith(searchCode) && idLower !== searchCode)
                    appointment = null;
            }
        }
        if (!appointment) {
            appointment = await prisma_js_1.default.appointment.findFirst({
                where: {
                    partnerId: partner.id,
                    status: { in: ['SCHEDULED', 'CONFIRMED', 'active'] },
                    id: { endsWith: searchCode, mode: 'insensitive' }
                },
                include: { patient: { include: { user: { select: { name: true } } } } }
            });
        }
        if (appointment) {
            await prisma_js_1.default.appointment.update({ where: { id: appointment.id }, data: { status: 'COMPLETED' } });
            if (appointment.equipmentId) {
                try {
                    await prisma_js_1.default.equipment.update({ where: { id: appointment.equipmentId }, data: { useCount: { increment: 1 } } });
                }
                catch (e) { }
            }
            try {
                await finance_service_js_1.financeService.processAppointmentCompletion(appointment.id);
            }
            catch (e) { }
            socket_js_1.SocketService.sendToUser(appointment.patient.userId, 'timelineUpdate', { type: 'appointment', id: appointment.id, status: 'COMPLETED' });
            try {
                await inAppNotification_service_js_1.default.createNotification({
                    userId: appointment.patient.userId,
                    type: 'SYSTEM',
                    title: 'Consulta Concluída',
                    message: `Sua consulta com ${partner.name} foi concluída.`,
                    priority: 'medium',
                    link: '/patient/agendamentos'
                });
            }
            catch (e) { }
            try {
                await prisma_js_1.default.validationCodeLog.create({
                    data: { code, status: 'valid', partnerId: partner.id, patientId: appointment.patientId, appointmentId: appointment.id, partnerName: partner.name, patientName: appointment.patient.user.name }
                });
            }
            catch (e) {
                console.error('Erro ao registrar log de validação:', e);
            }
            return res.json({ valid: true, patientName: appointment.patient.user.name, appointmentId: appointment.id });
        }
        return res.json({ valid: false, message: 'Código inválido ou já concluído.' });
    }
    catch (error) {
        console.error('Erro Validação:', error);
        return res.status(500).json({ error: 'Erro ao validar código' });
    }
});
/**
 * @route GET /api/partners/medical-records/:appointmentId
 */
router.get('/medical-records/:appointmentId', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const record = await prisma_js_1.default.medicalRecord.findUnique({
            where: { appointmentId },
            include: { patient: { include: { user: { select: { name: true, avatar: true } } } }, appointment: true }
        });
        if (!record)
            return res.status(404).json({ error: 'Prontuário não encontrado' });
        if (record.partnerId !== partner.id)
            return res.status(403).json({ error: 'Acesso negado' });
        return res.json(record);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar prontuário' });
    }
});
/**
 * @route PUT /api/partners/medical-records/:id
 */
router.put('/medical-records/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { diagnosis, symptoms, treatment, observations, attachments } = req.body;
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const record = await prisma_js_1.default.medicalRecord.update({
            where: { id, partnerId: partner.id },
            data: { diagnosis, symptoms, treatment, observations, attachments }
        });
        socket_js_1.SocketService.sendToUser(record.patientId, 'medicalHistoryUpdate', record);
        return res.json(record);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar prontuário' });
    }
});
exports.default = router;
//# sourceMappingURL=appointments.routes.js.map