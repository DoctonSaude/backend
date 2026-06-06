// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const DEFAULT_PERMISSIONS = {
    viewPersonalData: true,
    viewMedicalHistory: false,
    viewExams: false,
    viewPrescriptions: false,
    viewAnamnesis: false,
};

const permissionRequestSchema = z.object({
    appointmentId: z.string().optional(),
    patientId: z.string().optional(),
    professionalId: z.string().min(1),
    reason: z.string().min(1),
    permissions: z.record(z.boolean()).optional(),
    expirationDays: z.number().int().positive().optional(),
});

function parseJsonField<T>(value: unknown, fallback: T): T {
    if (value == null) return fallback;
    if (typeof value === 'object' && !Array.isArray(value)) return value as T;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as T;
        } catch {
            return fallback;
        }
    }
    return fallback;
}

function mapPermissionDto(record: any) {
    const partner = record.Partner;
    const professionalInfo = {
        name: 'Profissional',
        crm: '',
        specialty: '',
        institution: undefined as string | undefined,
        ...parseJsonField(record.professionalInfoJson, {}),
        ...parseJsonField(
            record.professionalInfo ? record.professionalInfo : null,
            {}
        ),
        ...(partner
            ? {
                name: partner.name || 'Profissional',
                crm: partner.crm || '',
                specialty: partner.specialty || '',
                institution: partner.institution || undefined,
            }
            : {}),
    };

    const permissions = {
        ...DEFAULT_PERMISSIONS,
        ...parseJsonField(record.permissionsJson, {}),
        ...parseJsonField(record.permissions ? record.permissions : null, {}),
    };

    let patientResponse: { approved: boolean; reason?: string; timestamp: string } | undefined;
    const parsedResponse = parseJsonField(record.patientResponseJson, null)
        ?? parseJsonField(record.patientResponse ? record.patientResponse : null, null);
    if (parsedResponse && typeof parsedResponse === 'object') {
        patientResponse = parsedResponse as typeof patientResponse;
    }

    return {
        id: record.id,
        patientId: record.patientId,
        professionalId: record.professionalId,
        appointmentId: record.appointmentId || '',
        status: record.status,
        requestedAt: record.requestedAt,
        respondedAt: record.respondedAt ?? undefined,
        expiresAt: record.expiresAt ?? undefined,
        reason: record.reason,
        permissions,
        professionalInfo,
        patientResponse,
    };
}

function mapNotificationDto(notification: any) {
    const data = parseJsonField(notification.dataJson, {} as Record<string, unknown>);
    return {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        permissionId: (data.permissionId as string) || '',
        professionalName: (data.professionalName as string) || '',
        createdAt: notification.createdAt,
        read: notification.read,
        urgent: notification.priority === 'high' || notification.priority === 'urgent',
    };
}

// Criar uma solicitação de permissão (usado pelo profissional)
router.post('/request', authenticate, async (req, res, next) => {
    try {
        const parsed = permissionRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: 'Parâmetros inválidos', issues: parsed.error.issues });
        }

        const { appointmentId, patientId, professionalId, reason, permissions, expirationDays } = parsed.data;

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

        const professionalName = professional.name || 'Profissional';

        const created = await prisma.medicalRecordPermission.create({
            data: {
                patientId: dbPatientId,
                professionalId,
                appointmentId: appointmentId || undefined,
                status: 'pending',
                reason,
                expiresAt,
                updatedAt: new Date(),
                permissionsJson: permissions || DEFAULT_PERMISSIONS,
                professionalInfoJson: {
                    name: professionalName,
                    crm: professional.crm || '',
                    specialty: professional.specialty || '',
                    institution: professional.institution || undefined,
                },
            },
            include: {
                Partner: {
                    select: { name: true, crm: true, specialty: true, institution: true },
                },
            },
        });

        const patient = await prisma.patient.findUnique({ where: { id: dbPatientId } });
        if (patient?.userId) {
            await prisma.notification.create({
                data: {
                    userId: patient.userId,
                    type: 'permission_request',
                    title: 'Solicitação de acesso ao prontuário',
                    message: `${professionalName} solicitou acesso ao seu prontuário.`,
                    dataJson: {
                        permissionId: created.id,
                        professionalId,
                        professionalName,
                    },
                    updatedAt: new Date(),
                },
            });
        }

        return res.status(201).json(mapPermissionDto(created));
    } catch (error) {
        next(error);
    }
});

// Buscar todas as permissões do paciente logado
router.get('/patient', authenticate, authorize('PATIENT'), async (req, res, next) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { userId: req.user?.userId },
        });

        if (!patient) {
            return res.status(404).json({ message: 'Paciente não encontrado' });
        }

        const permissions = await prisma.medicalRecordPermission.findMany({
            where: { patientId: patient.id },
            orderBy: { requestedAt: 'desc' },
            include: {
                Partner: {
                    select: { name: true, crm: true, specialty: true, institution: true },
                },
            },
        });

        res.json(permissions.map(mapPermissionDto));
    } catch (error) {
        next(error);
    }
});

