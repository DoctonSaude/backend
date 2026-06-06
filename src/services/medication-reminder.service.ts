import prisma from '../lib/prisma.js';

export function computeNextDueFromTimes(times: string[], from = new Date()): Date {
  if (!times?.length) {
    const fallback = new Date(from);
    fallback.setHours(8, 0, 0, 0);
    if (fallback <= from) fallback.setDate(fallback.getDate() + 1);
    return fallback;
  }

  const candidates: Date[] = [];
  for (const time of times) {
    const [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) continue;

    const today = new Date(from);
    today.setHours(hours, minutes, 0, 0);
    if (today > from) {
      candidates.push(today);
    }

    const tomorrow = new Date(from);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hours, minutes, 0, 0);
    candidates.push(tomorrow);
  }

  if (!candidates.length) {
    const fallback = new Date(from);
    fallback.setDate(fallback.getDate() + 1);
    return fallback;
  }

  return candidates.sort((a, b) => a.getTime() - b.getTime())[0];
}

export async function computeAdherenceRate(
  patientId: string,
  medicationName: string
): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const logs = await prisma.medicationLog.findMany({
    where: {
      patientId,
      medicationName,
      scheduledTime: { gte: thirtyDaysAgo },
    },
    select: { status: true },
  });

  if (logs.length === 0) return 100;

  const taken = logs.filter((l) => l.status === 'taken').length;
  return Math.round((taken / logs.length) * 100);
}

export async function mapReminderForApi(
  reminder: {
    id: string;
    patientId: string;
    prescriptionId: string | null;
    medicationName: string;
    dosage: string;
    times: string[];
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;
    notes: string | null;
    lastTaken: Date | null;
    nextDue: Date | null;
    adherenceRate: number;
    createdAt: Date;
    updatedAt: Date;
  },
  options?: { skipAdherence?: boolean }
) {
  const now = new Date();
  const nextDue =
    reminder.isActive &&
    reminder.nextDue &&
    reminder.nextDue.getTime() > now.getTime()
      ? reminder.nextDue
      : reminder.isActive
        ? computeNextDueFromTimes(reminder.times, now)
        : reminder.nextDue ?? computeNextDueFromTimes(reminder.times, now);

  const adherenceRate = options?.skipAdherence
    ? reminder.adherenceRate
    : await computeAdherenceRate(reminder.patientId, reminder.medicationName);

  return {
    id: reminder.id,
    prescriptionId: reminder.prescriptionId,
    medicationName: reminder.medicationName,
    dosage: reminder.dosage,
    times: reminder.times,
    startDate: reminder.startDate.toISOString(),
    endDate: reminder.endDate?.toISOString() ?? null,
    isActive: reminder.isActive,
    notes: reminder.notes,
    lastTaken: reminder.lastTaken?.toISOString() ?? null,
    nextDue: nextDue.toISOString(),
    adherenceRate,
    createdAt: reminder.createdAt.toISOString(),
    updatedAt: reminder.updatedAt.toISOString(),
  };
}

export function sanitizeReminderInput(body: Record<string, unknown>) {
  const data = { ...body };
  delete data.id;
  delete data.createdAt;
  delete data.updatedAt;
  delete data.patientId;
  delete data.adherenceRate;
  delete data.nextDue;
  delete data.lastTaken;

  if (data.endDate === '' || data.endDate === undefined) {
    data.endDate = null;
  }

  return data;
}

export async function markReminderTaken(reminderId: string, patientId: string) {
  const reminder = await prisma.medicationReminder.findFirst({
    where: { id: reminderId, patientId },
  });
  if (!reminder) throw new Error('Lembrete não encontrado');

  const now = new Date();
  const scheduledTime = computeNextDueFromTimes(reminder.times, now);

  await prisma.medicationLog.create({
    data: {
      patientId,
      medicationName: reminder.medicationName,
      dosage: reminder.dosage,
      scheduledTime,
      takenTime: now,
      status: 'taken',
      updatedAt: now,
    },
  });

  const nextDue = computeNextDueFromTimes(reminder.times, now);
  const adherenceRate = await computeAdherenceRate(patientId, reminder.medicationName);

  const updated = await prisma.medicationReminder.update({
    where: { id: reminderId },
    data: {
      lastTaken: now,
      nextDue,
      adherenceRate,
      updatedAt: now,
    },
  });

  return mapReminderForApi(updated, { skipAdherence: true });
}
