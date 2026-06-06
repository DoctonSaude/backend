// @ts-nocheck
import prisma from '../lib/prisma';

export interface ValidationCodeLogData {
    id?: string;
    code: string;
    status: string;
    timestamp?: Date | string;
    partnerId?: string | null;
    patientId?: string | null;
    appointmentId?: string | null;
    partnerName?: string | null;
    patientName?: string | null;
    errorMessage?: string | null;
}

export const validationCodeService = {
    getLogs: async (filters: any) => {
        const { partnerId, status, startDate, endDate, query, page = 1, pageSize = 10 } = filters;

        const p = parseInt(String(page), 10);
        const s = parseInt(String(pageSize), 10);

        const where: any = {};
        if (partnerId) where.partnerId = partnerId;
        if (status && status !== 'all') where.status = status;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) where.timestamp.lte = new Date(endDate);
        }
        if (query) {
            where.OR = [
                { code: { contains: query, mode: 'insensitive' } },
                { partnerName: { contains: query, mode: 'insensitive' } },
                { patientName: { contains: query, mode: 'insensitive' } }
            ];
        }

        const [data, count] = await Promise.all([
            prisma.validationCodeLog.findMany({
                where,
                include: {
                    partner: { select: { name: true, user: { select: { avatar: true } } } },
                    patient: { select: { user: { select: { name: true, avatar: true } } } }
                },
                orderBy: { timestamp: 'desc' },
                skip: (p - 1) * s,
                take: s
            }),
            prisma.validationCodeLog.count({ where })
        ]);

        return {
            logs: data,
            pagination: {
                total: count,
                page: p,
                pageSize: s,
                totalPages: Math.ceil(count / s)
            }
        };
    },

    getStats: async (filters: any) => {
        const { startDate, endDate, partnerId } = filters;

        const where: any = {};
        if (partnerId) where.partnerId = partnerId;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) where.timestamp.lte = new Date(endDate);
        }

        const [total, valid, invalid, errorStatus] = await Promise.all([
            prisma.validationCodeLog.count({ where }),
            prisma.validationCodeLog.count({ where: { ...where, status: 'valid' } }),
            prisma.validationCodeLog.count({ where: { ...where, status: 'invalid' } }),
            prisma.validationCodeLog.count({ where: { ...where, status: 'error' } })
        ]);

        return { total, valid, invalid, errorStatus };
    },

    createLog: async (data: ValidationCodeLogData) => {
        // Garantir que campos nulos de string sejam undefined para o Prisma se necessário, 
        // ou apenas passar o objeto limpo.
        const log = await prisma.validationCodeLog.create({
            data: {
                code: data.code,
                status: data.status,
                timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
                partnerId: data.partnerId || undefined,
                patientId: data.patientId || undefined,
                appointmentId: data.appointmentId || undefined,
                partnerName: data.partnerName || undefined,
                patientName: data.patientName || undefined,
                errorMessage: data.errorMessage || undefined
            }
        });
        return log;
    },

    updateLog: async (id: string, data: Partial<ValidationCodeLogData>) => {
        const updateData: any = { ...data };
        if (data.timestamp) updateData.timestamp = new Date(data.timestamp);

        const log = await prisma.validationCodeLog.update({
            where: { id },
            data: updateData
        });
        return log;
    },

    deleteLog: async (id: string) => {
        await prisma.validationCodeLog.delete({
            where: { id }
        });
        return true;
    }
};

export default validationCodeService;
