"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const uuid_1 = require("uuid");
const multer_1 = __importDefault(require("multer"));
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const chatbot_service_js_1 = require("../services/chatbot.service.js");
const inAppNotification_service_js_1 = __importDefault(require("../services/inAppNotification.service.js"));
const gamification_service_js_1 = require("../services/gamification.service.js");
const storage_service_js_1 = require("../services/storage.service.js");
const socket_js_1 = require("../lib/socket.js");
const validationCode_service_js_1 = require("../services/validationCode.service.js");
const finance_service_js_1 = require("../services/finance.service.js");
const reputation_service_js_1 = require("../services/reputation.service.js");
const revenue_service_js_1 = require("../services/revenue.service.js");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
// Helper para mapear dados do parceiro para o frontend
const mapPartnerData = (p) => {
    // Inicialmente tenta pegar o preço direto do parceiro (fallback legado)
    let finalPrice = p.consultationPrice || 0;
    // Tenta encontrar o preço nas especialidades/serviços vinculados via Busca Inteligente
    // Prioridade: Serviço ativo que contenha 'consulta' no nome ou categoria
    const activeServices = p.services?.filter((s) => s.isActive) || [];
    const consulService = activeServices.find((s) => (s.category && s.category.toLowerCase().includes('consulta')) ||
        (s.name && s.name.toLowerCase().includes('consulta'))) || activeServices[0]; // Fallback para o primeiro serviço ativo qualquer
    if (consulService) {
        if (typeof consulService.partnerPayout === 'number' && typeof consulService.doctonFeePercent === 'number') {
            finalPrice = consulService.partnerPayout * (1 + (consulService.doctonFeePercent / 100));
        }
        else if (typeof consulService.basePrice === 'number') {
            finalPrice = consulService.basePrice;
        }
        else if (typeof consulService.price === 'number') {
            finalPrice = consulService.price;
        }
    }
    // Preço padrão de segurança se tudo falhar ou for zero
    if (!finalPrice || finalPrice === 0) {
        finalPrice = 150.00;
    }
    // Fallback de especialidade
    const specialty = p.specialty || (p.specialties && p.specialties.length > 0 ? p.specialties.join(', ') : 'Clínica Geral');
    return {
        id: p.id,
        user: {
            name: p.user?.name || p.name || 'Profissional',
            email: p.user?.email || '',
            avatar: p.user?.avatar || undefined
        },
        type: p.type || 'CLINIC',
        specialty,
        crm: p.crm || undefined,
        description: p.description || '',
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        zipCode: p.zipCode || '',
        consultationPrice: finalPrice,
        acceptsOnline: p.acceptsOnline,
        hasOnlineScheduling: p.acceptsOnline,
        isApproved: p.isApproved,
        rating: p.rating || 0,
        totalReviews: p.totalReviews || 0,
        planTier: p.planTier || 'FREE',
        planStatus: p.planStatus || 'ACTIVE',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    };
};
// Lista todos os parceiros (para pacientes buscarem serviços) - ROTA PÚBLICA
router.get('/', async (req, res, next) => {
    try {
        let partners;
        try {
            partners = await prisma_js_1.default.partner.findMany({
                where: { isApproved: true },
                include: {
                    user: { select: { name: true, email: true, avatar: true } },
                    services: { where: { isActive: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (innerErr) {
            console.error('[Partners GET /] Fallback sem services:', innerErr?.message);
            partners = await prisma_js_1.default.partner.findMany({
                where: { isApproved: true },
                include: { user: { select: { name: true, email: true, avatar: true } } },
                orderBy: { createdAt: 'desc' }
            });
        }
        return res.json(partners.map(mapPartnerData));
    }
    catch (error) {
        console.error('[Partners GET /] Erro fatal:', error?.message);
        next(error);
    }
});
// Busca parceiros com filtro por termo - ROTA PÚBLICA
router.get('/search', async (req, res, next) => {
    const q = req.query.q?.trim();
    if (!q)
        return res.json([]);
    try {
        let partners;
        const whereClause = {
            OR: [
                { specialty: { contains: q, mode: 'insensitive' } },
                { city: { contains: q, mode: 'insensitive' } },
                { state: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
                { user: { name: { contains: q, mode: 'insensitive' } } }
            ]
        };
        try {
            partners = await prisma_js_1.default.partner.findMany({
                where: whereClause,
                include: {
                    user: { select: { name: true, email: true, avatar: true } },
                    services: { where: { isActive: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (innerErr) {
            console.error(`[Partners /search] Fallback sem services para "${q}":`, innerErr?.message);
            partners = await prisma_js_1.default.partner.findMany({
                where: whereClause,
                include: { user: { select: { name: true, email: true, avatar: true } } },
                orderBy: { createdAt: 'desc' }
            });
        }
        console.log(`[Search] Query: "${q}", Total: ${partners.length}`);
        return res.json(partners.map(mapPartnerData));
    }
    catch (err) {
        console.error(`[Partners /search] Erro fatal para "${q}":`, err?.message);
        next(err);
    }
});
// Perfil público do parceiro (sem autenticação) - para visualização pública
// Perfil público do parceiro
router.get('/public-profile', async (req, res) => {
    try {
        const { partnerId } = req.query;
        const userId = req.user?.userId; // Opcional, via authenticate if added
        // Se for um ID específico (visualização de paciente)
        if (partnerId) {
            const partner = await prisma_js_1.default.partner.findUnique({
                where: { id: partnerId },
                include: {
                    user: { select: { name: true, avatar: true, email: true } },
                    team: true,
                    services: {
                        where: { isActive: true },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });
            if (!partner)
                return res.status(404).json({ error: 'Parceiro não encontrado' });
            // Usar a lógica unificada de mapeamento
            const mappedPartner = mapPartnerData(partner);
            return res.json({
                ...mappedPartner,
                photo: partner.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.id}`,
                email: partner.user?.email,
                professionals: partner.team,
                totalPatients: await prisma_js_1.default.appointment.count({ where: { partnerId: partner.id } })
            });
        }
        // Se não houver partnerId, e estiver no contexto de parceiro autenticado, retorna o próprio perfil
        // Para isso precisaremos de um middleware que não bloqueie se não houver token mas popule req.user se houver
        // Mas por simplicidade, o frontend chama sem ID quando quer o próprio.
        // Vamos usar o authenticate aqui se quisermos que o parceiro edite seu próprio pelo mesmo endpoint
        // Ou criar um endpoint separado. O frontend usa /partners/public-profile sem ID.
        return res.status(400).json({ error: 'ID do parceiro não fornecido' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno ao buscar perfil público' });
    }
});
// Endpoint para o próprio parceiro buscar seu perfil público para edição
router.get('/my-public-profile', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({
            where: { userId },
            include: {
                user: { select: { name: true, email: true, avatar: true } },
                team: true,
                services: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!partner) {
            if (req.user?.role === 'ADMIN') {
                const user = await prisma_js_1.default.user.findFirst({ where: { id: userId } });
                return res.json({
                    id: 'admin-virtual',
                    userId: userId,
                    name: user?.name,
                    email: user?.email,
                    photo: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
                    specialty: 'Administrador do Sistema',
                    description: 'Perfil de administrador para gerenciamento e testes.',
                    specialties: [],
                    languages: ['Português'],
                    facilities: [],
                    workingHours: [],
                    education: [],
                    insurances: [],
                    isApproved: true,
                    rating: 5.0,
                    totalReviews: 0,
                    totalPatients: 0
                });
            }
            console.warn(`[PublicProfile] Parceiro não encontrado para o userId: ${userId}. Role: ${req.user?.role}`);
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        }
        // Mapeamento para o formato esperado pelo frontend PerfilPublico.tsx usando a lógica unificada
        const mappedPartner = mapPartnerData(partner);
        const profile = {
            ...mappedPartner,
            photo: partner.user?.avatar || null,
            professionals: partner.team,
            totalPatients: await prisma_js_1.default.appointment.count({ where: { partnerId: partner.id } }),
            // Garantir que campos de array não sejam nulos
            specialties: partner.specialties || [],
            languages: partner.languages || [],
            facilities: partner.facilities || [],
            workingHours: partner.workingHours || [],
            education: partner.education || [],
            insurances: partner.insurances || []
        };
        return res.json(profile);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao buscar seu perfil' });
    }
});
router.put('/public-profile', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        // Campos permitidos para atualização
        const { name, specialty, specialties, crm, cnpj, description, address, city, state, zipCode, phone, consultationPrice, acceptsTelemedicine, acceptsEmergency, acceptsInsurance, experienceYears, foundationYear, education, workingHours, languages, facilities, insurances } = req.body;
        const updated = await prisma_js_1.default.partner.update({
            where: { id: partner.id },
            data: {
                name, specialty, specialties, crm, cnpj, phone,
                description: description || req.body.about,
                address, city, state, zipCode, consultationPrice,
                acceptsTelemedicine,
                acceptsEmergency,
                acceptsInsurance,
                experienceYears: experienceYears ? parseInt(experienceYears) : undefined,
                foundationYear: foundationYear ? parseInt(foundationYear) : undefined,
                education, workingHours, languages, facilities, insurances
            }
        });
        // Se o nome mudar, atualiza no modelo User também
        if (name) {
            await prisma_js_1.default.user.update({
                where: { id: userId },
                data: { name }
            });
        }
        return res.json(updated);
    }
    catch (error) {
        console.error('Erro ao atualizar perfil público:', error);
        return res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
});
router.post('/public-profile/photo', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
        if (err) {
            console.error('[PhotoUpload] Erro Multer:', err);
            return res.status(400).json({ error: 'Erro no upload do arquivo', details: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const userId = req.user?.userId;
        console.log('[PhotoUpload] req.user:', JSON.stringify(req.user));
        console.log(`[PhotoUpload] Iniciando upload para usuário: ${userId}`);
        if (!req.file) {
            console.warn('[PhotoUpload] Nenhum arquivo recebido no req.file');
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        console.log(`[PhotoUpload] Arquivo recebido: ${req.file.originalname}, tipo: ${req.file.mimetype}, tamanho: ${req.file.size} bytes`);
        const publicUrl = await storage_service_js_1.storageService.uploadAvatar(req.file.buffer, req.file.originalname, req.file.mimetype);
        const updatedUser = await prisma_js_1.default.user.update({
            where: { id: userId },
            data: { avatar: publicUrl }
        });
        console.log(`[PhotoUpload] Avatar atualizado com sucesso no banco para usuário ${userId}`);
        return res.json({ photo: publicUrl });
    }
    catch (error) {
        console.error('[PhotoUpload] Erro ao fazer upload da foto:', error);
        return res.status(500).json({ error: 'Erro ao processar foto' });
    }
});
router.get('/profile', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), (req, res) => {
    (async () => {
        try {
            const userId = req.user?.userId;
            if (!userId)
                return res.status(401).json({ error: 'Usuário não autenticado' });
            const partner = await prisma_js_1.default.partner.findFirst({
                where: { userId },
                include: { user: true }
            });
            if (!partner)
                return res.status(404).json({ error: 'Parceiro não encontrado' });
            return res.json({
                id: partner.id,
                user: {
                    name: partner.user?.name || '',
                    email: partner.user?.email || '',
                    avatar: partner.user?.avatar || undefined
                },
                type: 'CLINIC',
                specialty: partner.specialty || '',
                specialties: partner.specialties || [],
                crm: partner.crm || undefined,
                description: partner.description || '',
                address: partner.address || '',
                city: partner.city || '',
                state: partner.state || '',
                zipCode: partner.zipCode || '',
                consultationPrice: partner.consultationPrice || 0,
                acceptsOnline: partner.acceptsOnline,
                hasOnlineScheduling: partner.acceptsOnline,
                isApproved: partner.isApproved,
                rating: partner.rating || 0,
                totalReviews: partner.totalReviews || 0,
                planTier: partner.planTier || 'FREE',
                planStatus: partner.planStatus || 'ACTIVE',
                createdAt: partner.createdAt,
                updatedAt: partner.updatedAt,
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao buscar perfil do parceiro' });
        }
    })();
});
router.put('/profile', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), (req, res) => {
    (async () => {
        try {
            const userId = req.user?.userId;
            if (!userId)
                return res.status(401).json({ error: 'Usuário não autenticado' });
            const partner = await prisma_js_1.default.partner.findFirst({
                where: { userId }
            });
            if (!partner)
                return res.status(404).json({ error: 'Parceiro não encontrado' });
            const { specialty, specialties, description, address, city, state, zipCode, consultationPrice, acceptsOnline } = req.body;
            const updated = await prisma_js_1.default.partner.update({
                where: { id: partner.id },
                data: {
                    specialty,
                    specialties,
                    description,
                    address,
                    city,
                    state,
                    zipCode,
                    consultationPrice,
                    acceptsOnline
                }
            });
            return res.json(updated);
        }
        catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            return res.status(500).json({ error: 'Erro ao atualizar perfil' });
        }
    })();
});
router.get('/settings', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findUnique({
            where: { userId },
            select: { settings: true }
        });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        res.json(partner.settings || {});
    }
    catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});
router.put('/settings', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const settings = req.body;
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        // Validate if settings is an object
        if (typeof settings !== 'object' || settings === null) {
            return res.status(400).json({ error: 'Formato de configurações inválido' });
        }
        const updatedPartner = await prisma_js_1.default.partner.update({
            where: { id: partner.id },
            data: { settings },
            select: { settings: true }
        });
        res.json(updatedPartner.settings);
    }
    catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});
// Update Partner Plan
router.put('/plan', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { planTier } = req.body;
        const userId = req.user?.userId;
        if (!['FREE', 'PRO', 'PREMIUM'].includes(planTier)) {
            return res.status(400).json({ error: 'Plano inválido' });
        }
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const updated = await prisma_js_1.default.partner.update({
            where: { id: partner.id },
            data: {
                planTier,
                planStatus: 'ACTIVE' // Simplified for now
            }
        });
        res.json({
            success: true,
            planTier: updated.planTier,
            planStatus: updated.planStatus
        });
    }
    catch (error) {
        console.error('Erro ao atualizar plano:', error);
        res.status(500).json({ error: 'Erro ao atualizar plano' });
    }
});
router.get('/patients/search', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const q = (req.query.q || '').toLowerCase();
        const patients = await prisma_js_1.default.patient.findMany({
            where: {
                OR: [
                    { user: { name: { contains: q, mode: 'insensitive' } } },
                    { cpf: { contains: q } }
                ]
            },
            include: {
                user: { select: { name: true, email: true, avatar: true } }
            },
            take: 10
        });
        return res.json(patients.map(p => ({
            id: p.id,
            name: p.user.name,
            cpf: p.cpf,
            avatar: p.user.avatar
        })));
    }
    catch (error) {
        console.error('Erro ao buscar pacientes:', error);
        return res.status(500).json({ error: 'Erro ao buscar pacientes' });
    }
});
// ==================== AGENDAMENTOS E DASHBOARD ====================
router.get('/appointments', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { q, status, type, startDate, endDate } = req.query;
        const partner = await prisma_js_1.default.partner.findFirst({
            where: { userId },
            select: { id: true }
        });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const where = {
            partnerId: partner.id,
        };
        // Filtro por termo de busca (nome do paciente ou CPF)
        if (q) {
            const term = String(q).toLowerCase();
            where.patient = {
                user: {
                    name: { contains: term, mode: 'insensitive' }
                }
            };
        }
        // Filtro por status
        if (status && status !== 'all') {
            where.status = String(status);
        }
        // Filtro por tipo (online/presencial)
        if (type && type !== 'all') {
            where.isOnline = type === 'online';
        }
        // Filtro por data
        if (startDate || endDate) {
            where.dateTime = {};
            if (startDate)
                where.dateTime.gte = new Date(String(startDate));
            if (endDate) {
                const end = new Date(String(endDate));
                end.setHours(23, 59, 59, 999);
                where.dateTime.lte = end;
            }
        }
        const appointments = await prisma_js_1.default.appointment.findMany({
            where,
            include: {
                patient: {
                    include: { user: { select: { name: true, email: true, avatar: true } } }
                }
            },
            orderBy: { dateTime: 'desc' }
        });
        return res.json(appointments);
    }
    catch (error) {
        console.error('Erro ao listar consultas com filtros:', error);
        return res.status(500).json({ error: 'Erro ao listar consultas' });
    }
});
// Buscar um agendamento específico
router.get('/appointments/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const appointment = await prisma_js_1.default.appointment.findFirst({
            where: {
                id,
                partnerId: partner.id
            },
            include: {
                patient: {
                    include: { user: { select: { name: true, email: true, avatar: true } } }
                }
            }
        });
        if (!appointment)
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        return res.json(appointment);
    }
    catch (error) {
        console.error('Erro ao buscar agendamento:', error);
        return res.status(500).json({ error: 'Erro ao buscar agendamento' });
    }
});
router.post('/appointments', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { patientName, patientId, dateTime, duration, isOnline, notes } = req.body;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        let finalPatientId = patientId;
        // Se não tiver patientId, tenta encontrar pelo nome ou cria um placeholder
        if (!finalPatientId && patientName) {
            const existingUser = await prisma_js_1.default.user.findFirst({
                where: { name: { contains: patientName, mode: 'insensitive' }, role: 'PATIENT' },
                include: { patient: true }
            });
            if (existingUser?.patient) {
                finalPatientId = existingUser.patient.id;
            }
            else {
                // Criar um usuário/paciente "placeholder" para agendamentos manuais
                // Isso é uma simplificação para o CRUD funcionar sem exigir cadastro completo
                const newUserId = (0, uuid_1.v4)();
                const newUser = await prisma_js_1.default.user.create({
                    data: {
                        id: newUserId,
                        name: patientName,
                        email: `temp_${newUserId}@docton.com`,
                        password: (0, uuid_1.v4)(), // Senha aleatória
                        role: 'PATIENT'
                    }
                });
                const newPatient = await prisma_js_1.default.patient.create({
                    data: {
                        userId: newUser.id,
                        cpf: `000.${Math.floor(Math.random() * 999)}.${Math.floor(Math.random() * 999)}-${Math.floor(Math.random() * 99)}`, // CPF temporário
                        birthDate: new Date('2000-01-01')
                    }
                });
                finalPatientId = newPatient.id;
            }
        }
        if (!finalPatientId) {
            return res.status(400).json({ error: 'Paciente ou nome do paciente é obrigatório' });
        }
        const appointment = await prisma_js_1.default.appointment.create({
            data: {
                partnerId: partner.id,
                patientId: finalPatientId,
                dateTime: new Date(dateTime),
                duration: duration || 30,
                isOnline: !!isOnline,
                notes: notes || '',
                status: 'SCHEDULED'
            },
            include: {
                patient: {
                    include: { user: { select: { name: true, email: true, avatar: true } } }
                }
            }
        });
        return res.status(201).json(appointment);
    }
    catch (error) {
        console.error('Erro ao criar agendamento:', error);
        return res.status(500).json({ error: 'Erro ao criar agendamento' });
    }
});
router.put('/appointments/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId || req.user.id;
        const { dateTime, duration, isOnline, notes, status } = req.body;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const appointment = await prisma_js_1.default.appointment.update({
            where: { id, partnerId: partner.id },
            data: {
                dateTime: dateTime ? new Date(dateTime) : undefined,
                duration: duration ? Number(duration) : undefined,
                isOnline: isOnline !== undefined ? !!isOnline : undefined,
                notes: notes !== undefined ? notes : undefined,
                status: status || undefined
            },
            include: {
                patient: {
                    include: { user: { select: { name: true, email: true, avatar: true } } }
                }
            }
        });
        // Finance Integration (Phase 4): Se estiver mudando para COMPLETED (concluída), processar repasse
        if (status === 'COMPLETED' && appointment.status === 'COMPLETED') { // Só chamar se a mudança for confirmada no BD
            try {
                await finance_service_js_1.financeService.processAppointmentCompletion(appointment.id);
                console.log(`[Finance] Repasse processado para consulta (via PUT): ${appointment.id}`);
            }
            catch (finErr) {
                console.error('Erro ao processar financeiro na conclusão (PUT):', finErr);
            }
        }
        socket_js_1.SocketService.sendToUser(appointment.patientId, 'timelineUpdate', { type: 'appointment', id: appointment.id, status: appointment.status });
        return res.json(appointment);
    }
    catch (error) {
        console.error('Erro ao atualizar agendamento:', error);
        return res.status(500).json({ error: 'Erro ao atualizar agendamento' });
    }
});
// ==================== PRONTUÁRIOS (MEDICAL RECORDS) ====================
// Buscar prontuário de um agendamento
router.get('/medical-records/:appointmentId', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const record = await prisma_js_1.default.medicalRecord.findUnique({
            where: { appointmentId },
            include: {
                patient: { include: { user: { select: { name: true, avatar: true } } } },
                appointment: true
            }
        });
        if (!record)
            return res.status(404).json({ error: 'Prontuário não encontrado' });
        if (record.partnerId !== partner.id)
            return res.status(403).json({ error: 'Acesso negado' });
        return res.json(record);
    }
    catch (error) {
        console.error('Erro ao buscar prontuário:', error);
        return res.status(500).json({ error: 'Erro ao buscar prontuário' });
    }
});
// Atualizar prontuário
router.put('/medical-records/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { diagnosis, symptoms, treatment, observations, attachments } = req.body;
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const record = await prisma_js_1.default.medicalRecord.findUnique({ where: { id } });
        if (!record)
            return res.status(404).json({ error: 'Prontuário não encontrado' });
        if (record.partnerId !== partner.id)
            return res.status(403).json({ error: 'Acesso negado' });
        const updated = await prisma_js_1.default.medicalRecord.update({
            where: { id },
            data: {
                diagnosis,
                symptoms,
                treatment,
                observations,
                attachments
            }
        });
        socket_js_1.SocketService.sendToUser(record.patientId, 'medicalHistoryUpdate', updated);
        socket_js_1.SocketService.sendToUser(record.patientId, 'timelineUpdate', { type: 'medicalRecord', id: updated.id });
        return res.json(updated);
    }
    catch (error) {
        console.error('Erro ao atualizar prontuário:', error);
        return res.status(500).json({ error: 'Erro ao atualizar prontuário' });
    }
});
// Upload de anexos para o prontuário
router.post('/medical-records/:id/attachments', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), upload.array('files', 5), async (req, res) => {
    try {
        const { id } = req.params;
        const files = req.files;
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const record = await prisma_js_1.default.medicalRecord.findUnique({ where: { id } });
        if (!record)
            return res.status(404).json({ error: 'Prontuário não encontrado' });
        if (record.partnerId !== partner.id)
            return res.status(403).json({ error: 'Acesso negado' });
        const uploadPromises = files.map(file => storage_service_js_1.storageService.uploadFile(file.buffer, `medical-records/${id}/${file.originalname}`, file.mimetype));
        const urls = await Promise.all(uploadPromises);
        const existingAttachments = (() => {
            try {
                const raw = record.attachments;
                if (!raw)
                    return [];
                return Array.isArray(raw) ? raw : JSON.parse(raw);
            }
            catch {
                return [];
            }
        })();
        const updated = await prisma_js_1.default.medicalRecord.update({
            where: { id },
            data: {
                attachments: JSON.stringify([...existingAttachments, ...urls])
            }
        });
        socket_js_1.SocketService.sendToUser(record.patientId, 'medicalHistoryUpdate', updated);
        socket_js_1.SocketService.sendToUser(record.patientId, 'timelineUpdate', { type: 'attachment', id: updated.id });
        return res.json(updated);
    }
    catch (error) {
        console.error('Erro ao fazer upload de anexos:', error);
        return res.status(500).json({ error: 'Erro ao fazer upload de anexos' });
    }
});
router.delete('/appointments/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        await prisma_js_1.default.appointment.delete({
            where: { id, partnerId: partner.id }
        });
        return res.status(204).send();
    }
    catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        return res.status(500).json({ error: 'Erro ao excluir agendamento' });
    }
});
// Validar código de atendimento
router.post('/appointments/validate-code', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { code, appointmentId } = req.body;
        const userId = req.user.userId || req.user.id;
        if (!code)
            return res.status(400).json({ error: 'Código é obrigatório' });
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        // Busca agendamento por ID exato ou sufixo
        const where = {
            partnerId: partner.id,
            status: { in: ['SCHEDULED', 'CONFIRMED'] }
        };
        const searchCode = code.trim().toLowerCase();
        console.log(`[Validation] Iniciando para Parceiro ${partner.id} (User: ${userId}). Código: ${searchCode}, ID sugerido: ${appointmentId || 'nenhum'}`);
        let appointment = null;
        // 1. Tentar encontrar pelo ID exato se fornecido
        if (appointmentId) {
            appointment = await prisma_js_1.default.appointment.findFirst({
                where: { id: appointmentId, partnerId: partner.id },
                include: {
                    patient: {
                        include: { user: { select: { name: true } } }
                    }
                }
            });
            if (appointment) {
                console.log(`[Validation] Agendamento encontrado pelo ID: ${appointment.id}. Status atual: ${appointment.status}`);
                // Verificar se já foi concluído
                if (appointment.status === 'COMPLETED') {
                    return res.json({ valid: false, message: 'Este atendimento já foi validado anteriormente.' });
                }
                // Verificar o código (sufixo)
                const idLower = appointment.id.toLowerCase();
                const codeMatches = idLower.endsWith(searchCode) || idLower === searchCode;
                if (!codeMatches) {
                    console.warn(`[Validation] Código ${searchCode} não confere com o ID ${appointment.id}`);
                    // Não retornamos aqui ainda, vamos tentar o fallback abaixo caso o ID fornecido pelo front esteja errado
                    appointment = null;
                }
            }
        }
        // 2. Fallback: Se não forneceu ID ou o código não bateu com o ID sugerido, 
        // tenta buscar qualquer agendamento ATIVO do parceiro que TERMINE com o código
        if (!appointment) {
            console.log(`[Validation] Tentando busca geral por sufixo: ${searchCode}`);
            appointment = await prisma_js_1.default.appointment.findFirst({
                where: {
                    partnerId: partner.id,
                    status: { in: ['SCHEDULED', 'CONFIRMED', 'active'] },
                    id: {
                        endsWith: searchCode,
                        mode: 'insensitive'
                    }
                },
                include: {
                    patient: {
                        include: { user: { select: { name: true } } }
                    }
                }
            });
            if (appointment) {
                console.log(`[Validation] Agendamento encontrado por fallback de sufixo: ${appointment.id}`);
            }
        }
        if (appointment) {
            await prisma_js_1.default.appointment.update({
                where: { id: appointment.id },
                data: { status: 'COMPLETED' }
            });
            // Finance Integration (Phase 4): Processar repasse e alimentar carteira do parceiro
            try {
                await finance_service_js_1.financeService.processAppointmentCompletion(appointment.id);
                console.log(`[Finance] Repasse automático processado para consulta (via Validação): ${appointment.id}`);
            }
            catch (finErr) {
                console.error('Erro ao processar financeiro na conclusão via token:', finErr);
            }
            // Notificar o paciente (Real-time update)
            socket_js_1.SocketService.sendToUser(appointment.patient.userId, 'timelineUpdate', { type: 'appointment', id: appointment.id, status: 'COMPLETED' });
            socket_js_1.SocketService.sendToUser(appointment.patient.userId, 'healthLogsUpdate', { type: 'appointment_completed' });
            // Notificar o paciente
            try {
                await inAppNotification_service_js_1.default.createNotification({
                    userId: appointment.patient.userId,
                    type: 'SYSTEM',
                    title: 'Consulta Concluída',
                    message: `Sua consulta com ${partner.name || 'o profissional'} foi concluída com sucesso. Não esqueça de deixar sua avaliação!`,
                    priority: 'medium',
                    link: '/patient/agendamentos'
                });
            }
            catch (notifyErr) {
                console.error('Erro ao notificar paciente sobre conclusão de consulta:', notifyErr);
            }
            // Registro de Validação (Real-time tracking for Admin)
            try {
                await prisma_js_1.default.validationCodeLog.create({
                    data: {
                        code,
                        status: 'valid',
                        partnerId: partner.id,
                        patientId: appointment.patientId,
                        appointmentId: appointment.id,
                        partnerName: partner.name,
                        patientName: appointment.patient.user.name,
                    }
                });
            }
            catch (logErr) {
                console.error('Erro ao criar log de validação (sucesso):', logErr);
            }
            // Gamificação e Fidelidade
            try {
                // Atribuir pontos por comparecimento (HP/XP)
                await (0, gamification_service_js_1.addPoints)(appointment.patient.id, 100, 'ATTENDANCE_COMPLETED', `Pontos por atendimento com ${partner.name}`);
                // Atualizar sequência (streak) do paciente
                await (0, gamification_service_js_1.updateStreak)(appointment.patient.id);
                // GATILHO DE DESAFIO (Conectividade Gamification)
                await gamification_service_js_1.wearablesPilotService.triggerChallengeAction(appointment.patient.userId, 'appointment_done');
            }
            catch (gamifyErr) {
                console.error('Erro ao processar gamificação no checkout:', gamifyErr);
            }
            // Inicializar Prontuário (MedicalRecord Skeleton)
            try {
                const existingRecord = await prisma_js_1.default.medicalRecord.findUnique({
                    where: { appointmentId: appointment.id }
                });
                if (!existingRecord) {
                    await prisma_js_1.default.medicalRecord.create({
                        data: {
                            appointmentId: appointment.id,
                            patientId: appointment.patient.id,
                            partnerId: partner.id,
                            diagnosis: 'Aguardando preenchimento...',
                            symptoms: JSON.stringify([]),
                        }
                    });
                }
            }
            catch (recordErr) {
                console.error('Erro ao inicializar prontuário:', recordErr);
            }
            // Log de auditoria
            try {
                await prisma_js_1.default.auditLog.create({
                    data: {
                        userId: userId,
                        userName: appointment.patient?.user?.name || 'Sistema',
                        userRole: 'PARTNER',
                        action: 'VALIDATE_CODE',
                        resource: 'Appointment',
                        resourceId: appointment.id,
                        ipAddress: req.headers['x-forwarded-for'] || req.ip || '127.0.0.1',
                        severity: 'low',
                        category: 'system',
                        status: 'success',
                        details: { code, appointmentId: appointment.id }
                    }
                });
            }
            catch (logErr) {
                console.error('Erro ao criar log de auditoria:', logErr);
            }
            return res.json({
                valid: true,
                patientName: appointment.patient?.user?.name || 'Paciente',
                appointmentId: appointment.id
            });
        }
        // Registro de Validação Inválida
        try {
            await prisma_js_1.default.validationCodeLog.create({
                data: {
                    code,
                    status: 'invalid',
                    partnerId: partner.id,
                    partnerName: partner.name,
                }
            });
        }
        catch (logErr) {
            console.error('Erro ao criar log de validação (inválido):', logErr);
        }
        return res.json({ valid: false, message: 'Código inválido ou agendamento já concluído.' });
    }
    catch (error) {
        console.error('Erro ao validar código:', error);
        // Registro de Erro na Validação
        try {
            // Tentar pegar o parceiro se userId estiver disponível
            const userId = req.user?.userId || req.user?.id;
            const partner = userId ? await prisma_js_1.default.partner.findFirst({ where: { userId } }) : null;
            await prisma_js_1.default.validationCodeLog.create({
                data: {
                    code: req.body?.code || 'unknown',
                    status: 'error',
                    partnerId: partner?.id,
                    partnerName: partner?.name,
                    errorMessage: error.message || 'Erro interno desconhecido'
                }
            });
        }
        catch (logErr) {
            console.error('Erro ao criar log de validação (erro):', logErr);
        }
        return res.status(500).json({ error: 'Erro ao validar código' });
    }
});
// ==================== DISPONIBILIDADE ====================
// Solicitar disponibilidade (Paciente -> Parceiro)
router.post('/availability', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const { partnerId, specialty, date, time, urgency } = req.body;
        const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
        if (!patient)
            return res.status(404).json({ error: 'Paciente não encontrado' });
        const request = await prisma_js_1.default.availabilityRequest.create({
            data: {
                patientId: patient.id,
                partnerId,
                specialty,
                date,
                time,
                urgency: urgency || 'normal',
                status: 'pending'
            }
        });
        // Notificar o parceiro
        try {
            const partner = await prisma_js_1.default.partner.findUnique({ where: { id: partnerId } });
            if (partner) {
                await inAppNotification_service_js_1.default.createNotification({
                    userId: partner.userId,
                    type: 'system',
                    title: 'Nova consulta de disponibilidade',
                    message: `Você recebeu um novo pedido de disponibilidade para ${specialty} em ${date} às ${time}.`,
                    priority: urgency === 'urgent' ? 'high' : 'medium',
                    link: '/partner/disponibilidade'
                });
            }
        }
        catch (notifyError) {
            console.error('Erro ao enviar notificação de disponibilidade:', notifyError);
        }
        res.status(201).json(request);
    }
    catch (error) {
        next(error);
    }
});
// Listar solicitações de disponibilidade (para Parceiro ou Paciente)
router.get('/availability', auth_js_1.authenticate, async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        let where = {};
        if (role === 'PARTNER') {
            const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
            if (!partner)
                return res.status(404).json({ error: 'Parceiro não encontrado' });
            where.partnerId = partner.id;
        }
        else if (role === 'PATIENT') {
            const patient = await prisma_js_1.default.patient.findUnique({ where: { userId } });
            if (!patient)
                return res.status(404).json({ error: 'Paciente não encontrado' });
            where.patientId = patient.id;
        }
        let requests;
        try {
            requests = await prisma_js_1.default.availabilityRequest.findMany({
                where,
                include: {
                    patient: { include: { user: { select: { name: true, avatar: true } } } },
                    partner: {
                        include: {
                            user: { select: { name: true, avatar: true } },
                            services: { where: { isActive: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (innerErr) {
            console.error('[Availability GET] Fallback sem services:', innerErr?.message);
            requests = await prisma_js_1.default.availabilityRequest.findMany({
                where,
                include: {
                    patient: { include: { user: { select: { name: true, avatar: true } } } },
                    partner: {
                        include: {
                            user: { select: { name: true, avatar: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        const mappedRequests = requests.map(r => ({
            ...r,
            partner: mapPartnerData(r.partner)
        }));
        res.json(mappedRequests);
    }
    catch (error) {
        next(error);
    }
});
// Responder a uma solicitação de disponibilidade
router.put('/availability/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, suggestedSlots } = req.body;
        if (!['accepted', 'rejected', 'suggested'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }
        const request = await prisma_js_1.default.availabilityRequest.findUnique({
            where: { id },
            include: { patient: { include: { user: true } } }
        });
        if (!request)
            return res.status(404).json({ error: 'Solicitação não encontrada' });
        // Filtrar slots vazios se for sugestão
        const validSuggestedSlots = Array.isArray(suggestedSlots)
            ? suggestedSlots.filter((s) => s.date && s.time)
            : null;
        const updatedRequest = await prisma_js_1.default.availabilityRequest.update({
            where: { id },
            data: {
                status,
                suggestedSlots: validSuggestedSlots ? JSON.stringify(validSuggestedSlots) : undefined
            }
        });
        // Notificar o paciente sobre a resposta
        if (request.patient?.user) {
            let message = `O profissional ${status === 'accepted' ? 'aceitou' : status === 'suggested' ? 'sugeriu novos horários para' : 'recusou'} sua solicitação de disponibilidade para ${request.specialty}.`;
            await inAppNotification_service_js_1.default.createNotification({
                userId: request.patient.user.id,
                type: 'system',
                title: 'Resposta de Disponibilidade',
                message,
                priority: 'medium',
                link: '/patient/agendamentos?tab=requests'
            });
            // Emitir via Socket para atualização em tempo real no frontend
            socket_js_1.SocketService.sendToUser(request.patient.user.id, 'availabilityUpdate', updatedRequest);
        }
        res.json(updatedRequest);
    }
    catch (error) {
        next(error);
    }
});
router.get('/dashboard', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({
            where: { userId },
            select: { id: true, rating: true, totalReviews: true, planTier: true, planStatus: true, createdAt: true }
        });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const [appointments, monthlyRevenueData, lastMonthRevenueData, recentAppointments] = await Promise.all([
            prisma_js_1.default.appointment.findMany({
                where: { partnerId: partner.id },
                select: { status: true, createdAt: true, dateTime: true }
            }),
            prisma_js_1.default.transaction.aggregate({
                where: {
                    partnerId: partner.id,
                    status: 'COMPLETED',
                    type: 'INCOME',
                    date: { gte: startOfMonth }
                },
                _sum: { amount: true }
            }),
            prisma_js_1.default.transaction.aggregate({
                where: {
                    partnerId: partner.id,
                    status: 'COMPLETED',
                    type: 'INCOME',
                    date: { gte: lastMonthStart, lte: lastMonthEnd }
                },
                _sum: { amount: true }
            }),
            prisma_js_1.default.appointment.findMany({
                where: { partnerId: partner.id },
                take: 5,
                orderBy: { dateTime: 'desc' },
                include: {
                    patient: {
                        include: { user: { select: { name: true, avatar: true } } }
                    }
                }
            })
        ]);
        const totalAppointments = appointments.length;
        const completedAppointments = appointments.filter(a => a.status === 'COMPLETED').length;
        const upcomingAppointments = appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length;
        // 2. Determinar a taxa de comissão com base no plano para o cálculo do repasse
        const plan = partner.planTier || 'FREE';
        let commissionPercent = 15; // FREE
        if (plan === 'PRO')
            commissionPercent = 10;
        if (plan === 'PREMIUM')
            commissionPercent = 5;
        // Multiplicador do repasse (ex: 0.85 para 15% de taxa)
        const payoutMultiplier = (100 - commissionPercent) / 100;
        const monthlyRevenue = (monthlyRevenueData._sum.amount || 0) * payoutMultiplier;
        const lastMonthRevenue = (lastMonthRevenueData._sum.amount || 0) * payoutMultiplier;
        const revenueGrowth = lastMonthRevenue === 0 ? (monthlyRevenue > 0 ? 100 : 0) : Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);
        const thisMonthAppts = appointments.filter(a => a.createdAt >= startOfMonth).length;
        const lastMonthAppts = appointments.filter(a => a.createdAt >= lastMonthStart && a.createdAt <= lastMonthEnd).length;
        const apptsGrowth = lastMonthAppts === 0 ? (thisMonthAppts > 0 ? 100 : 0) : Math.round(((thisMonthAppts - lastMonthAppts) / lastMonthAppts) * 100);
        const period = req.query.period || 'week';
        let chartData = [];
        if (period === 'week') {
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                d.setHours(0, 0, 0, 0);
                return d;
            });
            chartData = await Promise.all(last7Days.map(async (date) => {
                const nextDay = new Date(date);
                nextDay.setDate(date.getDate() + 1);
                const [revenue, appts] = await Promise.all([
                    prisma_js_1.default.transaction.aggregate({
                        where: {
                            partnerId: partner.id,
                            status: 'COMPLETED',
                            type: 'INCOME',
                            date: { gte: date, lt: nextDay }
                        },
                        _sum: { amount: true }
                    }),
                    prisma_js_1.default.appointment.count({
                        where: {
                            partnerId: partner.id,
                            dateTime: { gte: date, lt: nextDay }
                        }
                    })
                ]);
                return {
                    name: (0, date_fns_1.format)(date, 'EEE', { locale: locale_1.ptBR }),
                    value: (revenue._sum.amount || 0) * payoutMultiplier,
                    appts: appts
                };
            }));
        }
        else if (period === 'month') {
            const last30Days = Array.from({ length: 30 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (29 - i));
                d.setHours(0, 0, 0, 0);
                return d;
            });
            chartData = await Promise.all(last30Days.map(async (date) => {
                const nextDay = new Date(date);
                nextDay.setDate(date.getDate() + 1);
                const [revenue, appts] = await Promise.all([
                    prisma_js_1.default.transaction.aggregate({
                        where: {
                            partnerId: partner.id,
                            status: 'COMPLETED',
                            type: 'INCOME',
                            date: { gte: date, lt: nextDay }
                        },
                        _sum: { amount: true }
                    }),
                    prisma_js_1.default.appointment.count({
                        where: {
                            partnerId: partner.id,
                            dateTime: { gte: date, lt: nextDay }
                        }
                    })
                ]);
                return {
                    name: (0, date_fns_1.format)(date, 'dd/MM'),
                    value: (revenue._sum.amount || 0) * payoutMultiplier,
                    appts: appts
                };
            }));
        }
        return res.json({
            metrics: {
                totalAppointments,
                completedAppointments,
                upcomingAppointments,
                rating: partner.rating ?? 0,
                totalReviews: partner.totalReviews ?? 0,
                monthlyRevenue,
                revenueGrowth,
                apptsGrowth,
                newAppointments: thisMonthAppts,
                planTier: partner.planTier || 'FREE',
                planStatus: partner.planStatus || 'ACTIVE'
            },
            recentAppointments: recentAppointments.map(a => ({
                id: a.id,
                patientName: a.patient?.user?.name || 'Paciente',
                patientAvatar: a.patient?.user?.avatar,
                dateTime: a.dateTime,
                status: a.status
            })),
            chartData: chartData
        });
    }
    catch (error) {
        console.error('Erro ao obter dashboard do parceiro:', error);
        return res.status(500).json({ error: 'Erro ao obter dashboard do parceiro' });
    }
});
// Relatórios Rápidos para Parceiros
router.get('/reports', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const reports = await prisma_js_1.default.report.findMany({
            where: { partnerId: partner.id },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(reports);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao listar relatórios' });
    }
});
router.post('/reports/quick', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const now = new Date();
        const report = await prisma_js_1.default.report.create({
            data: {
                partnerId: partner.id,
                name: `Resumo Rápido - ${(0, date_fns_1.format)(now, 'dd/MM/yyyy')}`,
                type: 'performance',
                format: 'PDF',
                status: 'Concluído',
                createdAt: now,
                createdBy: partner.name,
                period: 'Últimos 30 dias',
                size: '0.5 MB',
                downloads: 0
            }
        });
        // Aqui poderíamos chamar uma lib de geração de PDF real futuramente
        return res.status(201).json(report);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao gerar relatório rápido' });
    }
});
// Endpoints de Dados Financeiros
router.get('/financial-data', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const data = await prisma_js_1.default.partnerFinancialData.findUnique({
            where: { partnerId: partner.id }
        });
        if (!data)
            return res.status(404).json({ error: 'Dados financeiros não encontrados' });
        return res.json(data);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao obter dados financeiros' });
    }
});
router.put('/financial-data', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const existingData = await prisma_js_1.default.partnerFinancialData.findUnique({
            where: { partnerId: partner.id }
        });
        console.log('[FinancialUpdate] Corrigindo tipos e preparando payload. Body:', req.body);
        const payload = {
            bankCode: String(req.body.bankCode || ''),
            bankName: String(req.body.bankName || ''),
            agency: String(req.body.agency || ''),
            accountNumber: String(req.body.accountNumber || ''),
            accountType: String(req.body.accountType || 'Conta Corrente'),
            accountHolder: String(req.body.accountHolder || ''),
            taxId: String(req.body.taxId || ''),
            taxIdType: String(req.body.taxIdType || (req.body.taxId?.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF')),
            stateRegistration: req.body.stateRegistration ? String(req.body.stateRegistration) : null,
            billingAddress: String(req.body.billingAddress || ''),
            billingCity: String(req.body.billingCity || ''),
            billingState: String(req.body.billingState || ''),
            billingZipCode: String(req.body.billingZipCode || ''),
            paymentFrequency: String(req.body.paymentFrequency || 'MONTHLY'),
            paymentMethod: String(req.body.paymentMethod || 'PIX'),
            pixKey: req.body.pixKey ? String(req.body.pixKey) : null,
            pixKeyType: req.body.pixKeyType ? String(req.body.pixKeyType) : null,
        };
        // Garante que plataformaFeePercentage seja um número inteiro
        let fee = 10;
        if (req.user?.role === 'ADMIN' && req.body.platformFeePercentage !== undefined) {
            fee = parseInt(req.body.platformFeePercentage, 10);
        }
        else if (existingData) {
            fee = existingData.platformFeePercentage;
        }
        payload.platformFeePercentage = fee;
        console.log('[FinancialUpdate] Payload final robusto:', payload);
        const data = await prisma_js_1.default.partnerFinancialData.upsert({
            where: { partnerId: partner.id },
            update: payload,
            create: {
                ...payload,
                partnerId: partner.id
            },
        });
        return res.json(data);
    }
    catch (error) {
        console.error('[FinancialUpdate] Erro Crítico Prisma:', error);
        return res.status(500).json({
            error: 'Erro interno ao processar dados financeiros',
            details: error.message,
            code: error.code // Código de erro do Prisma (ex: P2002)
        });
    }
});
// ==================== ROTAS DE SERVIÇOS ====================
// Listar serviços do parceiro
router.get('/services', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), (req, res) => {
    (async () => {
        try {
            const userId = req.user?.userId;
            if (!userId)
                return res.status(401).json({ error: 'Usuário não autenticado' });
            const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
            if (!partner)
                return res.status(404).json({ error: 'Parceiro não encontrado' });
            const data = await prisma_js_1.default.partnerService.findMany({
                where: { partnerId: partner.id },
                orderBy: { createdAt: 'desc' }
            });
            return res.json({ data: data || [] });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao listar serviços' });
        }
    })();
});
// Obter serviço específico
router.get('/services/:serviceId', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), (req, res) => {
    (async () => {
        try {
            const userId = req.user?.userId;
            if (!userId)
                return res.status(401).json({ error: 'Usuário não autenticado' });
            const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
            if (!partner)
                return res.status(404).json({ error: 'Parceiro não encontrado' });
            const data = await prisma_js_1.default.partnerService.findFirst({
                where: {
                    id: req.params.serviceId,
                    partnerId: partner.id
                }
            });
            if (!data)
                return res.status(404).json({ error: 'Serviço não encontrado' });
            return res.json(data);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao obter serviço' });
        }
    })();
});
// Criar novo serviço
router.post('/services', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ error: 'Usuário não autenticado' });
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const { name, description, duration, price, isOnline, isPresencial, category, discountBasic, discountPremium, discountEnterprise, basePrice } = req.body;
        if (!name || price === undefined || duration === undefined) {
            return res.status(400).json({ error: 'Nome, preço e duração são obrigatórios' });
        }
        const payload = {
            partnerId: partner.id,
            name,
            description: description || '',
            duration: Number(duration),
            price: Number(price),
            basePrice: basePrice ? Number(basePrice) : Number(price),
            isOnline: !!isOnline,
            isPresencial: !!isPresencial,
            category: category || 'Consulta',
            isActive: true,
            appointments: 0,
            discountBasic: discountBasic ? Number(discountBasic) : 0,
            discountPremium: discountPremium ? Number(discountPremium) : 0,
            discountEnterprise: discountEnterprise ? Number(discountEnterprise) : 0,
        };
        const data = await prisma_js_1.default.partnerService.create({
            data: payload
        });
        return res.status(201).json(data);
    }
    catch (error) {
        console.error('Erro ao criar serviço:', error);
        return res.status(500).json({ error: 'Erro ao criar serviço' });
    }
});
// Atualizar serviço
router.put('/services/:serviceId', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ error: 'Usuário não autenticado' });
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const existing = await prisma_js_1.default.partnerService.findFirst({
            where: { id: req.params.serviceId, partnerId: partner.id }
        });
        if (!existing)
            return res.status(404).json({ error: 'Serviço não encontrado' });
        const updateData = {};
        if (req.body.name !== undefined)
            updateData.name = req.body.name;
        if (req.body.description !== undefined)
            updateData.description = req.body.description;
        if (req.body.duration !== undefined)
            updateData.duration = Number(req.body.duration);
        if (req.body.price !== undefined)
            updateData.price = Number(req.body.price);
        if (req.body.basePrice !== undefined)
            updateData.basePrice = Number(req.body.basePrice);
        if (req.body.isOnline !== undefined)
            updateData.isOnline = !!req.body.isOnline;
        if (req.body.isPresencial !== undefined)
            updateData.isPresencial = !!req.body.isPresencial;
        if (req.body.category !== undefined)
            updateData.category = req.body.category;
        if (req.body.isActive !== undefined)
            updateData.isActive = !!req.body.isActive;
        if (req.body.discountBasic !== undefined)
            updateData.discountBasic = Number(req.body.discountBasic);
        if (req.body.discountPremium !== undefined)
            updateData.discountPremium = Number(req.body.discountPremium);
        if (req.body.discountEnterprise !== undefined)
            updateData.discountEnterprise = Number(req.body.discountEnterprise);
        const data = await prisma_js_1.default.partnerService.update({
            where: { id: req.params.serviceId },
            data: updateData
        });
        return res.json(data);
    }
    catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        return res.status(500).json({ error: 'Erro ao atualizar serviço' });
    }
});
// Excluir serviço
router.delete('/services/:serviceId', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), (req, res) => {
    (async () => {
        try {
            const userId = req.user?.userId;
            if (!userId)
                return res.status(401).json({ error: 'Usuário não autenticado' });
            const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
            if (!partner)
                return res.status(404).json({ error: 'Parceiro não encontrado' });
            const existing = await prisma_js_1.default.partnerService.findFirst({
                where: { id: req.params.serviceId, partnerId: partner.id }
            });
            if (!existing)
                return res.status(404).json({ error: 'Serviço não encontrado' });
            await prisma_js_1.default.partnerService.delete({
                where: { id: req.params.serviceId }
            });
            return res.status(204).send();
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao excluir serviço' });
        }
    })();
});
// Alternar status do serviço (ativo/inativo)
router.put('/services/:serviceId/toggle-status', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), (req, res) => {
    (async () => {
        try {
            const userId = req.user?.userId;
            if (!userId)
                return res.status(401).json({ error: 'Usuário não autenticado' });
            const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
            if (!partner)
                return res.status(404).json({ error: 'Parceiro não encontrado' });
            const existing = await prisma_js_1.default.partnerService.findFirst({
                where: { id: req.params.serviceId, partnerId: partner.id }
            });
            if (!existing)
                return res.status(404).json({ error: 'Serviço não encontrado' });
            const data = await prisma_js_1.default.partnerService.update({
                where: { id: req.params.serviceId },
                data: { isActive: !existing.isActive }
            });
            return res.json(data);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao alternar status do serviço' });
        }
    })();
});
// ==================== GESTÃO DE EQUIPE (MÉDICOS) ====================
// Listar membros da equipe
router.get('/team', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const team = await prisma_js_1.default.teamMember.findMany({
            where: { partnerId: partner.id },
            orderBy: { name: 'asc' }
        });
        res.json({ data: team });
    }
    catch (error) {
        console.error('Erro ao listar equipe:', error);
        res.status(500).json({ error: 'Erro ao listar equipe' });
    }
});
// Adicionar membro à equipe
router.post('/team', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const { name, specialty, crm, email, phone } = req.body;
        if (!name || !specialty) {
            return res.status(400).json({ error: 'Nome e especialidade são obrigatórios' });
        }
        const member = await prisma_js_1.default.teamMember.create({
            data: {
                partnerId: partner.id,
                name,
                specialty,
                crm: crm || null,
                email: email || null,
                phone: phone || null
            }
        });
        res.status(201).json(member);
    }
    catch (error) {
        console.error('Erro ao criar membro da equipe:', error);
        res.status(500).json({ error: 'Erro ao criar membro da equipe' });
    }
});
// Atualizar membro da equipe
router.put('/team/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const { name, specialty, crm, isActive, email, phone } = req.body;
        const member = await prisma_js_1.default.teamMember.update({
            where: { id: req.params.id, partnerId: partner.id },
            data: { name, specialty, crm, isActive, email, phone }
        });
        res.json(member);
    }
    catch (error) {
        console.error('Erro ao atualizar membro da equipe:', error);
        res.status(500).json({ error: 'Erro ao atualizar membro da equipe' });
    }
});
// Upload de avatar do membro da equipe
router.post('/team/:id/avatar', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        const memberId = req.params.id;
        const member = await prisma_js_1.default.teamMember.findFirst({
            where: { id: memberId, partnerId: partner.id }
        });
        if (!member) {
            return res.status(404).json({ error: 'Membro da equipe não encontrado' });
        }
        const publicUrl = await storage_service_js_1.storageService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'avatars');
        const updatedMember = await prisma_js_1.default.teamMember.update({
            where: { id: memberId },
            data: { avatar: publicUrl }
        });
        res.json(updatedMember);
    }
    catch (error) {
        console.error('Erro ao fazer upload da foto:', error);
        res.status(500).json({ error: 'Erro ao processar upload da foto' });
    }
});
// Excluir membro da equipe
router.delete('/team/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        await prisma_js_1.default.teamMember.delete({
            where: { id: req.params.id, partnerId: partner.id }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Erro ao excluir membro da equipe:', error);
        res.status(500).json({ error: 'Erro ao excluir membro da equipe' });
    }
});
// ==================== UPLOAD DE DOCUMENTOS ====================
router.post('/documents/upload', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), upload.single('file'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        const { type } = req.body;
        if (!type) {
            return res.status(400).json({ error: 'O tipo de documento é obrigatório' });
        }
        const publicUrl = await storage_service_js_1.storageService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'documents');
        const doc = await prisma_js_1.default.partnerDocument.create({
            data: {
                partnerId: partner.id,
                type,
                name: req.file.originalname,
                url: publicUrl,
                status: 'PENDING'
            }
        });
        res.status(201).json(doc);
    }
    catch (error) {
        console.error('Erro no upload de documentos:', error);
        res.status(500).json({ error: 'Erro ao processar upload' });
    }
});
// Listar documentos enviados
router.get('/documents', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const docs = await prisma_js_1.default.partnerDocument.findMany({
            where: { partnerId: partner.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ data: docs });
    }
    catch (error) {
        console.error('Erro ao listar documentos:', error);
        res.status(500).json({ error: 'Erro ao listar documentos' });
    }
});
// Reviews
router.get('/reviews/stats', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findUnique({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const reviews = await prisma_js_1.default.review.findMany({
            where: { partnerId: partner.id }
        });
        const total = reviews.length;
        const avg = total > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / total : 0;
        const replied = reviews.filter(r => r.reply).length;
        // Distribuição de estrelas
        const distribution = [5, 4, 3, 2, 1].map(star => ({
            rating: star,
            count: reviews.filter(r => r.rating === star).length,
            percentage: total > 0 ? Math.round((reviews.filter(r => r.rating === star).length / total) * 100) : 0
        }));
        // Simulação de tendência (últimos 6 meses) - Em produção agrupar por mês
        const trend = [
            { month: 'Jan', avaliacoes: Math.floor(total * 0.1), media: 4.5, respondidas: Math.floor(replied * 0.1) },
            { month: 'Fev', avaliacoes: Math.floor(total * 0.15), media: 4.4, respondidas: Math.floor(replied * 0.15) },
            { month: 'Mar', avaliacoes: Math.floor(total * 0.2), media: 4.6, respondidas: Math.floor(replied * 0.2) },
            { month: 'Abr', avaliacoes: Math.floor(total * 0.25), media: 4.3, respondidas: Math.floor(replied * 0.25) },
            { month: 'Mai', avaliacoes: Math.floor(total * 0.3), media: 4.7, respondidas: Math.floor(replied * 0.3) },
            { month: 'Jun', avaliacoes: total, media: avg, respondidas: replied }
        ];
        res.json({
            averageRating: avg.toFixed(1),
            totalReviews: total,
            replyRate: total > 0 ? Math.round((replied / total) * 100) : 0,
            distribution,
            trend
        });
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas de avaliações:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});
router.get('/reviews', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({
            where: { userId }
        });
        if (!partner) {
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        }
        const reviews = await prisma_js_1.default.review.findMany({
            where: { partnerId: partner.id },
            include: {
                appointment: {
                    include: {
                        patient: {
                            include: { user: { select: { name: true, avatar: true } } }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(reviews.map(r => ({
            id: r.id,
            patientName: r.appointment.patient.user.name,
            avatar: r.appointment.patient.user.avatar,
            rating: r.rating,
            comment: r.comment,
            date: r.createdAt.toISOString(),
            service: r.appointment.notes || 'Consulta', // Ideally would have service name
            reply: r.reply,
            replyDate: r.replyDate,
            isVerified: true
        })));
    }
    catch (error) {
        console.error('Erro ao listar avaliações:', error);
        return res.status(500).json({ error: 'Erro ao listar avaliações' });
    }
});
router.post('/reviews/:reviewId/reply', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { reply } = req.body;
        const { reviewId } = req.params;
        if (!reply) {
            return res.status(400).json({ error: 'Resposta é obrigatória' });
        }
        const review = await prisma_js_1.default.review.update({
            where: { id: reviewId },
            data: {
                reply,
                replyDate: new Date()
            }
        });
        return res.json(review);
    }
    catch (error) {
        console.error('Erro ao responder avaliação:', error);
        return res.status(500).json({ error: 'Erro ao responder avaliação' });
    }
});
// --- IA & ASSISTENTE ---
// Histórico de Chat
router.get('/ai/history', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const history = await prisma_js_1.default.chatHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return res.json(history);
    }
    catch (error) {
        console.error('Erro ao buscar histórico IA:', error);
        return res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
});
// Enviar Mensagem para IA
router.post('/ai/chat', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user?.userId;
        if (!message)
            return res.status(400).json({ error: 'Mensagem é obrigatória' });
        if (!userId)
            return res.status(401).json({ error: 'Usuário não autenticado' });
        const response = await chatbot_service_js_1.ChatbotService.processPartnerQuery(message, userId);
        return res.json(response);
    }
    catch (error) {
        console.error('Erro no chat IA:', error);
        return res.status(500).json({ error: 'Erro ao processar mensagem' });
    }
});
// Listar Insights da IA
router.get('/ai/insights', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const insights = await prisma_js_1.default.aiInsight.findMany({
            where: {
                OR: [
                    { userId },
                    { userId: null } // Insights globais
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(insights);
    }
    catch (error) {
        console.error('Erro ao buscar insights IA:', error);
        return res.status(500).json({ error: 'Erro ao buscar insights' });
    }
});
// Criar Insight (CRUD)
router.post('/ai/insights', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { title, description, type, impact, category, actionable, priority } = req.body;
        const insight = await prisma_js_1.default.aiInsight.create({
            data: {
                userId,
                title,
                description,
                type,
                impact,
                category,
                actionable: actionable !== undefined ? actionable : true,
                priority: priority || 3,
                confidence: 100 // Manual/User created
            }
        });
        return res.status(201).json(insight);
    }
    catch (error) {
        console.error('Erro ao criar insight IA:', error);
        return res.status(500).json({ error: 'Erro ao criar insight' });
    }
});
// Atualizar Insight (CRUD)
router.put('/ai/insights/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { title, description, type, impact, category, actionable, priority } = req.body;
        const insight = await prisma_js_1.default.aiInsight.update({
            where: { id: req.params.id, userId },
            data: {
                title,
                description,
                type,
                impact,
                category,
                actionable,
                priority
            }
        });
        return res.json(insight);
    }
    catch (error) {
        console.error('Erro ao atualizar insight IA:', error);
        return res.status(500).json({ error: 'Erro ao atualizar insight' });
    }
});
// Excluir Insight (CRUD)
router.delete('/ai/insights/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        await prisma_js_1.default.aiInsight.delete({
            where: { id: req.params.id, userId }
        });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Erro ao excluir insight IA:', error);
        return res.status(500).json({ error: 'Erro ao excluir insight' });
    }
});
// --- RELATÓRIOS ---
router.get('/reports/stats', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate } = req.query;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const start = startDate ? new Date(String(startDate)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(String(endDate)) : new Date();
        // Período Anterior para Comparação
        const duration = end.getTime() - start.getTime();
        const prevStart = new Date(start.getTime() - duration);
        const prevEnd = new Date(start.getTime() - 1);
        const [currentPeriod, previousPeriod] = await Promise.all([
            prisma_js_1.default.appointment.findMany({
                where: {
                    partnerId: partner.id,
                    dateTime: { gte: start, lte: end }
                }
            }),
            prisma_js_1.default.appointment.findMany({
                where: {
                    partnerId: partner.id,
                    dateTime: { gte: prevStart, lte: prevEnd }
                }
            })
        ]);
        const calculateStats = async (appointments) => {
            const completed = appointments.filter(a => a.status === 'COMPLETED');
            const total = appointments.length;
            // Identificar novos pacientes (primeiro atendimento no período)
            const patientIds = Array.from(new Set(appointments.map(a => a.patientId)));
            let newPatientsCount = 0;
            if (patientIds.length > 0) {
                const firstAppointments = await prisma_js_1.default.appointment.groupBy({
                    by: ['patientId'],
                    where: { patientId: { in: patientIds }, partnerId: partner.id },
                    _min: { dateTime: true }
                });
                newPatientsCount = firstAppointments.filter(fa => fa._min.dateTime && fa._min.dateTime >= start && fa._min.dateTime <= end).length;
            }
            return {
                appointments: total,
                patients: patientIds.length,
                revenue: completed.reduce((sum, a) => sum + (a.notes?.includes('Valor:') ? parseFloat(a.notes.split('Valor:')[1]) : 150), 0),
                hours: Math.round(completed.reduce((sum, a) => sum + a.duration, 0) / 60),
                completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
                avgDuration: completed.length > 0 ? Math.round(completed.reduce((sum, a) => sum + a.duration, 0) / completed.length) : 0,
                cancellations: appointments.filter(a => a.status === 'CANCELLED').length,
                newPatients: newPatientsCount
            };
        };
        const curr = await calculateStats(currentPeriod);
        const prev = await calculateStats(previousPeriod);
        // Tendência Mensal (Últimos 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        const historicalData = await prisma_js_1.default.appointment.findMany({
            where: {
                partnerId: partner.id,
                dateTime: { gte: sixMonthsAgo },
                status: 'COMPLETED'
            },
            orderBy: { dateTime: 'asc' }
        });
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const trendMap = new Map();
        // Inicializar últimos 6 meses
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            trendMap.set(monthNames[d.getMonth()], { servicos: 0, retornos: 0, receita: 0 });
        }
        historicalData.forEach(a => {
            const month = monthNames[new Date(a.dateTime).getMonth()];
            if (trendMap.has(month)) {
                const entry = trendMap.get(month);
                entry.servicos += 1;
                entry.receita += (a.notes?.includes('Valor:') ? parseFloat(a.notes.split('Valor:')[1]) : 150);
            }
        });
        const trend = Array.from(trendMap.entries()).map(([month, data]) => ({
            month,
            ...data
        }));
        res.json({
            ...curr,
            trend,
            comparison: {
                appointments: prev.appointments,
                revenue: prev.revenue,
                patients: prev.patients
            }
        });
    }
    catch (error) {
        console.error('Erro ao gerar estatísticas de relatório:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});
router.get('/reports/:reportType/export', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { reportType } = req.params;
        const { format, startDate, endDate } = req.query;
        // Simulação de exportação - Em produção usar bibliotecas como PDFKit, ExcelJS ou CSV-writer
        // Como o tempo é curto, vamos retornar um CSV básico como demonstração de sucesso
        const content = `Relatorio;${reportType}\nData Inicio;${startDate}\nData Fim;${endDate}\nGerado em;${new Date().toISOString()}`;
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_${reportType}.${format}`);
        res.send(content);
    }
    catch (error) {
        console.error('Erro na exportação:', error);
        res.status(500).json({ error: 'Falha na exportação' });
    }
});
// --- REPASSES (PAYMENTS) ---
router.get('/payments', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const transfers = await prisma_js_1.default.transfer.findMany({
            where: { partnerId: partner.id },
            orderBy: { createdAt: 'desc' }
        });
        // Para cada transferência, buscamos os agendamentos concluídos no mês correspondente
        const payments = await Promise.all(transfers.map(async (t) => {
            const date = new Date(t.createdAt);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const appointments = await prisma_js_1.default.appointment.findMany({
                where: {
                    partnerId: partner.id,
                    status: 'COMPLETED',
                    dateTime: { gte: startOfMonth, lte: endOfMonth }
                },
                include: { patient: { include: { user: true } } }
            });
            return {
                id: t.id,
                month: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
                amount: t.amount,
                date: t.createdAt.toISOString(),
                status: t.status === 'PAID' ? 'Pago' : t.status === 'PENDING' ? 'Pendente' : 'Processando',
                type: t.type,
                serviceType: t.type === 'TRANSFER' ? 'Serviço' : (t.type || 'Serviço'), // Mapeamento para filtros
                appointments: appointments.length,
                services: appointments.map(a => ({
                    id: a.id,
                    name: a.notes?.includes('Serviço:') ? a.notes.split('Serviço:')[1].split('\n')[0].trim() : 'Consulta Médica',
                    checkInCode: a.id.slice(-6).toUpperCase(),
                    patient: a.patient?.user?.name || 'Paciente',
                    date: a.dateTime.toISOString(),
                    partnerValue: a.notes?.includes('Valor:') ? parseFloat(a.notes.split('Valor:')[1]) * 0.8 : 120, // Simulação: 80% de repasse
                    status: 'Concluído'
                }))
            };
        }));
        res.json(payments);
    }
    catch (error) {
        console.error('Erro ao buscar repasses:', error);
        res.status(500).json({ error: 'Erro interno ao buscar repasses' });
    }
});
router.get('/payments/stats', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const [totalPaid, totalPending, lastMonth, allTransfers, appointmentsCount] = await Promise.all([
            prisma_js_1.default.transfer.aggregate({
                where: { partnerId: partner.id, status: 'PAID' },
                _sum: { amount: true }
            }),
            prisma_js_1.default.transfer.aggregate({
                where: { partnerId: partner.id, status: 'PENDING' },
                _sum: { amount: true }
            }),
            prisma_js_1.default.transfer.findFirst({
                where: { partnerId: partner.id, status: 'PAID' },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_js_1.default.transfer.findMany({
                where: { partnerId: partner.id, status: 'PAID' }
            }),
            prisma_js_1.default.appointment.count({
                where: { partnerId: partner.id, status: 'COMPLETED' }
            })
        ]);
        const yearTotal = totalPaid._sum.amount || 0;
        const monthlyAverage = allTransfers.length > 0 ? yearTotal / Math.max(allTransfers.length, 1) : 0;
        res.json({
            nextPayment: totalPending._sum.amount || 0,
            nextPaymentDate: '15/' + (new Date().getMonth() + 2).toString().padStart(2, '0') + '/' + new Date().getFullYear(),
            monthlyAverage,
            totalAppointments: appointmentsCount,
            yearTotal,
            averageMargin: 80,
            totalDoctonRevenue: yearTotal * 0.25,
            growth: 12.5
        });
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas de repasses:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});
router.get('/payments/:id/receipt', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        const transfer = await prisma_js_1.default.transfer.findFirst({
            where: { id, partnerId: partner?.id }
        });
        if (!transfer || !transfer.receiptUrl) {
            return res.status(404).json({ error: 'Recibo não encontrado' });
        }
        // Mock de download de arquivo para demonstração
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=comprovante.pdf');
        res.send('Comprovante de Repasse - Docton Saúde');
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao baixar recibo' });
    }
});
router.post('/payments/anticipate', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        // Simulação de solicitação de antecipação
        res.json({ success: true, message: 'Solicitação de antecipação enviada!' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
});
// ==================== GESTÃO DE DESAFIOS ====================
router.get('/challenges', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const challenges = await gamification_service_js_1.wearablesPilotService.getPartnerChallenges(partner.id);
        res.json(challenges);
    }
    catch (error) {
        console.error('Erro ao buscar desafios:', error);
        res.status(500).json({ error: 'Erro ao buscar desafios' });
    }
});
router.post('/challenges', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const created = await gamification_service_js_1.wearablesPilotService.createChallenge({
            ...req.body,
            createdBy: partner.id,
            sponsor: partner.id // Parceiro é o patrocinador padrão
        });
        res.status(201).json(created);
    }
    catch (error) {
        console.error('Erro ao criar desafio:', error);
        res.status(500).json({ error: 'Erro ao criar desafio' });
    }
});
router.put('/challenges/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        // Verificar se o desafio pertence ao parceiro
        const challenge = await prisma_js_1.default.challenge.findFirst({ where: { id, createdBy: partner?.id } });
        if (!challenge)
            return res.status(403).json({ error: 'Sem permissão ou desafio não encontrado' });
        const updated = await gamification_service_js_1.wearablesPilotService.updateChallenge(id, req.body);
        res.json(updated);
    }
    catch (error) {
        console.error('Erro ao atualizar desafio:', error);
        res.status(500).json({ error: 'Erro ao atualizar desafio' });
    }
});
router.delete('/challenges/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        // Verificar se o desafio pertence ao parceiro
        const challenge = await prisma_js_1.default.challenge.findFirst({ where: { id, createdBy: partner?.id } });
        if (!challenge)
            return res.status(403).json({ error: 'Sem permissão ou desafio não encontrado' });
        await gamification_service_js_1.wearablesPilotService.deleteChallenge(id);
        res.status(204).send();
    }
    catch (error) {
        console.error('Erro ao excluir desafio:', error);
        res.status(500).json({ error: 'Erro ao excluir desafio' });
    }
});
// ==============================================================================
// VALIDATION CODES MONITORING
// ==============================================================================
router.get('/validation-codes/logs', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const result = await validationCode_service_js_1.validationCodeService.getLogs({
            ...req.query,
            partnerId: partner.id
        });
        res.json(result);
    }
    catch (error) {
        console.error('Erro ao buscar logs de validação:', error);
        res.status(500).json({ error: 'Erro ao buscar logs de validação' });
    }
});
router.get('/validation-codes/stats', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const stats = await validationCode_service_js_1.validationCodeService.getStats({
            ...req.query,
            partnerId: partner.id
        });
        res.json(stats);
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas de validação:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas de validação' });
    }
});
// ==============================================================================
// GESTÃO DE ATIVOS (SALAS E EQUIPAMENTOS)
// ==============================================================================
router.get('/rooms', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const rooms = await prisma_js_1.default.room.findMany({
            where: { partnerId: partner.id },
            include: { _count: { select: { appointments: true } } }
        });
        res.json({ data: rooms });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar salas' });
    }
});
router.post('/rooms', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const room = await prisma_js_1.default.room.create({
            data: {
                ...req.body,
                partnerId: partner.id
            }
        });
        res.json(room);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar sala' });
    }
});
router.delete('/rooms/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        await prisma_js_1.default.room.deleteMany({
            where: { id, partnerId: partner?.id }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao excluir sala' });
    }
});
router.get('/equipment', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const equipments = await prisma_js_1.default.equipment.findMany({
            where: { partnerId: partner.id }
        });
        res.json({ data: equipments });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar equipamentos' });
    }
});
router.post('/equipment', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const equipment = await prisma_js_1.default.equipment.create({
            data: {
                ...req.body,
                partnerId: partner.id
            }
        });
        res.json(equipment);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar equipamento' });
    }
});
router.delete('/equipment/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        await prisma_js_1.default.equipment.deleteMany({
            where: { id, partnerId: partner?.id }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao excluir equipamento' });
    }
});
// ==================== COMBOS E INTELIGÊNCIA DE RECEITA ====================
router.get('/combos', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({
            where: { userId },
            select: { id: true }
        });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const combos = await prisma_js_1.default.serviceCombo.findMany({
            where: { partnerId: partner.id },
            include: { services: true }
        });
        res.json({ data: combos });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar combos' });
    }
});
router.post('/combos', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { name, description, price, serviceIds } = req.body;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const combo = await prisma_js_1.default.serviceCombo.create({
            data: {
                name,
                description,
                price: parseFloat(price),
                partnerId: partner.id,
                services: {
                    connect: serviceIds.map((id) => ({ id }))
                }
            },
            include: { services: true }
        });
        res.status(201).json(combo);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar combo' });
    }
});
router.delete('/combos/:id', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        await prisma_js_1.default.serviceCombo.deleteMany({
            where: { id, partnerId: partner?.id }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao excluir combo' });
    }
});
router.get('/revenue/insights', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        console.log(`[Partners/Insights] Buscando insights para o usuário: ${userId}`);
        // Busca robusta pelo parceiro
        const partner = await prisma_js_1.default.partner.findFirst({
            where: {
                OR: [
                    { userId: userId },
                    { id: userId } // Caso o ID do usuário seja o mesmo do parceiro em alguns contextos
                ]
            }
        });
        if (!partner) {
            console.warn(`[Partners/Insights] 404: Parceiro não encontrado na tabela 'Partner' para userId: ${userId}.`);
            return res.status(404).json({
                error: 'Parceiro não encontrado',
                details: 'Perfil de parceiro não localizado no banco de dados. Verifique se o cadastro foi concluído.'
            });
        }
        console.log(`[Partners/Insights] Parceiro localizado: ${partner.id}. Gerando insights...`);
        const insights = await revenue_service_js_1.RevenueService.getInsights(partner.id);
        return res.json(insights);
    }
    catch (error) {
        console.error(`[Partners/Insights] Erro ao gerar insights:`, error?.message || error);
        return res.status(500).json({ error: 'Erro interno ao gerar insights' });
    }
});
router.put('/revenue/happy-hour', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { happyHourConfig } = req.body;
        const partner = await prisma_js_1.default.partner.findFirst({ where: { userId } });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        const updated = await prisma_js_1.default.partner.update({
            where: { id: partner.id },
            data: { happyHourConfig }
        });
        res.json(updated.happyHourConfig);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao salvar configuração' });
    }
});
router.get('/patients', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const partner = await prisma_js_1.default.partner.findFirst({
            where: { userId },
            select: { id: true }
        });
        if (!partner)
            return res.status(404).json({ error: 'Parceiro não encontrado' });
        // Buscar pacientes únicos que já agendaram com este parceiro
        const appointments = await prisma_js_1.default.appointment.findMany({
            where: { partnerId: partner.id },
            include: {
                patient: {
                    include: {
                        user: { select: { name: true, email: true, phone: true, avatar: true } }
                    }
                }
            },
            orderBy: { dateTime: 'desc' }
        });
        // Agrupar por paciente e calcular métricas
        const patientMap = new Map();
        appointments.forEach(app => {
            if (!app.patient)
                return;
            if (!patientMap.has(app.patientId)) {
                patientMap.set(app.patientId, {
                    id: app.patientId,
                    name: app.patient.user.name,
                    email: app.patient.user.email,
                    phone: app.patient.user?.phone || '',
                    lastVisit: app.dateTime,
                    totalVisits: 1,
                    status: 'active'
                });
            }
            else {
                const p = patientMap.get(app.patientId);
                p.totalVisits += 1;
            }
        });
        res.json(Array.from(patientMap.values()));
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar pacientes' });
    }
});
/**
 * FINANCE ENDPOINTS
 */
// Busca estatísticas financeiras e carteira
router.get('/finance/stats', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const stats = await finance_service_js_1.financeService.getWalletStats(req.user.partnerId);
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Solicita saque
router.post('/finance/payout', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { amount, bankDetails } = req.body;
        const request = await finance_service_js_1.financeService.requestPayout(req.user.partnerId, amount, bankDetails);
        res.json(request);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
/**
 * REPUTATION ENDPOINTS
 */
// Busca estatísticas de NPS e reputação
router.get('/reputation/stats', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const stats = await reputation_service_js_1.reputationService.getReputationStats(req.user.partnerId);
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Busca todas as avaliações
router.get('/reputation/reviews', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const reviews = await reputation_service_js_1.reputationService.getPartnerReviews(req.user.partnerId);
        res.json(reviews);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Responde a uma avaliação
router.post('/reputation/reviews/:reviewId/reply', auth_js_1.authenticate, (0, auth_js_1.authorize)('PARTNER'), async (req, res) => {
    try {
        const { reply } = req.body;
        const { reviewId } = req.params;
        const updatedReview = await reputation_service_js_1.reputationService.replyToReview(reviewId, req.user.partnerId, reply);
        res.json(updatedReview);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=partner.routes.js.map