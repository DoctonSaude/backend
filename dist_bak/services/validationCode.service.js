"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationCodeService = void 0;
// @ts-nocheck
const prisma_1 = __importDefault(require("../lib/prisma"));
exports.validationCodeService = {
    getLogs: async (filters) => {
        const { partnerId, status, startDate, endDate, query, page = 1, pageSize = 10 } = filters;
        const p = parseInt(String(page), 10);
        const s = parseInt(String(pageSize), 10);
        const where = {};
        if (partnerId)
            where.partnerId = partnerId;
        if (status && status !== 'all')
            where.status = status;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate)
                where.timestamp.gte = new Date(startDate);
            if (endDate)
                where.timestamp.lte = new Date(endDate);
        }
        if (query) {
            where.OR = [
                { code: { contains: query, mode: 'insensitive' } },
                { partnerName: { contains: query, mode: 'insensitive' } },
                { patientName: { contains: query, mode: 'insensitive' } }
            ];
        }
        const [data, count] = await Promise.all([
            prisma_1.default.validationCodeLog.findMany({
                where,
                include: {
                    partner: { select: { name: true, user: { select: { avatar: true } } } },
                    patient: { select: { user: { select: { name: true, avatar: true } } } }
                },
                orderBy: { timestamp: 'desc' },
                skip: (p - 1) * s,
                take: s
            }),
            prisma_1.default.validationCodeLog.count({ where })
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
    getStats: async (filters) => {
        const { startDate, endDate, partnerId } = filters;
        const where = {};
        if (partnerId)
            where.partnerId = partnerId;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate)
                where.timestamp.gte = new Date(startDate);
            if (endDate)
                where.timestamp.lte = new Date(endDate);
        }
        const [total, valid, invalid, errorStatus] = await Promise.all([
            prisma_1.default.validationCodeLog.count({ where }),
            prisma_1.default.validationCodeLog.count({ where: { ...where, status: 'valid' } }),
            prisma_1.default.validationCodeLog.count({ where: { ...where, status: 'invalid' } }),
            prisma_1.default.validationCodeLog.count({ where: { ...where, status: 'error' } })
        ]);
        return { total, valid, invalid, errorStatus };
    },
    createLog: async (data) => {
        // Garantir que campos nulos de string sejam undefined para o Prisma se necessário, 
        // ou apenas passar o objeto limpo.
        const log = await prisma_1.default.validationCodeLog.create({
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
    updateLog: async (id, data) => {
        const updateData = { ...data };
        if (data.timestamp)
            updateData.timestamp = new Date(data.timestamp);
        const log = await prisma_1.default.validationCodeLog.update({
            where: { id },
            data: updateData
        });
        return log;
    },
    deleteLog: async (id) => {
        await prisma_1.default.validationCodeLog.delete({
            where: { id }
        });
        return true;
    }
};
exports.default = exports.validationCodeService;
//# sourceMappingURL=validationCode.service.js.map