// Responder a uma solicitação de permissão
router.post('/:id/respond', authenticate, authorize('PATIENT'), async (req, res, next) => {
    try {
        const { approved, reason } = req.body;
        const permissionId = req.params.id;

        const permission = await prisma.medicalRecordPermission.findUnique({
            where: { id: permissionId },
            include: { Patient: true, Partner: { select: { name: true, crm: true, specialty: true, institution: true } } },
        });

        if (!permission) {
            return res.status(404).json({ message: 'Solicitação não encontrada' });
        }

        if (permission.Patient.userId !== req.user?.userId) {
            return res.status(403).json({ message: 'Não autorizado' });
        }

        const patientResponsePayload = {
            approved: Boolean(approved),
            reason,
            timestamp: new Date().toISOString(),
        };

        const updatedPermission = await prisma.medicalRecordPermission.update({
            where: { id: permissionId },
            data: {
                status: approved ? 'approved' : 'denied',
                respondedAt: new Date(),
                updatedAt: new Date(),
                patientResponse: JSON.stringify(patientResponsePayload),
                patientResponseJson: patientResponsePayload,
                expiresAt: approved && !permission.expiresAt
                    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    : permission.expiresAt,
            },
            include: {
                Partner: {
                    select: { name: true, crm: true, specialty: true, institution: true },
                },
            },
        });

        await prisma.notification.create({
            data: {
                userId: req.user?.userId,
                type: approved ? 'permission_approved' : 'permission_denied',
                title: approved ? 'Acesso Autorizado' : 'Acesso Negado',
                message: approved
                    ? 'Você autorizou o acesso ao seu prontuário.'
                    : 'Você negou o acesso ao seu prontuário.',
                dataJson: { permissionId },
                updatedAt: new Date(),
            },
        });

        res.json(mapPermissionDto(updatedPermission));
    } catch (error) {
        next(error);
    }
});

// Revogar acesso
router.post('/:id/revoke', authenticate, authorize('PATIENT'), async (req, res, next) => {
    try {
        const { reason } = req.body;
        const permissionId = req.params.id;

        const permission = await prisma.medicalRecordPermission.findUnique({
            where: { id: permissionId },
            include: { Patient: true, Partner: { select: { name: true, crm: true, specialty: true, institution: true } } },
        });

        if (!permission) {
            return res.status(404).json({ message: 'Solicitação não encontrada' });
        }

        if (permission.Patient.userId !== req.user?.userId) {
            return res.status(403).json({ message: 'Não autorizado' });
        }

        const patientResponsePayload = {
            approved: false,
            reason: reason || 'Revogado pelo usuário',
            timestamp: new Date().toISOString(),
        };

        const updatedPermission = await prisma.medicalRecordPermission.update({
            where: { id: permissionId },
            data: {
                status: 'revoked',
                respondedAt: new Date(),
                updatedAt: new Date(),
                patientResponse: JSON.stringify(patientResponsePayload),
                patientResponseJson: patientResponsePayload,
            },
            include: {
                Partner: {
                    select: { name: true, crm: true, specialty: true, institution: true },
                },
            },
        });

        res.json(mapPermissionDto(updatedPermission));
    } catch (error) {
        next(error);
    }
});

// Buscar notificações de permissão
router.get('/notifications', authenticate, authorize('PATIENT'), async (req, res, next) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: req.user?.userId,
                type: { in: ['permission_request', 'permission_approved', 'permission_denied', 'permission_revoked'] },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(notifications.map(mapNotificationDto));
    } catch (error) {
        next(error);
    }
});

// Marcar notificação como lida
router.post('/notifications/:id/read', authenticate, authorize('PATIENT'), async (req, res, next) => {
    try {
        const notification = await prisma.notification.findFirst({
            where: { id: req.params.id, userId: req.user?.userId },
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notificação não encontrada' });
        }

        await prisma.notification.update({
            where: { id: req.params.id },
            data: { read: true, updatedAt: new Date() },
        });
        res.sendStatus(200);
    } catch (error) {
        next(error);
    }
});

// Buscar estatísticas de permissões
router.get('/patient/stats', authenticate, authorize('PATIENT'), async (req, res, next) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { userId: req.user?.userId },
        });

        if (!patient) {
            return res.status(404).json({ message: 'Paciente não encontrado' });
        }

        const permissions = await prisma.medicalRecordPermission.findMany({
            where: { patientId: patient.id },
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
            ).length,
        };

        res.json(stats);
    } catch (error) {
        next(error);
    }
});

export default router;
