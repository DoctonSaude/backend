import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { pharmacyService } from './pharmacy.service.js';

export type MedicationSubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export type MedicationSubscriptionDto = {
  id: string;
  patientId: string;
  pharmacyId: string | null;
  medicationName: string;
  dosage: string;
  quantity: number;
  frequencyDays: number;
  nextRefillDate: string;
  status: MedicationSubscriptionStatus;
  discountPercent: number;
  autoRefill: boolean;
  paymentMethod: string | null;
  lastRefillDate: string | null;
  totalRefills: number;
  createdAt: string;
  updatedAt: string;
  pharmacy: { id: string; name: string; phone: string | null; city?: string | null } | null;
};

function mapSubscription(row: {
  id: string;
  patientId: string;
  pharmacyId: string | null;
  medicationName: string;
  dosage: string | null;
  quantity: number;
  frequencyDays: number;
  nextRefillDate: Date;
  status: string;
  discountPercent: number;
  autoRefill: boolean;
  paymentMethod: string | null;
  lastRefillDate: Date | null;
  totalRefills: number;
  createdAt: Date;
  updatedAt: Date;
  Pharmacy?: { id: string; name: string; phone: string | null; city?: string | null } | null;
  pharmacy?: { id: string; name: string; phone: string | null; city?: string | null } | null;
}): MedicationSubscriptionDto {
  const ph = row.Pharmacy ?? row.pharmacy ?? null;
  return {
    id: row.id,
    patientId: row.patientId,
    pharmacyId: row.pharmacyId,
    medicationName: row.medicationName,
    dosage: row.dosage ?? '',
    quantity: row.quantity,
    frequencyDays: row.frequencyDays,
    nextRefillDate: row.nextRefillDate.toISOString(),
    status: row.status as MedicationSubscriptionStatus,
    discountPercent: row.discountPercent,
    autoRefill: row.autoRefill,
    paymentMethod: row.paymentMethod,
    lastRefillDate: row.lastRefillDate?.toISOString() ?? null,
    totalRefills: row.totalRefills,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    pharmacy: ph
      ? {
          id: ph.id,
          name: ph.name,
          phone: ph.phone,
          city: ph.city ?? null,
        }
      : null,
  };
}

const subscriptionInclude = {
  Pharmacy: {
    select: { id: true, name: true, phone: true, city: true },
  },
} as const;

export async function resolvePatientIdByUserId(userId: string): Promise<string | null> {
  const patient = await prisma.patient.findUnique({
    where: { userId },
    select: { id: true },
  });
  return patient?.id ?? null;
}

export async function listPharmacyOptionsForSubscription() {
  const pharmacies = await prisma.pharmacy.findMany({
    where: { isActive: true, isApproved: true },
    select: { id: true, name: true, phone: true, city: true, state: true, address: true },
    orderBy: { name: 'asc' },
    take: 100,
  });
  return pharmacies;
}

export async function listMedicationSubscriptions(
  patientId: string,
  options?: { includeCancelled?: boolean }
) {
  const subscriptions = await prisma.medicationSubscription.findMany({
    where: {
      patientId,
      ...(options?.includeCancelled ? {} : { status: { not: 'CANCELLED' } }),
    },
    include: subscriptionInclude,
    orderBy: [{ status: 'asc' }, { nextRefillDate: 'asc' }],
    take: 50,
  });
  return subscriptions.map(mapSubscription);
}

export async function getMedicationSubscriptionStats(patientId: string) {
  const subscriptions = await prisma.medicationSubscription.findMany({
    where: { patientId },
  });

  const active = subscriptions.filter((s) => s.status === 'ACTIVE');
  const totalRefills = subscriptions.reduce((acc, s) => acc + s.totalRefills, 0);
  const estimatedSavings = active.reduce(
    (acc, s) => acc + s.totalRefills * (s.discountPercent || 10) * 1.55,
    0
  );

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { createdAt: true },
  });

  return {
    activeSubscriptions: active.length,
    pausedSubscriptions: subscriptions.filter((s) => s.status === 'PAUSED').length,
    totalSubscriptions: subscriptions.filter((s) => s.status !== 'CANCELLED').length,
    totalRefills,
    estimatedSavings: Math.round(estimatedSavings * 100) / 100,
    memberSince: patient?.createdAt?.toISOString() ?? null,
  };
}

