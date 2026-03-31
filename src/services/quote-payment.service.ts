import prisma from '../lib/prisma.js';
import { asaasService } from './asaas.service.js';

export class QuotePaymentService {
    /**
     * Cria um pagamento para uma cotação aprovada
     */
    async createQuotePayment(request) {
        const { quoteId, patientId, paymentMethod, patientData } = request;
        // 1. Validar cotação
        const quote = await (prisma as any).pharmacyQuote.findUnique({
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
        const existingPayment = await (prisma as any).quotePayment.findUnique({
            where: { quoteId }
        });
        if (existingPayment) {
            throw new Error('Já existe um pagamento para esta cotação');
        }
        // 2. Obter resposta selecionada
        const selectedResponse = (quote.responses || []).find((r: any) => r.id === quote.selectedResponseId);
        if (!selectedResponse) {
            throw new Error('Resposta da farmácia não selecionada');
        }
        const totalAmount = selectedResponse.totalPrice || 0;
        // 3. Criar cliente no Asaas (se não existir)
        const asaasCustomer = await asaasService.getOrCreateCustomer({
            name: patientData.name,
            cpfCnpj: patientData.cpfCnpj,
            email: patientData.email,
            mobilePhone: patientData.phone
        });
        // 4. Criar cobrança no Asaas
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3); // 3 dias para vencimento
        const asaasCharge = await asaasService.createPixCharge({
            customerId: asaasCustomer.id,
            value: totalAmount,
            description: `Pagamento cotação #${quoteId}`,
            externalReference: `quote_payment_${quoteId}`
        });
        // 5. Salvar pagamento no banco
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas para pagamento PIX
        const quotePayment = await (prisma as any).quotePayment.create({
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
                paymentUrl: (undefined as any), // PIX não tem invoiceUrl
                expiresAt
            }
        });
        console.log(`[QuotePaymentService] Payment created for quote ${quoteId}, amount R$${totalAmount}`);
        return {
            id: quotePayment.id,
            status: quotePayment.status,
            paymentMethod: quotePayment.paymentMethod,
            amount: quotePayment.amount,
            pixQrCode: (quotePayment as any).pixQrCode || undefined,
            pixCopyPaste: (quotePayment as any).pixCopyPaste || undefined,
            paymentUrl: (quotePayment as any).paymentUrl || undefined,
            expiresAt: quotePayment.expiresAt.toISOString()
        };
    }
    /**
     * Obtém status de um pagamento
     */
    async getPaymentStatus(paymentId: string) {
        const payment = await (prisma as any).quotePayment.findUnique({
            where: { id: paymentId }
        });
        if (!payment) {
            return null;
        }
        // Se ainda estiver pendente, verificar status no Asaas
        if (payment.status === 'PENDING' && (payment as any).asaasChargeId) {
            try {
                // TODO: Implementar getCharge no AsaasService
                // const asaasCharge = await asaasService.getCharge(payment.asaasChargeId);
                // Por enquanto, simular status
                const asaasCharge = { status: 'PENDING' };
                if (asaasCharge.status === 'PAID') {
                    await this.confirmPayment(paymentId);
                    (payment as any).status = 'PAID';
                    (payment as any).paidAt = new Date();
                }
                else if (asaasCharge.status === 'OVERDUE') {
                    await (prisma as any).quotePayment.update({
                        where: { id: paymentId },
                        data: { status: 'EXPIRED' }
                    });
                    (payment as any).status = 'EXPIRED';
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
            pixQrCode: (payment as any).pixQrCode || undefined,
            pixCopyPaste: (payment as any).pixCopyPaste || undefined,
            paymentUrl: (payment as any).paymentUrl || undefined,
            expiresAt: payment.expiresAt.toISOString()
        };
    }
    /**
     * Confirma pagamento (chamado pelo webhook)
     */
    async confirmPayment(paymentId: string) {
        const now = new Date();
        await (prisma as any).$transaction(async (tx: any) => {
            await (tx as any).quotePayment.update({
                where: { id: paymentId },
                data: {
                    status: 'PAID',
                    paidAt: now
                }
            });
            const payment = await (tx as any).quotePayment.findUnique({ where: { id: paymentId } });
            if (payment?.quoteId) {
                await (tx as any).pharmacyQuote.update({
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
    async cancelPayment(paymentId: string) {
        const payment = await (prisma as any).quotePayment.findUnique({
            where: { id: paymentId }
        });
        if (!payment || payment.status !== 'PENDING') {
            throw new Error('Pagamento não pode ser cancelado');
        }
        // Cancelar no Asaas se existir
        if ((payment as any).asaasChargeId) {
            try {
                // TODO: Implementar deleteCharge no AsaasService
                console.log(`[QuotePaymentService] Would cancel Asaas charge ${(payment as any).asaasChargeId}`);
            }
            catch (error) {
                console.error('[QuotePaymentService] Error canceling Asaas charge:', error);
            }
        }
        // Atualizar status
        await (prisma as any).quotePayment.update({
            where: { id: paymentId },
            data: { status: 'CANCELLED' }
        });
    }
    /**
     * Lista pagamentos do paciente
     */
    async listPayments(filters: any = {}) {
        const { patientId, pharmacyId, status, skip = 0, take = 20 } = filters;

        const [items, total] = await Promise.all([
            (prisma as any).quotePayment.findMany({
                where: {
                    ...(patientId && { patientId }),
                    ...(pharmacyId && { pharmacyId }),
                    ...(status && { status }),
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            (prisma as any).quotePayment.count({
                where: {
                    ...(patientId && { patientId }),
                    ...(pharmacyId && { pharmacyId }),
                    ...(status && { status }),
                }
            })
        ]);
        return {
            payments: items.map((payment: any) => ({
                id: payment.id,
                quoteId: (payment as any).quoteId,
                amount: payment.amount,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                createdAt: payment.createdAt,
                expiresAt: payment.expiresAt,
                paidAt: (payment as any).paidAt,
                pharmacy: null // TODO: Buscar dados da farmácia separadamente
            })),
            total,
            skip,
            take,
            totalPages: Math.ceil(total / take)
        };
    }
}
export const quotePaymentService = new QuotePaymentService();
