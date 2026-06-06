import QRCode from 'qrcode';
import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { storageService } from './storage.service.js';
import type { ChargeResponse } from './payment-gateway.service.js';

const PAYMENTS_FOLDER = 'pix-qrcodes';

/** Gera QR Code PIX válido (data URL PNG). */
export async function buildPixQrDataUrl(pixCopyPaste: string): Promise<string> {
  return QRCode.toDataURL(pixCopyPaste, {
    width: 256,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}

/** Envia PNG do QR para Supabase Storage e retorna URL pública. */
export async function uploadPixQrToStorage(
  pixCopyPaste: string,
  gatewayChargeId: string
): Promise<string | null> {
  try {
    const buffer = await QRCode.toBuffer(pixCopyPaste, {
      width: 256,
      margin: 2,
      type: 'png',
    });
    const fileName = `${gatewayChargeId.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    const url = await storageService.uploadFile(
      buffer,
      fileName,
      'image/png',
      PAYMENTS_FOLDER,
      'patient-documents'
    );
    return url;
  } catch (err: any) {
    logger.warn(`[PaymentCharge] Upload QR Supabase falhou: ${err.message}`);
    return null;
  }
}

export async function enrichPixCharge(charge: ChargeResponse): Promise<ChargeResponse> {
  if (charge.method !== 'PIX' || !charge.pixCopyPaste) return charge;

  const dataUrl = await buildPixQrDataUrl(charge.pixCopyPaste);
  const storageUrl = await uploadPixQrToStorage(charge.pixCopyPaste, charge.gatewayId);

  return {
    ...charge,
    pixQrCode: storageUrl || dataUrl,
  };
}

export type PersistPaymentChargeInput = {
  charge: ChargeResponse;
  gatewayProvider: string;
  externalReference: string;
  description: string;
  patientId: string;
  patientUserId: string;
  appointmentId?: string | null;
  couponCode?: string | null;
  metadata?: Record<string, unknown>;
};

export async function persistPaymentCharge(input: PersistPaymentChargeInput) {
  const { charge } = input;
  const enriched =
    charge.method === 'PIX' && charge.pixCopyPaste
      ? await enrichPixCharge(charge)
      : charge;

  const record = await prisma.paymentCharge.create({
    data: {
      gatewayChargeId: enriched.gatewayId,
      gatewayProvider: input.gatewayProvider,
      externalReference: input.externalReference,
      amount: enriched.amount,
      paymentMethod: enriched.method,
      description: input.description,
      status: enriched.status,
      pixQrCode: enriched.pixQrCode || null,
      pixCopyPaste: enriched.pixCopyPaste || null,
      paymentUrl: enriched.paymentUrl || null,
      boletoLine: enriched.boletoLine || null,
      expiresAt: enriched.expiresAt,
      patientId: input.patientId,
      patientUserId: input.patientUserId,
      appointmentId: input.appointmentId || null,
      couponCode: input.couponCode || null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      updatedAt: new Date(),
    },
  });

  return { record, charge: enriched };
}

export async function getPaymentChargeForPatient(chargeId: string, patientUserId: string) {
  return prisma.paymentCharge.findFirst({
    where: {
      patientUserId,
      OR: [{ id: chargeId }, { gatewayChargeId: chargeId }],
    },
  });
}

export async function refreshPixQrForCharge(chargeId: string, patientUserId: string) {
  const existing = await getPaymentChargeForPatient(chargeId, patientUserId);
  if (!existing?.pixCopyPaste) {
    return null;
  }

  const dataUrl = await buildPixQrDataUrl(existing.pixCopyPaste);
  const storageUrl = await uploadPixQrToStorage(
    existing.pixCopyPaste,
    existing.gatewayChargeId
  );
  const pixQrCode = storageUrl || dataUrl;

  return prisma.paymentCharge.update({
    where: { id: existing.id },
    data: { pixQrCode, updatedAt: new Date() },
  });
}

/** Confirma pagamento (mock/dev ou após PIX manual validado pelo admin). */
export async function confirmPaymentCharge(chargeId: string, patientUserId: string) {
  const pending = await getPaymentChargeForPatient(chargeId, patientUserId);
  if (!pending) {
    throw new Error('Cobrança não encontrada');
  }

  const isMock =
    pending.gatewayProvider?.includes('Mock') ||
    pending.gatewayChargeId.startsWith('MOCK_');

  if (process.env.NODE_ENV === 'production' && !isMock) {
    throw new Error('Confirmação automática disponível apenas no gateway de testes');
  }

  if (pending.status === 'PAID') {
    return pending;
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentCharge.update({
      where: { id: pending.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (pending.appointmentId) {
      await tx.appointment.update({
        where: { id: pending.appointmentId },
        data: {
          status: 'CONFIRMED',
          notes: 'Pagamento confirmado',
          updatedAt: new Date(),
        },
      });
    }

    try {
      const meta = pending.metadata ? JSON.parse(pending.metadata) : {};
      const orderIds: string[] = meta.pharmacyOrderIds || [];
      for (const orderId of orderIds) {
        const existing = await tx.pharmacyOrder.findUnique({
          where: { id: orderId },
          select: { total: true, commissionAmount: true, pharmacyId: true },
        });
        if (!existing) continue;
        let commissionAmount = existing.commissionAmount;
        if (commissionAmount <= 0) {
          const ph = await tx.pharmacy.findUnique({
            where: { id: existing.pharmacyId },
            select: { commissionPercent: true },
          });
          const rate = (ph?.commissionPercent ?? 10) / 100;
          commissionAmount = Math.round(existing.total * rate * 100) / 100;
        }
        await tx.pharmacyOrder.update({
          where: { id: orderId },
          data: { status: 'RECEIVED', commissionAmount, updatedAt: new Date() },
        });
      }
      const cartItems = meta.cartItems || [];
      if (cartItems.length) {
        const { QuotationService } = await import('./quotation.service.js');
        await QuotationService.finalizeQuotationsFromCart(cartItems, { paymentSettled: true });
      }
    } catch {
      /* metadata opcional */
    }
  });

  const updated = await getPaymentChargeForPatient(chargeId, patientUserId);

  try {
    const meta = pending.metadata ? JSON.parse(pending.metadata) : {};
    const patientUserId = pending.patientUserId;
    if (patientUserId && meta.cartItems?.length) {
      const { SocketService } = await import('../lib/socket.js');
      SocketService.sendToUser(patientUserId, 'pharmacyQuoteUpdate', { source: 'payment' });
    }
    const orderIds: string[] = meta.pharmacyOrderIds || [];
    const { notifyPharmacyAboutOrder } = await import('../utils/pharmacy-order-notify.js');
    for (const orderId of orderIds) {
      const order = await prisma.pharmacyOrder.findUnique({ where: { id: orderId } });
      if (order) {
        await notifyPharmacyAboutOrder({
          pharmacyId: order.pharmacyId,
          orderId: order.id,
          total: order.total,
          status: 'RECEIVED',
          paymentMethod: order.paymentMethod || undefined,
        });
      }
    }
  } catch (notifyErr) {
    console.warn('[confirmPaymentCharge] Falha ao notificar farmácia:', notifyErr);
  }

  return updated;
}
