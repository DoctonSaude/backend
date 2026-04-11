"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (_req, res) => {
    try {
        const items = await prisma_1.default.report.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json(items);
    }
    catch (error) {
        console.error('Erro ao listar relatórios:', error);
        return res.status(500).json({ error: 'Erro ao listar relatórios' });
    }
});
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { name, type, format, periodStart, periodEnd, createdBy } = req.body || {};
        if (!name || !type || !format || !periodStart || !periodEnd) {
            return res.status(400).json({ error: 'Parâmetros inválidos' });
        }
        const period = `${String(periodStart)} - ${String(periodEnd)}`;
        const report = await prisma_1.default.report.create({
            data: {
                name: String(name),
                type: String(type),
                format: String(format),
                status: 'READY',
                createdBy: String(createdBy || 'system'),
                period,
                size: '0 KB',
                downloads: 0,
            }
        });
        return res.status(201).json(report);
    }
    catch (error) {
        console.error('Erro ao criar relatório:', error);
        return res.status(500).json({ error: 'Erro ao criar relatório' });
    }
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.report.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Erro ao excluir relatório:', error);
        return res.status(500).json({ error: 'Erro ao excluir relatório' });
    }
});
router.patch('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const patch = req.body || {};
        const downloadsIncrement = patch?.downloads?.increment;
        const report = await prisma_1.default.report.update({
            where: { id },
            data: {
                downloads: typeof downloadsIncrement === 'number' ? { increment: downloadsIncrement } : undefined,
            }
        });
        return res.json(report);
    }
    catch (error) {
        console.error('Erro ao atualizar relatório:', error);
        return res.status(500).json({ error: 'Erro ao atualizar relatório' });
    }
});
exports.default = router;
//# sourceMappingURL=reports.routes.js.map