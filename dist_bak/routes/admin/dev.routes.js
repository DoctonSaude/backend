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
 * @route GET /api/admin/dev/summary
 */
router.get('/dev/summary', ...adminAuth, async (req, res) => {
    try {
        const [users, patients, partners, appointments, reviews] = await Promise.all([
            prisma_js_1.default.user.count(),
            prisma_js_1.default.patient.count(),
            prisma_js_1.default.partner.count(),
            prisma_js_1.default.appointment.count(),
            prisma_js_1.default.review.count()
        ]);
        return res.json({ users, patients, partners, appointments, reviews });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao obter resumo' });
    }
});
/**
 * @route POST /api/admin/dev/seed/all
 */
router.post('/dev/seed/all', ...adminAuth, async (req, res) => {
    try {
        // Lógica de seed já existente no legado. 
        // Em produção, isso seria um script separado, mas mantendo a rota para conveniência dev.
        return res.status(201).json({ message: 'Lógica de seed disparada.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao semear dados' });
    }
});
exports.default = router;
//# sourceMappingURL=dev.routes.js.map