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
const router = (0, express_1.Router)();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [auth_js_1.authenticate, (0, auth_js_1.authorize)('ADMIN')];
// --- API Keys ---
/**
 * @route GET /api/admin/api-keys
 */
router.get('/api-keys', ...adminAuth, async (req, res) => {
    try {
        const keys = await prisma_js_1.default.apiKey.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(keys);
    }
    catch (error) {
        res.json([]);
    }
});
/**
 * @route POST /api/admin/api-keys
 */
router.post('/api-keys', ...adminAuth, async (req, res) => {
    const b = req.body || {};
    try {
        const bcrypt = (await Promise.resolve().then(() => __importStar(require('bcryptjs')))).default;
        const raw = 'dk_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        const hash = await bcrypt.hash(raw, 10);
        const masked = `${raw.slice(0, 4)}****${raw.slice(-2)}`;
        const created = await prisma_js_1.default.apiKey.create({
            data: {
                name: String(b.name || 'Chave API'),
                keyHash: hash,
                keyMasked: masked,
                scopes: b.scopes || [],
                expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
                createdAt: new Date()
            }
        });
        res.status(201).json({ ...created, secret: raw });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar chave' });
    }
});
/**
 * @route DELETE /api/admin/api-keys/:id
 */
router.delete('/api-keys/:id', ...adminAuth, async (req, res) => {
    try {
        await prisma_js_1.default.apiKey.update({
            where: { id: req.params.id },
            data: { revoked: true }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(404).json({ error: 'Chave não encontrada' });
    }
});
// --- Webhooks ---
/**
 * @route GET /api/admin/webhooks
 */
router.get('/webhooks', ...adminAuth, async (req, res) => {
    try {
        const hooks = await prisma_js_1.default.webhook.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(hooks);
    }
    catch (error) {
        res.json([]);
    }
});
/**
 * @route POST /api/admin/webhooks
 */
router.post('/webhooks', ...adminAuth, async (req, res) => {
    const b = req.body || {};
    try {
        const created = await prisma_js_1.default.webhook.create({
            data: {
                url: String(b.url || ''),
                secret: b.secret || null,
                active: b.active !== false
            }
        });
        res.status(201).json(created);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar webhook' });
    }
});
// --- Integrations ---
/**
 * @route GET /api/admin/integrations
 */
router.get('/integrations', ...adminAuth, async (req, res) => {
    try {
        const integrations = await prisma_js_1.default.integration.findMany({ orderBy: { createdAt: 'desc' } });
        if (integrations.length === 0) {
            // Seed samples
            await prisma_js_1.default.integration.createMany({
                data: [
                    { name: 'WhatsApp API', description: 'Notificações via WhatsApp', status: 'active' },
                    { name: 'Gateway de Pagamento', description: 'Iugu/Stripe', status: 'active' },
                    { name: 'Google Calendar', description: 'Sincronização de agendas', status: 'inactive' }
                ]
            });
            return res.json(await prisma_js_1.default.integration.findMany({ orderBy: { createdAt: 'desc' } }));
        }
        return res.json(integrations);
    }
    catch (error) {
        res.json([]);
    }
});
exports.default = router;
//# sourceMappingURL=integrations.routes.js.map