import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { quotePaymentService } from '../services/quote-payment.service.js';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = Router();

// Schema de validação
const createPaymentSchema = z.object({
    quoteId: z.string().min(1),
    paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'BOLETO']),
    patientData: z.object({
        name: z.string().min(1),
        cpfCnpj: z.string().min(11),
        email: z.string().email().optional(),
        phone: z.string().optional()
    })
});

/**
 * POST /api/quote-payments/create
 * Cria um novo pagamento para uma cotação
 */
router.post('/create', authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }
        const validatedData = createPaymentSchema.parse(req.body);
        const patientId = userId;
        const payment = await (quotePaymentService as any).createQuotePayment({
            quoteId: validatedData.quoteId,
            patientId: patientId,
            paymentMethod: validatedData.paymentMethod,
            patientData: {
                name: validatedData.patientData.name,
                cpfCnpj: validatedData.patientData.cpfCnpj,
                email: validatedData.patientData.email,
                phone: validatedData.patientData.phone
            }
        });
        res.json({
            success: true,
            data: payment
        });
    }
    catch (error) {
        console.error('[QuotePayments Routes] Create payment error:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                details: error.errors
            });
        }
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao criar pagamento'
        });
    }
});

/**
 * GET /api/quote-payments/:id/status
 * Obtém status de um pagamento
 */
router.get('/:id/status', authenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }
        const payment = await (quotePaymentService as any).getPaymentStatus(id);
        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Pagamento não encontrado'
            });
        }
        res.json({
            success: true,
            data: payment
        });
    }
    catch (error) {
        console.error('[QuotePayments Routes] Get status error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao obter status do pagamento'
        });
    }
});

/**
 * POST /api/quote-payments/:id/cancel
 * Cancela um pagamento
 */
router.post('/:id/cancel', authenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }
        await (quotePaymentService as any).cancelPayment(id);
        res.json({
            success: true,
            message: 'Pagamento cancelado com sucesso'
        });
    }
    catch (error) {
        console.error('[QuotePayments Routes] Cancel payment error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao cancelar pagamento'
        });
    }
});

/**
 * GET /api/quote-payments/patient
 * Lista pagamentos do paciente
 */
router.get('/patient', authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }
        const page = parseInt(String(req.query.page)) || 1;
        const limit = parseInt(String(req.query.limit)) || 10;
        const result = await (quotePaymentService as any).getPatientPayments(userId, page, limit);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('[QuotePayments Routes] List payments error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao listar pagamentos'
        });
    }
});

/**
 * POST /api/quote-payments/webhook
 * Webhook para notificações do Asaas
 */
router.post('/webhook', async (req: any, res: any) => {
    try {
        const { event, payment } = req.body;
        console.log('[QuotePayments Routes] Webhook received:', { event, paymentId: payment?.id });
        // Verificar se é um evento de pagamento confirmado
        const externalReference = String(payment?.externalReference || '');
        let quoteId: string | null = null;

        if (event === 'PAYMENT_CONFIRMED') {
            if (externalReference.startsWith('quote_payment_')) {
                quoteId = externalReference.replace('quote_payment_', '');
            } else if (externalReference.startsWith('quotation_')) {
                quoteId = externalReference.replace('quotation_', '');
            }
        }

        if (quoteId) {
            // Encontrar pagamento pelo quoteId na tabela QuotationPayment
            const quotePayment = await prisma.quotationPayment.findUnique({
                where: { quotationId: quoteId }
            });
            if (quotePayment) {
                await quotePaymentService.confirmPayment(quotePayment.id);
                console.log(`[QuotePayments Routes] Payment confirmed for quote ${quoteId}`);
            }
        }
        // Responder ao Asaas
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('[QuotePayments Routes] Webhook error:', error);
        // Mesmo com erro, responder OK para não retentativas
        res.status(200).send('OK');
    }
});

export default router;
