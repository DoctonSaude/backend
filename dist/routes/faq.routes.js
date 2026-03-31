"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Listar todos os FAQs
router.get('/', async (req, res) => {
    try {
        const faqs = await prisma_1.default.fAQ.findMany({
            orderBy: { order: 'asc' }
        });
        return res.json(faqs);
    }
    catch (error) {
        console.error('Erro ao listar FAQs:', error);
        return res.status(500).json({ error: 'Erro ao listar FAQs' });
    }
});
// Criar FAQ (Admin only)
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN')
            return res.status(403).json({ error: 'Proibido' });
        const { question, answer, order } = req.body;
        const faq = await prisma_1.default.fAQ.create({
            data: { question, answer, order: order || 0 }
        });
        return res.status(201).json(faq);
    }
    catch (error) {
        console.error('Erro ao criar FAQ:', error);
        return res.status(500).json({ error: 'Erro ao criar FAQ' });
    }
});
exports.default = router;
//# sourceMappingURL=faq.routes.js.map