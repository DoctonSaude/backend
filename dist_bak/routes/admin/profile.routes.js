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
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});
/**
 * @route GET /api/admin/profile
 */
router.get('/profile', auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma_js_1.default.user.findUnique({
            where: { id: userId },
            include: {
                admin: true
            }
        });
        if (!user)
            return res.status(404).json({ error: 'Usuário não encontrado' });
        const [totalUsers, activePartners] = await Promise.all([
            prisma_js_1.default.user.count(),
            prisma_js_1.default.partner.count({ where: { isApproved: true } })
        ]);
        const profile = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.jobTitle || 'Administrador',
            department: user.department || '',
            employeeId: user.admin?.id || 'ADM-' + user.id.slice(0, 4).toUpperCase(),
            joinDate: user.createdAt,
            lastLogin: new Date(),
            permissions: user.admin?.permissions || [],
            avatar: user.avatar,
            stats: {
                totalUsers,
                activePartners,
                uptime: '99.9%',
                adminSince: user.createdAt
            }
        };
        res.json(profile);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});
/**
 * @route PUT /api/admin/profile
 */
router.put('/profile', auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, phone, department, jobTitle, avatar } = req.body;
        const updated = await prisma_js_1.default.user.update({
            where: { id: userId },
            data: {
                name,
                phone,
                department,
                jobTitle,
                avatar
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
});
/**
 * @route POST /api/admin/profile/avatar
 */
router.post('/profile/avatar', auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN'), upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        // Lógica de upload já existente no storageService
        res.json({ success: true, message: 'Upload simulado com sucesso (configurar storageService)' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro no upload de avatar' });
    }
});
exports.default = router;
//# sourceMappingURL=profile.routes.js.map