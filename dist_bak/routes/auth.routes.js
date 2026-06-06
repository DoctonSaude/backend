"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const logger_js_1 = require("../lib/logger.js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const express_validator_1 = require("express-validator");
const user_crud_js_1 = require("../crud/user.crud.js");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const env_js_1 = require("../config/env.js");
const email_service_js_1 = require("../services/email.service.js");
const inAppNotification_service_js_1 = __importDefault(require("../services/inAppNotification.service.js"));
const supabase_js_1 = require("../lib/supabase.js");
const audit_service_js_1 = require("../services/audit.service.js");
const router = (0, express_1.Router)();
// Validação do corpo da requisição para login
const loginValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Email inválido'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Senha obrigatória'),
];
// Validação para registro
const registerValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Email inválido'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
    (0, express_validator_1.body)('name').trim().isLength({ min: 3 }).withMessage('Nome deve ter pelo menos 3 caracteres'),
    (0, express_validator_1.body)('role').optional().isIn(['PATIENT', 'PARTNER', 'ADMIN', 'PHARMACY']).withMessage('Role inválido'),
];
// Middleware para tratamento de erros de validação
function handleValidationErrors(req, res, next) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorArray = errors.array();
        logger_js_1.logger.warn('[auth] Erro de validação detectado:', {
            path: req.path,
            errors: errorArray,
            body: { ...req.body, password: '***' }
        });
        return res.status(400).json({
            error: 'Erro de validação',
            details: errorArray
        });
    }
    next();
}
router.post('/login', loginValidation, handleValidationErrors, async (req, res, next) => {
    try {
        const email = req.body.email?.toLowerCase().trim();
        const { password } = req.body;
        if (!email)
            return res.status(400).json({ error: 'Email é obrigatório' });
        const ip = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
        const isAdminBypass = env_js_1.env.ADMIN_DEV_BYPASS && email === 'rodrigo.vilela@docton.com' && password === '123456';
        if (isAdminBypass) {
            logger_js_1.logger.info('[auth] Admin bypass used for login', { email, ip });
            const devUser = {
                id: env_js_1.env.ADMIN_DEV_USER_ID,
                email: 'rodrigo.vilela@docton.com',
                name: 'Rodrigo Vilela',
                role: 'ADMIN',
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const token = jsonwebtoken_1.default.sign({ userId: devUser.id, role: devUser.role, email: devUser.email }, String(env_js_1.env.JWT_SECRET), { expiresIn: env_js_1.env.JWT_EXPIRES_IN });
            const { password: _pw, ...userWithoutPassword } = devUser;
            audit_service_js_1.AuditService.logAuth(devUser.id, 'LOGIN', ip, 'SUCCESS').catch(err => logger_js_1.logger.error('Audit log failed:', err));
            return res.json({ user: userWithoutPassword, token });
        }
        logger_js_1.logger.debug('[auth] Normal login attempt', { email, ip });
        let user;
        try {
            user = await user_crud_js_1.UserCrud.findByEmail(email);
        }
        catch (dbError) {
            logger_js_1.logger.error('[auth] Database error during login findByEmail:', dbError);
            return res.status(503).json({ error: 'Serviço de banco de dados temporariamente indisponível' });
        }
        if (!user) {
            logger_js_1.logger.warn('[auth] Login failed: user not found', { email, ip });
            await audit_service_js_1.AuditService.logAuth('unknown', 'LOGIN', ip, 'FAILURE');
            throw new errorHandler_js_1.AuthenticationError('Usuário não encontrado');
        }
        // Verifica a senha - APENAS HASH BCRYPT É PERMITIDO
        if (typeof user.password !== 'string' || !user.password.startsWith('$2')) {
            logger_js_1.logger.error('[auth] Login failed: invalid password format (plain-text or other)', {
                userId: user.id,
                format: typeof user.password === 'string' ? user.password.substring(0, 3) : typeof user.password
            });
            await audit_service_js_1.AuditService.logAuth(user.id, 'LOGIN', ip, 'FAILURE');
            throw new errorHandler_js_1.AuthenticationError('Acesso não permitido. Por favor, solicite a recuperação de senha.');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            logger_js_1.logger.warn('[auth] Login failed: credentials mismatch', { userId: user.id, ip });
            await audit_service_js_1.AuditService.logAuth(user.id, 'LOGIN', ip, 'FAILURE');
            throw new errorHandler_js_1.AuthenticationError('Credenciais inválidas');
        }
        logger_js_1.logger.info('[auth] Login successful', { userId: user.id, role: user.role });
        // Gera JWT
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role, email: user.email, personId: user.personId }, String(env_js_1.env.JWT_SECRET), { expiresIn: env_js_1.env.JWT_EXPIRES_IN });
        // Retorna dados do usuário e token
        const { password: _p, ...userWithoutPassword } = user;
        // Anexar status de aprovação e tipo de parceiro
        if (user.role === 'PARTNER') {
            const partner = user.Partner;
            userWithoutPassword.isApproved = partner?.isApproved ?? false;
            userWithoutPassword.partnerType = partner?.type ?? 'INDIVIDUAL';
        }
        // Anexar status de aprovação de farmácia
        if (user.role === 'PHARMACY') {
            const pharmacy = user.Pharmacy;
            userWithoutPassword.isApproved = pharmacy?.isApproved ?? false;
            userWithoutPassword.pharmacyName = pharmacy?.name ?? '';
        }
        // Anexar plano e onboarding se for PATIENT
        if (user.role === 'PATIENT') {
            const patient = user.Patient;
            userWithoutPassword.onboardingCompleted = patient?.onboardingCompleted ?? false;
            if (patient?.subscriptions?.[0]?.plan) {
                userWithoutPassword.plan = patient.subscriptions[0].plan.key;
            }
            else {
                userWithoutPassword.plan = 'basic';
            }
        }
        audit_service_js_1.AuditService.logAuth(user.id, 'LOGIN', ip, 'SUCCESS').catch(err => logger_js_1.logger.error('Audit log failed:', err));
        res.json({ user: userWithoutPassword, token });
    }
    catch (err) {
        console.error('Login error:', err);
        next(err);
    }
});
// Rota de validação de token
router.get('/validate', async (req, res, next) => {
    try {
        const { authenticate } = await Promise.resolve().then(() => __importStar(require('../middleware/auth.js')));
        // Usamos o middleware authenticate para validar o token
        authenticate(req, res, async () => {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Não autorizado' });
            }
            try {
                const user = await prisma_js_1.default.user.findUnique({
                    where: { id: userId },
                    include: {
                        Partner: {
                            select: { id: true, isApproved: true, type: true }
                        },
                        Pharmacy: {
                            select: { id: true, isApproved: true, name: true, logo: true }
                        },
                        Patient: {
                            include: {
                                subscriptions: {
                                    include: { plan: true },
                                    where: { status: 'ACTIVE' },
                                    take: 1
                                }
                            }
                        }
                    }
                });
                if (!user) {
                    return res.status(404).json({ error: 'Usuário não encontrado' });
                }
                const { password: _, ...userWithoutPassword } = user;
                // Anexar status de aprovação e tipo de parceiro se for PARTNER
                if (user.role === 'PARTNER') {
                    userWithoutPassword.isApproved = user.Partner?.isApproved ?? false;
                    userWithoutPassword.partnerType = user.Partner?.type ?? 'INDIVIDUAL';
                }
                // Anexar status de aprovação de farmácia
                if (user.role === 'PHARMACY') {
                    const isApproved = user.Pharmacy?.isApproved || user.isApproved || false;
                    userWithoutPassword.isApproved = isApproved;
                    userWithoutPassword.pharmacyName = user.Pharmacy?.name ?? '';
                }
                // Anexar plano e onboarding se for PATIENT
                if (user.role === 'PATIENT') {
                    userWithoutPassword.onboardingCompleted = user.Patient?.onboardingCompleted ?? false;
                    if (user.Patient?.subscriptions?.[0]?.plan) {
                        userWithoutPassword.plan = user.Patient.subscriptions[0].plan.key;
                    }
                    else {
                        userWithoutPassword.plan = 'basic';
                    }
                }
                return res.json({ user: userWithoutPassword });
            }
            catch (dbErr) {
                // throw dbErr; 
                return res.status(503).json({
                    error: 'Serviço de banco de dados indisponível',
                    message: dbErr?.message || 'Erro ao consultar banco de dados',
                    code: dbErr?.code || 'DB_ERROR'
                });
            }
        });
    }
    catch (err) {
        next(err);
    }
});
// Rota de registro com envio de email de verificação
router.post('/register', registerValidation, handleValidationErrors, async (req, res, next) => {
    try {
        const { password, name, role = 'PATIENT', phone } = req.body;
        const email = req.body.email?.toLowerCase().trim();
        logger_js_1.logger.info(`--- INICIANDO REGISTRO (V1.0.2) --- Role: ${role}`);
        logger_js_1.logger.info('[auth] Iniciando tentativa de registro', {
            email,
            name,
            role,
            hasPhone: !!phone,
            ip: req.headers['x-forwarded-for'] || req.ip || '127.0.0.1'
        });
        if (!email)
            return res.status(400).json({ error: 'Email é obrigatório' });
        const ip = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
        // Verificar se email já existe
        const existingUser = await user_crud_js_1.UserCrud.findByEmail(email);
        if (existingUser) {
            throw new errorHandler_js_1.ConflictError('Email já cadastrado');
        }
        // Gerar token de verificação
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 horas
        // Armazenar token no banco
        await prisma_js_1.default.verificationToken.create({
            data: {
                token: verificationToken,
                email,
                expiresAt: new Date(expiresAt)
            }
        });
        // Criar URL de verificação
        const appUrl = process.env.APP_URL || 'https://app.docton.com.br';
        const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
        // Hash da senha
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Criar usuário e entidades relacionadas em uma transação para garantir integridade
        const result = await prisma_js_1.default.$transaction(async (tx) => {
            // 1. Criar o usuário
            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    role,
                    phone
                }
            });
            let pharmacy = null;
            let partner = null;
            let patient = null;
            // 2. Criar entidades específicas baseadas no role
            if (role === 'PHARMACY') {
                const { pharmacyName, cnpj } = req.body;
                pharmacy = await tx.pharmacy.create({
                    data: {
                        name: String(pharmacyName || name),
                        cnpj: cnpj ? String(cnpj) : null,
                        isApproved: false
                    }
                });
                // Vincular o usuário à farmácia recém-criada
                await tx.user.update({
                    where: { id: newUser.id },
                    data: { pharmacyId: pharmacy.id }
                });
            }
            else if (role === 'PARTNER') {
                const { cnpj, specialty, partnerType = 'INDIVIDUAL' } = req.body;
                partner = await tx.partner.create({
                    data: {
                        userId: newUser.id,
                        name: newUser.name,
                        type: partnerType,
                        cnpj: cnpj || null,
                        specialty: specialty || null,
                        specialties: specialty ? [specialty] : [],
                        isApproved: false
                    }
                });
            }
            else if (role === 'PATIENT') {
                const tempCpf = `TEMP-${Date.now()}`;
                patient = await tx.patient.create({
                    data: {
                        userId: newUser.id,
                        cpf: tempCpf,
                        birthDate: new Date(),
                    }
                });
            }
            return { newUser, pharmacy, partner, patient };
        });
        const { newUser, pharmacy, partner, patient } = result;
        // Ações pós-transação (não-bloqueantes ou que não dependem da transação)
        // Notificações
        if (role === 'PHARMACY' && pharmacy) {
            await inAppNotification_service_js_1.default.createNotification({
                userId: null,
                type: 'pharmacy_approval',
                title: '💊 Nova Farmácia Registrada',
                message: `${pharmacy.name} se cadastrou como farmácia e aguarda aprovação.`,
                priority: 'high',
                link: '/admin/farmacias'
            }).catch(err => logger_js_1.logger.error('Erro ao notificar admin sobre nova farmácia:', err));
        }
        else if (role === 'PARTNER') {
            await inAppNotification_service_js_1.default.createNotification({
                userId: null,
                type: 'partner_approval',
                title: '🆕 Novo Parceiro Registrado',
                message: `${newUser.name} se cadastrou como parceiro e aguarda aprovação.`,
                priority: 'high',
                link: '/admin/aprovacoes'
            }).catch(err => logger_js_1.logger.error('Erro ao notificar admin sobre novo parceiro:', err));
        }
        else if (role === 'PATIENT') {
            await inAppNotification_service_js_1.default.createNotification({
                userId: null,
                type: 'new_user',
                title: '👥 Novo Paciente Registrado',
                message: `O paciente ${newUser.name} acabou de se cadastrar na plataforma.`,
                priority: 'medium',
                link: '/admin/usuarios'
            }).catch(err => logger_js_1.logger.error('Erro ao notificar admin sobre novo paciente:', err));
        }
        logger_js_1.logger.info('[auth] Email de verificação ignorado (Temporário)');
        const updatedUser = await prisma_js_1.default.user.findUnique({
            where: { id: newUser.id },
            include: { Pharmacy: true, Partner: true, Patient: true }
        });
        const { password: _, ...userWithoutPassword } = updatedUser || newUser;
        // Anexar status de aprovação de parceiro (sempre falso no registro novo)
        if (role === 'PARTNER') {
            userWithoutPassword.isApproved = false;
            userWithoutPassword.partnerType = req.body.partnerType || 'INDIVIDUAL';
        }
        // Anexar status de aprovação de farmácia
        if (role === 'PHARMACY') {
            userWithoutPassword.isApproved = false;
            userWithoutPassword.pharmacyName = req.body.pharmacyName || name;
        }
        // Gera JWT para login automático após registro
        const token = jsonwebtoken_1.default.sign({ userId: newUser.id, role: newUser.role, email: newUser.email }, String(env_js_1.env.JWT_SECRET), { expiresIn: env_js_1.env.JWT_EXPIRES_IN });
        // Audit Registration
        await audit_service_js_1.AuditService.log({
            userId: newUser.id,
            action: 'REGISTER',
            resource: 'USER',
            ipAddress: ip,
            category: 'AUTH',
            severity: 'LOW',
            status: 'SUCCESS',
            payload: { email, role }
        });
        res.status(201).json({
            message: 'Conta criada com sucesso.',
            user: {
                ...userWithoutPassword,
                plan: 'basic',
                onboardingCompleted: false // Novos registros de PATIENT começam com false
            },
            token, // Retorna o token para auto-login
            requiresEmailVerification: false, // Permitir login direto
        });
    }
    catch (err) {
        // throw err;
        next(err);
    }
});
// Rota para verificar email
router.get('/verify-email', async (req, res, next) => {
    try {
        const { token, email } = req.query;
        if (!token || !email) {
            return res.status(400).json({ error: 'Token e email são obrigatórios' });
        }
        const tokenData = await prisma_js_1.default.verificationToken.findUnique({
            where: { token: token }
        });
        if (!tokenData) {
            return res.status(400).json({ error: 'Token inválido' });
        }
        if (tokenData.email !== email) {
            return res.status(400).json({ error: 'Email não corresponde ao token' });
        }
        if (Date.now() > tokenData.expiresAt.getTime()) {
            await prisma_js_1.default.verificationToken.delete({ where: { token: token } });
            return res.status(400).json({ error: 'Token expirado' });
        }
        // Marcar email como verificado no banco
        const user = await user_crud_js_1.UserCrud.findByEmail(email);
        if (user) {
            await user_crud_js_1.UserCrud.update(user.id, { emailVerified: true });
        }
        else {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        // Remover token usado
        await prisma_js_1.default.verificationToken.delete({ where: { token: token } });
        res.json({ message: 'Email verificado com sucesso' });
    }
    catch (err) {
        next(err);
    }
});
// Rota para reenviar email de verificação
router.post('/resend-verification', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }
        const user = await user_crud_js_1.UserCrud.findByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        // Verificar se já está verificado
        if (user.emailVerified) {
            return res.status(400).json({ error: 'Email já verificado' });
        }
        // Gerar novo token
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        // Armazenar novo token no banco
        await prisma_js_1.default.verificationToken.create({
            data: {
                token: verificationToken,
                email,
                expiresAt: new Date(expiresAt)
            }
        });
        // Criar URL de verificação
        const appUrl = process.env.APP_URL || 'https://app.docton.com.br';
        const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
        // Enviar email
        try {
            await (0, email_service_js_1.sendEmail)({
                to: email,
                subject: 'Verifique seu email - Docton Saúde',
                template: 'email-verification',
                data: {
                    name: user.name,
                    email,
                    verificationUrl,
                },
            });
            res.json({ message: 'Email de verificação reenviado com sucesso' });
        }
        catch (emailError) {
            console.error('Erro ao reenviar email:', emailError);
            throw new Error('Erro ao reenviar email de verificação');
        }
    }
    catch (err) {
        next(err);
    }
});
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body || {};
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }
        const { error } = await supabase_js_1.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.APP_URL || 'https://app.docton.com.br'}/reset-password`,
        });
        if (error) {
            console.error('Supabase forgot-password error:', error);
            return res.status(error.status || 500).json({ error: error.message });
        }
        res.json({ message: 'Se o email existir, enviaremos instruções para recuperação.' });
    }
    catch (err) {
        next(err);
    }
});
router.post('/reset-password', async (req, res, next) => {
    try {
        const { newPassword } = req.body || {};
        if (!newPassword || typeof newPassword !== 'string') {
            return res.status(400).json({ error: 'Nova senha é obrigatória' });
        }
        const { error } = await supabase_js_1.supabase.auth.updateUser({ password: newPassword });
        if (error) {
            console.error('Supabase reset-password error:', error);
            return res.status(error.status || 500).json({ error: error.message });
        }
        res.json({ message: 'Senha atualizada com sucesso' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map