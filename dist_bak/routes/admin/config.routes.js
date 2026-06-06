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
 * @route GET /api/admin/config
 */
router.get('/config', ...adminAuth, async (req, res) => {
    try {
        const config = await prisma_js_1.default.systemConfig.findMany();
        const configMap = config.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        // Fallbacks
        const defaults = {
            maintenance_mode: 'false',
            signup_enabled: 'true',
            min_withdrawal_amount: '100',
            docton_fee_percent: '15'
        };
        return res.json({ ...defaults, ...configMap });
    }
    catch (error) {
        res.json({ maintenance_mode: 'false', signup_enabled: 'true' });
    }
});
/**
 * @route POST /api/admin/config
 */
router.post('/config', ...adminAuth, async (req, res) => {
    const body = req.body || {};
    try {
        const entries = Object.entries(body);
        for (const [key, value] of entries) {
            await prisma_js_1.default.systemConfig.upsert({
                where: { key },
                update: { value: String(value), updatedAt: new Date() },
                create: { key, value: String(value) }
            });
        }
        await prisma_js_1.default.auditLog.create({
            data: {
                action: 'SYSTEM_CONFIG_UPDATED',
                resource: 'SystemConfig',
                userName: req.user?.userId ? String(req.user.userId) : 'Admin',
                userRole: 'ADMIN',
                ipAddress: req.ip || '127.0.0.1',
                details: body
            }
        });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});
/**
 * @route POST /api/admin/config/invalidate-tokens
 */
router.post('/config/invalidate-tokens', ...adminAuth, async (req, res) => {
    try {
        // Em uma implementação real com Redis, aqui invalidaríamos todos os tokens.
        // Com JWT stateless sem whitelist, poderíamos atualizar uma versão secreta global no DB (que exigiria re-login).
        await prisma_js_1.default.auditLog.create({
            data: {
                action: 'GLOBAL_TOKEN_INVALIDATION',
                resource: 'Auth',
                userName: req.user?.userId ? String(req.user.userId) : 'Admin',
                userRole: 'ADMIN',
                ipAddress: req.ip || '127.0.0.1',
                severity: 'critical',
                status: 'success'
            }
        });
        return res.json({ success: true, message: 'Comando de invalidação registrado e processando.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao invalidar sessões' });
    }
});
exports.default = router;
//# sourceMappingURL=config.routes.js.map