import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const permissionRequestSchema = z.object({
    appointmentId: z.string().optional(),
    patientId: z.string().optional(),
    professionalId: z.string().min(1),
    reason: z.string().min(1),
    permissions: z.record(z.boolean()).optional(),
    expirationDays: z.number().int().positive().optional(),
});

// Criar uma solicitação de permissão (usado pelo profissional)
router.post('/request', authenticate, async (req, res, next) => {
    try {
        const parsed = permissionRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: 'Parâmetros inválidos', issues: parsed.error.issues });
        }

        const { appointmentId, patientId, professionalId, reason, permissions, expirationDays } = parsed.data;

        // Se o caller for paciente, permitir apenas pedir acesso em nome dele mesmo (MVP)
        // Caso seja parceiro/admin, segue.
        if (req.user?.role === 'PATIENT') {
            const patient = await prisma.patient.findUnique({ where: { userId: req.user?.userId } });
            if (!patient) return res.status(404).json({ message: 'Paciente não encontrado' });
            if (patientId && patientId !== patient.id) return res.status(403).json({ message: 'Não autorizado' });
        }

        const dbPatientId = patientId
            ? patientId
            : (await prisma.patient.findUnique({ where: { userId: req.user?.userId } }))?.id;

        if (!dbPatientId) {
            return res.status(400).json({ message: 'patientId é obrigatório quando não é possível inferir o paciente pelo token' });
        }

        const professional = await prisma.partner.findUnique({ where: { id: professionalId } });
        if (!professional) {
            return res.status(404).json({ message: 'Profissional não encontrado' });
        }

        const expiresAt = typeof expirationDays === 'number'
            ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
            : undefined;

        const created = await prisma.medicalRecordPermission.create({
            data: {
                patientId: dbPatientId,
                professionalId,
                appointmentId: appointmentId || undefined,
                status: 'pending',
                reason,
                expiresAt,
                permissionsJson: permissions || {
                    viewPersonalData: true,
                    viewMedicalHistory: false,
                    viewExams: false,
                    viewPrescriptions: false,
                    viewAnamnesis: false,
                },
                professionalInfoJson: {
                    name: professional.name || 'Profissional',
                    crm: professional.crm || '',
                    specialty: professional.specialty || '',
                    institution: professional.institution || undefined,
                }
            }
        });

        // Notificação para o paciente (in-app)
        const patient = await prisma.patient.findUnique({ where: { id: dbPatientId } });
        if (patient?.userId) {
            await prisma.notification.create({
                data: {
                    userId: patient.userId,
                    type: 'permission_request',
                    title: 'Solicitação de acesso ao prontuário',
                    message: `${professional.name || 'Um profissional'} solicitou acesso ao seu prontuário.`,
                    data: JSON.stringify({ permissionId: created.id, professionalId })
                }
            });
        }

        return res.status(201).json(created);
    } catch (error) {
        next(error);
    }
});

// Buscar todas as permissões do paciente logado
router.get('/patient', authenticate, async (req, res, next) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { userId: req.user?.userId }
        });

        if (!patient) {
            return res.status(404).json({ message: 'Paciente não encontrado' });
        }

        const permissions = await prisma.medicalRecordPermission.findMany({
            where: { patientId: patient.id },
            orderBy: { requestedAt: 'desc' }
        });

        res.json(permissions);
    } catch (error) {
        next(error);
    }
});

// Responder a uma solicitação de permissão
router.post('/:id/respond', authenticate, async (req, res, next) => {
    try {
        const { approved, reason } = req.body;
        const permissionId = req.params.id;

        const permission = await prisma.medicalRecordPermission.findUnique({
            where: { id: permissionId },
            include: { patient: true }
        });

        if (!permission) {
            return res.status(404).json({ message: 'Solicitação não encontrada' });
        }

        // Verificar se a permissão pertence ao paciente logado
        if (permission.patient.userId !== req.user?.userId) {
            return res.status(403).json({ message: 'Não autorizado' });
        }

        const updatedPermission = await prisma.medicalRecordPermission.update({
            where: { id: permissionId },
            data: {
                status: approved ? 'approved' : 'denied',
                respondedAt: new Date(),
                patientResponse: JSON.stringify({
                    approved,
                    reason,
                    timestamp: new Date().toISOString()
                }),
                // Se aprovado, definir expiração padrão de 30 dias se não houver uma
                expiresAt: approved && !permission.expiresAt
                    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    : permission.expiresAt
            }
        });

        // Criar uma notificação para o paciente sobre a ação dele (opcional, mas bom para o histórico)
        await prisma.notification.create({
            data: {
                userId: req.user?.userId,
                type: approved ? 'permission_approved' : 'permission_denied',
                title: approved ? 'Acesso Autorizado' : 'Acesso Negado',
                message: approved
                    ? `Você autorizou o acesso ao seu prontuário.`
                    : `Você negou o acesso ao seu prontuário.`,
                data: JSON.stringify({ permissionId })
            }
        });

        res.json(updatedPermission);
    } catch (error) {
        next(error);
    }
});

// Revogar acesso
router.post('/:id/revoke', authenticate, async (req, res, next) => {
    try {
        const { reason } = req.body;
        const permissionId = req.params.id;

        const permission = await prisma.medicalRecordPermission.findUnique({
            where: { id: permissionId },
            include: { patient: true }
        });

        if (!permission) {
            return res.status(404).json({ message: 'Solicitação não encontrada' });
        }

        if (permission.patient.userId !== req.user?.userId) {
            return res.status(403).json({ message: 'Não autorizado' });
        }

        const updatedPermission = await prisma.medicalRecordPermission.update({
            where: { id: permissionId },
            data: {
                status: 'revoked',
                respondedAt: new Date(),
                patientResponse: JSON.stringify({
                    approved: false,
                    reason: reason || 'Revogado pelo usuário',
                    timestamp: new Date().toISOString()
                })
            }
        });

        res.json(updatedPermission);
    } catch (error) {
        next(error);
    }
});

// Buscar notificações de permissão
router.get('/notifications', authenticate, async (req, res, next) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: req.user?.userId,
                type: { in: ['permission_request', 'permission_approved', 'permission_denied', 'permission_revoked'] }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(notifications);
    } catch (error) {
        next(error);
    }
});

// Marcar notificação como lida
router.post('/notifications/:id/read', authenticate, async (req, res, next) => {
    try {
        await prisma.notification.update({
            where: { id: req.params.id },
            data: { read: true }
        });
        res.sendStatus(200);
    } catch (error) {
        next(error);
    }
});

// Buscar estatísticas de permissões
router.get('/patient/stats', authenticate, async (req, res, next) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { userId: req.user?.userId }
        });

        if (!patient) {
            return res.status(404).json({ message: 'Paciente não encontrado' });
        }

        const permissions = await prisma.medicalRecordPermission.findMany({
            where: { patientId: patient.id }
        });

        const now = new Date();

        const stats = {
            total: permissions.length,
            pending: permissions.filter(p => p.status === 'pending').length,
            approved: permissions.filter(p => p.status === 'approved').length,
            denied: permissions.filter(p => p.status === 'denied').length,
            revoked: permissions.filter(p => p.status === 'revoked').length,
            active: permissions.filter(p =>
                p.status === 'approved' &&
                (!p.expiresAt || new Date(p.expiresAt) > now)
            ).length
        };

        res.json(stats);
    } catch (error) {
        next(error);
    }
});

export default router;
