"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
 * @route POST /api/partners/public-profile/photo
 */
router.post('/public-profile/photo', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), upload.single('photo'), async (req, res) => {
    try {
        res.setHeader('X-Backend-Version', '2026.04.09.v6-modular');
        const userId = req.user.userId || req.user.id;
        let fileBuffer = null;
        let fileName = '';
        let mimeType = '';
        if (req.file) {
            fileBuffer = req.file.buffer;
            fileName = req.file.originalname;
            mimeType = req.file.mimetype;
        }
        else if (req.body.photo && typeof req.body.photo === 'string' && req.body.photo.includes('base64')) {
            const base64Data = req.body.photo.split(';base64,').pop();
            fileBuffer = Buffer.from(base64Data, 'base64');
            fileName = `profile_${userId}_${Date.now()}.png`;
            mimeType = 'image/png';
        }
        if (!fileBuffer) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        const publicUrl = await storage_service_js_1.storageService.uploadAvatar(fileBuffer, fileName, mimeType);
        await Promise.allSettled([
            prisma_js_1.default.user.update({ where: { id: userId }, data: { avatar: publicUrl } }),
            prisma_js_1.default.partner.upsert({
                where: { userId },
                update: { photo: publicUrl },
                create: { userId, photo: publicUrl, tenantId: req.user.tenantId || null }
            })
        ]);
        return res.json({ photo: publicUrl, success: true });
    }
    catch (error) {
        console.error('[PhotoUpload Modular] Error:', error);
        return res.status(500).json({ error: 'Erro no upload', details: error.message });
    }
});
/**
 * @route GET /api/partners/profile
 */
router.get('/profile', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({
            where: { userId },
            include: { user: true }
        });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        // FASE 6 (Modular): Resposta completa para evitar erros no frontend
        res.json({
            id: partner.id,
            user: partner.user ? {
                id: partner.user.id,
                name: partner.user.name || '',
                email: partner.user.email || '',
                avatar: partner.user.avatar || '',
            } : { id: '', name: '', email: '', avatar: '' },
            name: partner.name || partner.user?.name || '',
            specialty: partner.specialty || '',
            specialties: partner.specialties || [],
            crm: partner.crm || '',
            cnpj: partner.cnpj || '',
            phone: partner.phone || '',
            description: partner.description || partner.about || '',
            address: partner.address || '',
            city: partner.city || '',
            state: partner.state || '',
            zipCode: partner.zipCode || '',
            consultationPrice: partner.consultationPrice || 0,
            experienceYears: partner.experienceYears || 0,
            foundationYear: partner.foundationYear || 0,
            education: partner.education || [],
            workingHours: partner.workingHours || [],
            languages: partner.languages || [],
            facilities: partner.facilities || [],
            insurances: partner.insurances || [],
            rating: partner.rating || 5.0,
            totalReviews: partner.totalReviews || 0,
            photo: partner.photo || partner.user?.avatar || '',
        });
    }
    catch (error) {
        console.error('[ProfileRoutes] Error:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});
/**
 * @route GET /api/partners/my-public-profile
 * @desc Endpoint unificado para a página de Perfil do parceiro
 */
router.get('/my-public-profile', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({
            where: { userId },
            include: {
                user: { select: { id: true, name: true, email: true, avatar: true } },
                team: true,
                services: { where: { isActive: true } }
            }
        });
        if (!partner) {
            return res.status(404).json({ error: 'Perfil de parceiro não localizado' });
        }
        // FASE 6 (Modular): Resposta blindada para evitar erros de "null reading avatar"
        const userFallback = partner.user || { id: '', name: '', email: '', avatar: '' };
        return res.json({
            id: partner.id,
            userId: userId,
            user: {
                id: userFallback.id,
                name: userFallback.name || partner.name || '',
                email: userFallback.email || '',
                avatar: userFallback.avatar || '',
            },
            name: partner.name || userFallback.name || '',
            specialty: partner.specialty || '',
            specialties: partner.specialties || [],
            photo: userFallback.avatar || partner.photo || '',
            description: partner.description || partner.about || '',
            city: partner.city || '',
            state: partner.state || '',
            crm: partner.crm || '',
            rating: partner.rating || 5.0,
            totalReviews: partner.totalReviews || 0,
            professionals: partner.team || [],
            services: partner.services || [],
            education: partner.education || [],
            workingHours: partner.workingHours || [],
            languages: partner.languages || [],
            facilities: partner.facilities || [],
            insurances: partner.insurances || []
        });
    }
    catch (error) {
        console.error('[ProfileRoutes/Public] Error:', error);
        res.status(500).json({ error: 'Erro ao processar perfil público modular' });
    }
});
exports.default = router;
//# sourceMappingURL=profile.routes.js.map