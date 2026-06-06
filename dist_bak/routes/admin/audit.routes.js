"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const router = (0, express_1.Router)();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN')];
/**
 * @route GET /api/admin/audit/logs
 */
router.get('/audit/logs', ...adminAuth, async (req, res) => {
    try {
        const { category, severity, q, page = '1', limit = '50' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (category)
            where.category = category;
        if (severity)
            where.severity = severity;
        if (q) {
            where.OR = [
                { userName: { contains: String(q), mode: 'insensitive' } },
                { action: { contains: String(q), mode: 'insensitive' } },
                { resource: { contains: String(q), mode: 'insensitive' } }
            ];
        }
        const [logs, total] = await Promise.all([
            prisma_js_1.default.auditLog.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma_js_1.default.auditLog.count({ where })
        ]);
        return res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    }
    catch (error) {
        res.json({ logs: [], total: 0 });
    }
});
/**
 * @route POST /api/admin/audit/logs/clear
 */
router.post('/audit/logs/clear', ...adminAuth, async (req, res) => {
    try {
        // Apenas admins master poderiam fazer isso em produção
        await prisma_js_1.default.auditLog.deleteMany({});
        return res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao limpar logs' });
    }
});
exports.default = router;
//# sourceMappingURL=audit.routes.js.map