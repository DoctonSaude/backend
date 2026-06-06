import prisma from '../lib/prisma.js';
import { SocketService } from '../lib/socket.js';
import inAppNotificationService from '../services/inAppNotification.service.js';

const PHARMACY_ORDERS_LINK = '/pharmacy/pedidos?tab=orders';

export async function notifyPharmacyAboutOrder(params: {
  pharmacyId: string;
  orderId: string;
  total: number;
  status: 'PENDING_PAYMENT' | 'RECEIVED';
  paymentMethod?: string;
}) {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: params.pharmacyId },
    include: { User: { select: { id: true } } },
  });
  if (!pharmacy?.User?.length) return;

  const shortId = params.orderId.slice(-6).toUpperCase();
  const amount = Number(params.total).toFixed(2);
  const isPaid = params.status === 'RECEIVED';

  const title = isPaid
    ? 'Novo pedido pago — preparar envio'
    : 'Novo pedido aguardando pagamento';
  const message = isPaid
    ? `Pedido #${shortId} — R$ ${amount}. Inicie a separação em Pedidos Confirmados.`
    : `Pedido #${shortId} — R$ ${amount} (${params.paymentMethod || 'pagamento'}).`;
  for (const phUser of pharmacy.User) {
    try {
      await inAppNotificationService.createNotification({
        userId: phUser.id,
        type: 'SYSTEM',
        title,
        message,
        priority: 'high',
        link: PHARMACY_ORDERS_LINK,
        data: { orderId: params.orderId, status: params.status },
      });
    } catch (err) {
      console.warn('[notifyPharmacyAboutOrder] Falha in-app:', err);
    }
  }

  SocketService.sendToPharmacy(params.pharmacyId, 'pharmacy:newOrder', {
    orderId: params.orderId,
    status: params.status,
    total: params.total,
  });
}
