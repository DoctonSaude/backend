"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// Registrar log de auditoria / atividade
router.post('/log', auth_1.authenticate, async (req, res, next) => {
    try {
        const { action, section, details, severity, category, status, resource, resourceId, additionalData } = req.body;
        const log = await prisma_1.default.auditLog.create({
            data: {
                timestamp: new Date(),
                userId: req.user?.userId || null,
                userName: req.user?.name || 'Usuário',
                userRole: req.user?.role || 'UNKNOWN',
                action: action || 'UNKNOWN_ACTION',
                resource: resource || section || 'INTERFACE',
                resourceId: resourceId || null,
                ipAddress: req.headers['x-forwarded-for'] || req.ip || '127.0.0.1',
                severity: severity || 'low',
                category: category || 'user-action',
                status: status || 'success',
                details: {
                    details,
                    ...additionalData
                },
            },
        });
        res.status(201).json(log);
    }
    catch (error) {
        next(error);
    }
});
// Listar logs do próprio usuário (para o "Prontuário" ou "Timeline")
router.get('/my-activities', auth_1.authenticate, async (req, res, next) => {
    try {
        const logs = await prisma_1.default.auditLog.findMany({
            where: {
                userId: req.user?.userId,
            },
            orderBy: {
                timestamp: 'desc',
            },
            take: 50,
        });
        res.json(logs);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=audit.routes.js.map