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
const auth_js_1 = require("../../middleware/auth.js");
const prisma_js_1 = __importDefault(require("../../lib/prisma.js"));
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN')];
/**
 * @route GET /api/admin/users
 */
router.get('/users', ...adminAuth, async (req, res) => {
    try {
        const { role, q, page = '1', limit = '10' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (role && role !== 'all')
            where.role = role;
        if (q) {
            where.OR = [
                { name: { contains: String(q), mode: 'insensitive' } },
                { email: { contains: String(q), mode: 'insensitive' } }
            ];
        }
        const [users, total] = await Promise.all([
            prisma_js_1.default.user.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
                select: { id: true, name: true, email: true, role: true, createdAt: true, emailVerified: true, avatar: true }
            }),
            prisma_js_1.default.user.count({ where })
        ]);
        return res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});
/**
 * @route GET /api/admin/users/:id
 */
router.get('/users/:id', ...adminAuth, async (req, res) => {
    try {
        const user = await prisma_js_1.default.user.findUnique({
            where: { id: req.params.id },
            include: {
                patient: true,
                partner: true,
                pharmacy: true
            }
        });
        if (!user)
            return res.status(404).json({ error: 'Usuário não encontrado' });
        // Remove sensitive data
        const { password, ...safeUser } = user;
        return res.json(safeUser);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});
/**
 * @route POST /api/admin/users
 */
router.post('/users', ...adminAuth, async (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(2),
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(6),
        role: zod_1.z.enum(['ADMIN', 'PATIENT', 'PARTNER', 'PHARMACY', 'SUPPORT']).default('PATIENT')
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Dados inválidos', issues: parsed.error.issues });
    try {
        const bcrypt = (await Promise.resolve().then(() => __importStar(require('bcryptjs')))).default;
        const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
        const created = await prisma_js_1.default.user.create({
            data: {
                ...parsed.data,
                password: hashedPassword,
                emailVerified: true
            }
        });
        const { password, ...safeUser } = created;
        return res.status(201).json(safeUser);
    }
    catch (error) {
        if (error.code === 'P2002')
            return res.status(409).json({ error: 'Email já cadastrado' });
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});
/**
 * @route PUT /api/admin/users/:id
 */
router.put('/users/:id', ...adminAuth, async (req, res) => {
    const body = req.body || {};
    try {
        const update = {
            ...(typeof body.name === 'string' ? { name: body.name } : {}),
            ...(typeof body.email === 'string' ? { email: body.email } : {}),
            ...(typeof body.role === 'string' ? { role: body.role } : {}),
            ...(typeof body.emailVerified === 'boolean' ? { emailVerified: body.emailVerified } : {}),
        };
        if (body.password) {
            const bcrypt = (await Promise.resolve().then(() => __importStar(require('bcryptjs')))).default;
            update.password = await bcrypt.hash(String(body.password), 10);
        }
        const updated = await prisma_js_1.default.user.update({
            where: { id: req.params.id },
            data: update
        });
        const { password, ...safeUser } = updated;
        return res.json(safeUser);
    }
    catch (error) {
        res.status(404).json({ error: 'Usuário não encontrado ou erro na atualização' });
    }
});
/**
 * @route DELETE /api/admin/users/:id
 */
router.delete('/users/:id', ...adminAuth, async (req, res) => {
    try {
        await prisma_js_1.default.user.delete({ where: { id: req.params.id } });
        return res.json({ success: true });
    }
    catch (error) {
        res.status(404).json({ error: 'Usuário não encontrado' });
    }
});
/**
 * @route GET /api/admin/roles
 */
router.get('/roles', ...adminAuth, async (req, res) => {
    try {
        const roles = await prisma_js_1.default.role.findMany({ include: { permissions: true } });
        if (roles.length === 0) {
            // Seed roles if empty
            const defaultRoles = [
                { name: 'ADMIN', description: 'Acesso total ao sistema' },
                { name: 'SUPPORT', description: 'Atendimento e suporte ao cliente' },
                { name: 'FINANCIAL', description: 'Gestão de faturamento e pagamentos' },
                { name: 'MARKETING', description: 'Gestão de blog, cupons e campanhas' }
            ];
            await prisma_js_1.default.role.createMany({ data: defaultRoles });
            return res.json(await prisma_js_1.default.role.findMany());
        }
        return res.json(roles);
    }
    catch (error) {
        res.json([]);
    }
});
exports.default = router;
//# sourceMappingURL=users.routes.js.map