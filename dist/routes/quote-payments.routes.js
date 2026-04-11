"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const quote_payment_service_js_1 = require("../services/quote-payment.service.js");
const zod_1 = require("zod");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const router = (0, express_1.Router)();
// Schema de validação
const createPaymentSchema = zod_1.z.object({
    quoteId: zod_1.z.string().min(1),
    paymentMethod: zod_1.z.enum(['PIX', 'CREDIT_CARD', 'BOLETO']),
    patientData: zod_1.z.object({
        name: zod_1.z.string().min(1),
        cpfCnpj: zod_1.z.string().min(11),
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().optional()
    })
});
/**
 * POST /api/quote-payments/create
 * Cria um novo pagamento para uma cotação
 */
router.post('/create', auth_js_1.authenticate, async (req, res) => {
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
        const payment = await quote_payment_service_js_1.quotePaymentService.createQuotePayment({
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
        if (error instanceof zod_1.z.ZodError) {
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
router.get('/:id/status', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }
        const payment = await quote_payment_service_js_1.quotePaymentService.getPaymentStatus(id);
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
router.post('/:id/cancel', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }
        await quote_payment_service_js_1.quotePaymentService.cancelPayment(id);
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
router.get('/patient', auth_js_1.authenticate, async (req, res) => {
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
        const result = await quote_payment_service_js_1.quotePaymentService.getPatientPayments(userId, page, limit);
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
router.post('/webhook', async (req, res) => {
    try {
        const { event, payment } = req.body;
        console.log('[QuotePayments Routes] Webhook received:', { event, paymentId: payment?.id });
        // Verificar se é um evento de pagamento confirmado
        if (event === 'PAYMENT_CONFIRMED' && payment?.externalReference?.startsWith('quote_payment_')) {
            const quoteId = payment.externalReference.replace('quote_payment_', '');
            // Encontrar pagamento pelo quoteId
            const quotePayment = await prisma_js_1.default.quotePayment.findUnique({
                where: { quoteId }
            });
            if (quotePayment) {
                await quote_payment_service_js_1.quotePaymentService.confirmPayment(quotePayment.id);
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
exports.default = router;
//# sourceMappingURL=quote-payments.routes.js.map