export async function createMedicationSubscription(
  patientId: string,
  data: {
    medicationName: string;
    dosage?: string;
    quantity?: number;
    frequencyDays?: number;
    pharmacyId?: string | null;
    paymentMethod?: string;
  }
) {
  if (data.pharmacyId) {
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { id: data.pharmacyId, isActive: true, isApproved: true },
    });
    if (!pharmacy) throw new Error('Farmácia parceira não encontrada ou indisponível');
  }

  const duplicate = await prisma.medicationSubscription.findFirst({
    where: {
      patientId,
      medicationName: data.medicationName,
      status: { in: ['ACTIVE', 'PAUSED'] },
    },
  });
  if (duplicate) {
    throw new Error('Já existe uma assinatura ativa ou pausada para este medicamento');
  }

  const frequencyDays = data.frequencyDays ?? 30;
  const nextRefillDate = new Date();
  nextRefillDate.setDate(nextRefillDate.getDate() + frequencyDays);
  const now = new Date();

  const created = await prisma.medicationSubscription.create({
    data: {
      patientId,
      pharmacyId: data.pharmacyId ?? null,
      medicationName: data.medicationName.trim(),
      dosage: data.dosage?.trim() || 'Conforme prescrição',
      quantity: data.quantity ?? 1,
      frequencyDays,
      nextRefillDate,
      status: 'ACTIVE',
      discountPercent: 10,
      autoRefill: true,
      paymentMethod: data.paymentMethod ?? null,
      updatedAt: now,
    },
    include: subscriptionInclude,
  });

  return mapSubscription(created);
}

export async function updateMedicationSubscription(
  patientId: string,
  subscriptionId: string,
  data: { status?: MedicationSubscriptionStatus; frequencyDays?: number }
) {
  const existing = await prisma.medicationSubscription.findFirst({
    where: { id: subscriptionId, patientId },
  });
  if (!existing) throw new Error('Assinatura não encontrada');
  if (existing.status === 'CANCELLED') {
    throw new Error('Assinaturas canceladas não podem ser alteradas');
  }

  const allowedStatuses: MedicationSubscriptionStatus[] = ['ACTIVE', 'PAUSED'];
  if (data.status && !allowedStatuses.includes(data.status)) {
    throw new Error('Status inválido');
  }

  const updateData: {
    status?: string;
    frequencyDays?: number;
    nextRefillDate?: Date;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (data.frequencyDays && data.frequencyDays > 0) {
    updateData.frequencyDays = data.frequencyDays;
    const base = existing.nextRefillDate > new Date() ? existing.nextRefillDate : new Date();
    const next = new Date(base);
    next.setDate(next.getDate() + data.frequencyDays);
    updateData.nextRefillDate = next;
  }

  if (data.status) updateData.status = data.status;

  const updated = await prisma.medicationSubscription.update({
    where: { id: subscriptionId },
    data: updateData,
    include: subscriptionInclude,
  });

  return mapSubscription(updated);
}

export async function cancelMedicationSubscription(patientId: string, subscriptionId: string) {
  const existing = await prisma.medicationSubscription.findFirst({
    where: { id: subscriptionId, patientId },
  });
  if (!existing) throw new Error('Assinatura não encontrada');

  const updated = await prisma.medicationSubscription.update({
    where: { id: subscriptionId },
    data: { status: 'CANCELLED', updatedAt: new Date() },
    include: subscriptionInclude,
  });

  return mapSubscription(updated);
}

export class MedicationSubscriptionService {
  calculateNextOrderDate(currentDate: Date, frequency: string | number) {
    const next = new Date(currentDate);
    if (typeof frequency === 'number') {
      next.setDate(next.getDate() + frequency);
      return next;
    }
    if (frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1);
    else if (frequency === 'BIWEEKLY') next.setDate(next.getDate() + 14);
    else next.setMonth(next.getMonth() + 1);
    return next;
  }

  async processDueSubscriptions() {
    const now = new Date();
    const dueSubscriptions = await prisma.medicationSubscription.findMany({
      where: { status: 'ACTIVE', nextRefillDate: { lte: now }, autoRefill: true },
      include: {
        ...subscriptionInclude,
        Patient: { select: { userId: true } },
      },
    });

    logger.info(`[Subscription] Processando ${dueSubscriptions.length} assinaturas devidas...`);

    for (const sub of dueSubscriptions) {
      try {
        if (!sub.pharmacyId) continue;
        const userId = sub.Patient?.userId;
        if (!userId) continue;

        await pharmacyService.createOrder(userId, sub.pharmacyId, [
          {
            productId: sub.medicationName,
            quantity: sub.quantity || 1,
            price: 0,
          },
        ]);

        const nextDate = this.calculateNextOrderDate(sub.nextRefillDate, sub.frequencyDays);
        await prisma.medicationSubscription.update({
          where: { id: sub.id },
          data: {
            nextRefillDate: nextDate,
            lastRefillDate: now,
            totalRefills: { increment: 1 },
            updatedAt: now,
          },
        });
      } catch (error) {
        logger.error(`[Subscription] Erro ao processar assinatura ${sub.id}:`, error);
      }
    }
  }
}

export const medicationSubscriptionService = new MedicationSubscriptionService();
