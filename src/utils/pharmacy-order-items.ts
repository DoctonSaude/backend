/** Nome do produto no carrinho — nunca usar o nome da farmácia como produto. */
export function cartItemProductLabel(item: {
  medicationName?: string;
  description?: string;
  title?: string;
  productName?: string;
  name?: string;
  partnerName?: string;
  items?: Array<{ name?: string; quantity?: number }>;
}): string {
  const pharmacy = (item.partnerName || '').trim().toLowerCase();
  const candidates = [
    item.medicationName,
    item.description,
    item.title,
    item.productName,
    item.name,
  ]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);

  for (const name of candidates) {
    if (!pharmacy || name.toLowerCase() !== pharmacy) {
      return name;
    }
  }

  if (item.items?.length) {
    const names = item.items.map((i) => i.name).filter(Boolean);
    if (names.length) return names.join(', ');
  }

  return 'Produto da vitrine';
}

export function formatCartItemsSummary(
  cartItems: Array<{ quantity?: number; partnerName?: string; [key: string]: unknown }>
): string {
  return cartItems
    .map((item) => {
      const label = cartItemProductLabel(item as any);
      const qty = item.quantity || 1;
      return `${label} x${qty}`;
    })
    .join(' | ');
}

const ITEMS_TAG_OPEN = '[ITEMS]';
const ITEMS_TAG_CLOSE = '[/ITEMS]';
const ADDR_TAG_OPEN = '[ADDR]';
const ADDR_TAG_CLOSE = '[/ADDR]';

/** Persiste itens + endereço no campo deliveryAddress do pedido. */
export function encodeOrderDeliveryPayload(itemsSummary: string, deliveryAddress?: string | null): string {
  const items = itemsSummary.trim();
  const addr = (deliveryAddress || '').trim();
  if (!addr) return items;
  return `${ITEMS_TAG_OPEN}${items}${ITEMS_TAG_CLOSE}${ADDR_TAG_OPEN}${addr}${ADDR_TAG_CLOSE}`;
}

export function decodeOrderDeliveryPayload(raw: string | null | undefined): {
  itemsText: string;
  addressText: string | null;
} {
  const value = raw || '';
  const itemsMatch = value.match(/\[ITEMS\]([\s\S]*?)\[\/ITEMS\]/);
  const addrMatch = value.match(/\[ADDR\]([\s\S]*?)\[\/ADDR\]/);
  if (itemsMatch) {
    return {
      itemsText: itemsMatch[1].trim(),
      addressText: addrMatch?.[1]?.trim() || null,
    };
  }
  return { itemsText: value.trim(), addressText: null };
}

export function parseSummaryLineItems(
  summary: string | null | undefined,
  orderId: string,
  orderTotal: number
) {
  const parts = (summary || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return [];

  return parts.map((part, index) => {
    const match = part.match(/^(.+?)\s+x\s*(\d+)$/i);
    const quantity = match ? Math.max(1, parseInt(match[2], 10)) : 1;
    const name = match ? match[1].trim() : part;
    return {
      id: `${orderId}-summary-${index}`,
      product: { name },
      quantity,
      price: orderTotal / parts.length,
    };
  });
}

/** Recupera itens do carrinho gravados no PaymentCharge (pedidos antigos com nome errado). */
export function buildItemsMapFromPaymentCharges(
  charges: Array<{ metadata: string | null }>,
  orders: Array<{ id: string; pharmacyId: string }>
): Map<string, ReturnType<typeof parseSummaryLineItems>> {
  const map = new Map<string, ReturnType<typeof parseSummaryLineItems>>();
  const pharmacyByOrderId = new Map(orders.map((o) => [o.id, o.pharmacyId]));

  for (const charge of charges) {
    try {
      const meta = charge.metadata ? JSON.parse(charge.metadata) : {};
      const linkedIds: string[] = meta.pharmacyOrderIds || [];
      const cartItems: any[] = meta.cartItems || [];

      for (const orderId of linkedIds) {
        if (!pharmacyByOrderId.has(orderId) || map.has(orderId)) continue;
        const pharmacyId = pharmacyByOrderId.get(orderId);
        const pharmacyItems = cartItems.filter((i) => {
          if (i.type !== 'medication' && i.type !== 'pharmacy_quote') return false;
          if (!pharmacyId || !i.partnerId) return true;
          return i.partnerId === pharmacyId;
        });
        if (!pharmacyItems.length) continue;

        map.set(
          orderId,
          pharmacyItems.map((item, index) => ({
            id: `${orderId}-meta-${index}`,
            product: { name: cartItemProductLabel(item) },
            quantity: item.quantity || 1,
            price: Number(item.price) || 0,
          }))
        );
      }
    } catch {
      /* metadata opcional */
    }
  }

  return map;
}
