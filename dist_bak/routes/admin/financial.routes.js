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
 * @route GET /api/admin/finance/overview
 */
router.get('/finance/overview', ...adminAuth, async (req, res) => {
    try {
        const [pharmacyCommissions, platformTransactions] = await Promise.all([
            prisma_js_1.default.pharmacyOrder.aggregate({ where: { status: 'FINISHED' }, _sum: { commissionAmount: true } }),
            prisma_js_1.default.transaction.aggregate({ where: { type: 'INCOME', status: 'COMPLETED' }, _sum: { amount: true } })
        ]);
        const totalRevenue = (pharmacyCommissions._sum.commissionAmount || 0) + (platformTransactions._sum.amount || 0);
        const activeRequestsCount = await prisma_js_1.default.appointment.count({ where: { status: { in: ['PENDING', 'SCHEDULED', 'CONFIRMED'] } } });
        res.json({
            platformRevenue: totalRevenue,
            activeRequestsCount: activeRequestsCount,
            activeRequestsSum: totalRevenue * 0.15
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro no overview financeiro' });
    }
});
// --- Transfers (Repasses) ---
// Note: In legacy, this was an in-memory mock. Keeping the logic but structuring for future DB migration.
router.get('/transfers', ...adminAuth, async (req, res) => {
    // Simulação de busca
    return res.json({ items: [], total: 0, page: 1, pageSize: 10 });
});
router.post('/transfers', ...adminAuth, async (req, res) => {
    const body = req.body || {};
    return res.status(201).json({ id: Date.now().toString(), ...body });
});
// --- Prices ---
router.get('/prices', ...adminAuth, async (req, res) => {
    try {
        const prices = await prisma_js_1.default.servicePrice?.findMany() || [];
        return res.json(prices);
    }
    catch (error) {
        res.json([]);
    }
});
exports.default = router;
//# sourceMappingURL=financial.routes.js.map