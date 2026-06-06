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
 * @route GET /api/admin/reports
 */
router.get('/reports', ...adminAuth, async (req, res) => {
    try {
        const list = await prisma_js_1.default.report.findMany({ orderBy: { createdAt: 'desc' } });
        if (list.length === 0) {
            const creatorId = req.user?.userId || process.env.ADMIN_DEV_USER_ID || 'system';
            await prisma_js_1.default.report.createMany({
                data: [
                    { name: 'Relatório Mensal de Faturamento', type: 'financial', status: 'ready', format: 'PDF', size: '1.2MB', createdBy: creatorId },
                    { name: 'Base de Usuários Ativos', type: 'users', status: 'ready', format: 'CSV', size: '850KB', createdBy: creatorId },
                    { name: 'Performance de Parceiros', type: 'partners', status: 'processing', format: 'XLSX', size: '-', createdBy: creatorId }
                ]
            });
            return res.json(await prisma_js_1.default.report.findMany({ orderBy: { createdAt: 'desc' } }));
        }
        return res.json(list);
    }
    catch (error) {
        res.json([]);
    }
});
/**
 * @route POST /api/admin/reports/generate
 */
router.post('/reports/generate', ...adminAuth, async (req, res) => {
    const { type, filters } = req.body || {};
    try {
        const report = await prisma_js_1.default.report.create({
            data: {
                name: `Relatório de ${type || 'Sistema'} - ${new Date().toLocaleDateString('pt-BR')}`,
                type: type || 'general',
                status: 'processing',
                format: filters?.format || 'PDF',
                size: '-',
                createdBy: req.user?.userId || process.env.ADMIN_DEV_USER_ID || 'system'
            }
        });
        // Simulação de processamento assíncrono
        setTimeout(async () => {
            try {
                await prisma_js_1.default.report.update({
                    where: { id: report.id },
                    data: { status: 'ready', size: `${(Math.random() * 5 + 0.5).toFixed(1)}MB` }
                });
            }
            catch (err) {
                console.error('Simulated report generation error:', err);
            }
        }, 5000);
        return res.status(202).json(report);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao iniciar geração de relatório' });
    }
});
/**
 * @route GET /api/admin/reports/:id/download
 */
router.get('/reports/:id/download', ...adminAuth, async (req, res) => {
    try {
        const report = await prisma_js_1.default.report.findUnique({ where: { id: req.params.id } });
        if (!report || report.status !== 'ready')
            return res.status(404).json({ error: 'Arquivo não disponível' });
        // Mock download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${report.name}.${report.format.toLowerCase()}"`);
        return res.send(Buffer.from('Conteúdo simulado do relatório'));
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao baixar arquivo' });
    }
});
/**
 * @route DELETE /api/admin/reports/:id
 */
router.delete('/reports/:id', ...adminAuth, async (req, res) => {
    try {
        await prisma_js_1.default.report.delete({ where: { id: req.params.id } });
        return res.json({ success: true });
    }
    catch (error) {
        res.status(404).json({ error: 'Relatório não encontrado' });
    }
});
exports.default = router;
//# sourceMappingURL=reports.routes.js.map