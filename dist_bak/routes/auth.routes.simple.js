"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
// Validação para registro
const registerValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Email inválido'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
    (0, express_validator_1.body)('name').notEmpty().withMessage('Nome é obrigatório'),
];
// Validação para login
const loginValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Email inválido'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Senha é obrigatória'),
];
// Middleware para validar erros
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};
// Rota de registro simplificada - sem persistência
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
    try {
        const { email, password, name, role = 'PATIENT', phone } = req.body;
        // Log do registro (sem salvar no banco)
        console.log(`[Auth] Registration attempt:`, {
            email,
            name,
            role,
            phone,
            timestamp: new Date().toISOString()
        });
        // Gerar hash da senha
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Gerar token JWT
        const token = jsonwebtoken_1.default.sign({
            email,
            name,
            role,
            iat: Math.floor(Date.now() / 1000)
        }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });
        // Resposta de sucesso (simulada)
        res.status(201).json({
            success: true,
            message: 'Usuário registrado com sucesso (modo de desenvolvimento)',
            data: {
                user: {
                    id: `temp-${Date.now()}`,
                    email,
                    name,
                    role,
                    phone,
                    isActive: true,
                    createdAt: new Date().toISOString()
                },
                token
            }
        });
    }
    catch (error) {
        console.error('[Auth] Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to register user'
        });
    }
});
// Rota de login simplificada
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
    try {
        const { email, password } = req.body;
        // Log da tentativa de login
        console.log(`[Auth] Login attempt:`, {
            email,
            timestamp: new Date().toISOString()
        });
        // Simular verificação (em produção, verificar no banco)
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Gerar token JWT
        const token = jsonwebtoken_1.default.sign({
            email,
            iat: Math.floor(Date.now() / 1000)
        }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });
        res.status(200).json({
            success: true,
            message: 'Login realizado com sucesso (modo de desenvolvimento)',
            data: {
                user: {
                    id: `temp-${Date.now()}`,
                    email,
                    name: 'Development User',
                    role: 'PATIENT',
                    isActive: true
                },
                token
            }
        });
    }
    catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to login'
        });
    }
});
// Rota para verificar token
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        // Verificar token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: `temp-${decoded.iat}`,
                    email: decoded.email,
                    name: decoded.name || 'Development User',
                    role: decoded.role || 'PATIENT'
                }
            }
        });
    }
    catch (error) {
        console.error('[Auth] Token verification error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.simple.js.map