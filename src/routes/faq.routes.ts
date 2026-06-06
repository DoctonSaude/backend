// @ts-nocheck
import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// Listar todos os FAQs
router.get('/', async (req, res) => {
    try {
        const faqs = await prisma.fAQ.findMany({
            orderBy: { order: 'asc' }
        });
        return res.json(faqs);
    } catch (error) {
        console.error('Erro ao listar FAQs:', error);
        return res.status(500).json({ error: 'Erro ao listar FAQs' });
    }
});

// Criar FAQ (Admin only)
router.post('/', authenticate, async (req, res) => {
    try {
        if ((req as any).user.role !== 'ADMIN') return res.status(403).json({ error: 'Proibido' });
        const { question, answer, order } = req.body;
        const faq = await prisma.fAQ.create({
            data: { 
                question, 
                answer, 
                order: order || 0,
                updatedAt: new Date()
            }
        });
        return res.status(201).json(faq);
    } catch (error) {
        console.error('Erro ao criar FAQ:', error);
        return res.status(500).json({ error: 'Erro ao criar FAQ' });
    }
});

export default router;
