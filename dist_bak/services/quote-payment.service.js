"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotePaymentService = exports.QuotePaymentService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const asaas_service_js_1 = require("./asaas.service.js");
class QuotePaymentService {
    /**
     * Cria um pagamento para uma cotação aprovada
     */
    async createQuotePayment(request) {
        const { quoteId, patientId, paymentMethod, patientData } = request;
        // 1. Validar cotação
        const quote = await prisma_js_1.default.pharmacyQuote.findUnique({
            where: { id: quoteId },
            include: {
                patient: true,
                responses: {
                    include: {
                        pharmacy: true
                    }
                }
            }
        });
        if (!quote) {
            throw new Error('Cotação não encontrada');
        }
        if (quote.patientId !== patientId) {
            throw new Error('Cotação não pertence ao paciente');
        }
        if (quote.status !== 'CONFIRMED') {
            throw new Error('Cotação não está confirmada para pagamento');
        }
        // Verificar se já existe pagamento
        const existingPayment = await prisma_js_1.default.quotePayment.findUnique({
            where: { quoteId }
        });
        if (existingPayment) {
            throw new Error('Já existe um pagamento para esta cotação');
        }
        // 2. Obter resposta selecionada
        const selectedResponse = (quote.responses || []).find((r) => r.id === quote.selectedResponseId);
        if (!selectedResponse) {
            throw new Error('Resposta da farmácia não selecionada');
        }
        const totalAmount = selectedResponse.totalPrice || 0;
        // 3. Criar cliente no Asaas (se não existir)
        const asaasCustomer = await asaas_service_js_1.asaasService.getOrCreateCustomer({
            name: patientData.name,
            cpfCnpj: patientData.cpfCnpj,
            email: patientData.email,
            mobilePhone: patientData.phone
        });
        // 4. Criar cobrança no Asaas
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3); // 3 dias para vencimento
        const asaasCharge = await asaas_service_js_1.asaasService.createPixCharge({
            customerId: asaasCustomer.id,
            value: totalAmount,
            description: `Pagamento cotação #${quoteId}`,
            externalReference: `quote_payment_${quoteId}`
        });
        // 5. Salvar pagamento no banco
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas para pagamento PIX
        const quotePayment = await prisma_js_1.default.quotePayment.create({
            data: {
                quoteId,
                patientId,
                pharmacyId: selectedResponse.pharmacyId,
                amount: totalAmount,
                paymentMethod,
                status: 'PENDING',
                asaasChargeId: asaasCharge.id,
                asaasCustomerId: asaasCustomer.id,
                pixQrCode: asaasCharge.pixQrCode?.encodedImage,
                pixCopyPaste: asaasCharge.pixQrCode?.payload,
                paymentUrl: undefined, // PIX não tem invoiceUrl
                expiresAt
            }
        });
        console.log(`[QuotePaymentService] Payment created for quote ${quoteId}, amount R$${totalAmount}`);
        return {
            id: quotePayment.id,
            status: quotePayment.status,
            paymentMethod: quotePayment.paymentMethod,
            amount: quotePayment.amount,
            pixQrCode: quotePayment.pixQrCode || undefined,
            pixCopyPaste: quotePayment.pixCopyPaste || undefined,
            paymentUrl: quotePayment.paymentUrl || undefined,
            expiresAt: quotePayment.expiresAt.toISOString()
        };
    }
    /**
     * Obtém status de um pagamento
     */
    async getPaymentStatus(paymentId) {
        const payment = await prisma_js_1.default.quotePayment.findUnique({
            where: { id: paymentId }
        });
        if (!payment) {
            return null;
        }
        // Se ainda estiver pendente, verificar status no Asaas
        if (payment.status === 'PENDING' && payment.asaasChargeId) {
            try {
                // TODO: Implementar getCharge no AsaasService
                // const asaasCharge = await asaasService.getCharge(payment.asaasChargeId);
                // Por enquanto, simular status
                const asaasCharge = { status: 'PENDING' };
                if (asaasCharge.status === 'PAID') {
                    await this.confirmPayment(paymentId);
                    payment.status = 'PAID';
                    payment.paidAt = new Date();
                }
                else if (asaasCharge.status === 'OVERDUE') {
                    await prisma_js_1.default.quotePayment.update({
                        where: { id: paymentId },
                        data: { status: 'EXPIRED' }
                    });
                    payment.status = 'EXPIRED';
                }
            }
            catch (error) {
                console.error('[QuotePaymentService] Error checking Asaas status:', error);
            }
        }
        return {
            id: payment.id,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            amount: payment.amount,
            pixQrCode: payment.pixQrCode || undefined,
            pixCopyPaste: payment.pixCopyPaste || undefined,
            paymentUrl: payment.paymentUrl || undefined,
            expiresAt: payment.expiresAt.toISOString()
        };
    }
    /**
     * Confirma pagamento (chamado pelo webhook)
     */
    async confirmPayment(paymentId) {
        const now = new Date();
        await prisma_js_1.default.$transaction(async (tx) => {
            await tx.quotePayment.update({
                where: { id: paymentId },
                data: {
                    status: 'PAID',
                    paidAt: now
                }
            });
            const payment = await tx.quotePayment.findUnique({ where: { id: paymentId } });
            if (payment?.quoteId) {
                await tx.pharmacyQuote.update({
                    where: { id: payment.quoteId },
                    data: {
                        status: 'PAID'
                    }
                });
            }
        });
    }
    /**
     * Cancela um pagamento
     */
    async cancelPayment(paymentId) {
        const payment = await prisma_js_1.default.quotePayment.findUnique({
            where: { id: paymentId }
        });
        if (!payment || payment.status !== 'PENDING') {
            throw new Error('Pagamento não pode ser cancelado');
        }
        // Cancelar no Asaas se existir
        if (payment.asaasChargeId) {
            try {
                // TODO: Implementar deleteCharge no AsaasService
                console.log(`[QuotePaymentService] Would cancel Asaas charge ${payment.asaasChargeId}`);
            }
            catch (error) {
                console.error('[QuotePaymentService] Error canceling Asaas charge:', error);
            }
        }
        // Atualizar status
        await prisma_js_1.default.quotePayment.update({
            where: { id: paymentId },
            data: { status: 'CANCELLED' }
        });
    }
    /**
     * Lista pagamentos do paciente
     */
    async listPayments(filters = {}) {
        const { patientId, pharmacyId, status, skip = 0, take = 20 } = filters;
        const [items, total] = await Promise.all([
            prisma_js_1.default.quotePayment.findMany({
                where: {
                    ...(patientId && { patientId }),
                    ...(pharmacyId && { pharmacyId }),
                    ...(status && { status }),
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            prisma_js_1.default.quotePayment.count({
                where: {
                    ...(patientId && { patientId }),
                    ...(pharmacyId && { pharmacyId }),
                    ...(status && { status }),
                }
            })
        ]);
        return {
            payments: items.map((payment) => ({
                id: payment.id,
                quoteId: payment.quoteId,
                amount: payment.amount,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                createdAt: payment.createdAt,
                expiresAt: payment.expiresAt,
                paidAt: payment.paidAt,
                pharmacy: null // TODO: Buscar dados da farmácia separadamente
            })),
            total,
            skip,
            take,
            totalPages: Math.ceil(total / take)
        };
    }
}
exports.QuotePaymentService = QuotePaymentService;
exports.quotePaymentService = new QuotePaymentService();
//# sourceMappingURL=quote-payment.service.js.map