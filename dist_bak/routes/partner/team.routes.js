"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const multer_1 = __importDefault(require("multer"));
const storage_service_js_1 = require("../../services/storage.service.js");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
/**
 * @route GET /api/partners/team
 */
router.get('/team', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const team = await prisma_js_1.default.teamMember.findMany({
            where: { partnerId: partner.id },
            orderBy: { name: 'asc' }
        });
        res.json({ data: team });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar equipe' });
    }
});
/**
 * @route POST /api/partners/team
 */
router.post('/team', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId }, select: { id: true } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const { name, specialty, crm, email, phone } = req.body;
        const member = await prisma_js_1.default.teamMember.create({
            data: { partnerId: partner.id, name, specialty, crm, email, phone }
        });
        res.status(201).json(member);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar membro' });
    }
});
/**
 * @route POST /api/partners/team/:id/avatar
 */
router.post('/team/:id/avatar', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId }, select: { id: true } });
        if (!partner || !req.file)
            return res.status(400).json({ error: 'Dados inválidos' });
        const publicUrl = await storage_service_js_1.storageService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'avatars');
        const updated = await prisma_js_1.default.teamMember.update({
            where: { id: req.params.id, partnerId: partner.id },
            data: { avatar: publicUrl }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro no upload' });
    }
});
exports.default = router;
//# sourceMappingURL=team.routes.js.map