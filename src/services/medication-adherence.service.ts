import prisma from '../lib/prisma.js';
import {
  toDateKey,
  parseScheduledDateTime,
  findLogForSlot,
} from './medication-calendar.service.js';

export type AdherencePeriod = 'week' | 'month';

export type MedicationAdherenceItem = {
  reminderId: string | null;
  medicationName: string;
  dosage: string;
  adherenceRate: number;
  weeklyData: number[];
  monthlyData: number[];
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  skippedDoses: number;
  streak: number;
  lastTaken: string | null;
  hasReminder: boolean;
  isActive: boolean;
};

export type MedicationAdherenceReport = {
  period: AdherencePeriod;
  periodStart: string;
  periodEnd: string;
  summary: {
    overallAdherence: number;
    longestStreak: number;
    medicationCount: number;
    totalMissed: number;
    totalTaken: number;
    totalScheduled: number;
    totalSkipped: number;
  };
  medications: MedicationAdherenceItem[];
};

type SlotStatus = 'pending' | 'taken' | 'missed' | 'skipped';

type Slot = {
  dateKey: string;
  scheduledAt: Date;
  status: SlotStatus;
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function resolveSlotStatus(
  log: { status: string } | undefined,
  scheduledAt: Date,
  now: Date,
  dateKey: string
): SlotStatus {
  if (log) return log.status as SlotStatus;
  const todayKey = toDateKey(now);
  if (dateKey < todayKey) return 'missed';
  if (dateKey === todayKey && scheduledAt < now) return 'missed';
  return 'pending';
}

function generateSlotsForReminder(
  reminder: {
    medicationName: string;
    times: string[];
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;
  },
  rangeStart: Date,
  rangeEnd: Date,
  logs: Array<{
    id: string;
    medicationName: string;
    scheduledTime: Date;
    status: string;
  }>,
  now: Date
): Slot[] {
  const slots: Slot[] = [];
  const medStart = startOfDay(new Date(reminder.startDate));
  const medEnd = reminder.endDate ? endOfDay(new Date(reminder.endDate)) : null;

  for (
    let cursor = startOfDay(new Date(rangeStart));
    cursor <= rangeEnd;
    cursor = addDays(cursor, 1)
  ) {
    const dayStart = startOfDay(cursor);
    if (dayStart < medStart) continue;
    if (medEnd && dayStart > medEnd) continue;

    const dateKey = toDateKey(cursor);
    for (const time of reminder.times) {
      const scheduledAt = parseScheduledDateTime(dateKey, time);
      if (scheduledAt > rangeEnd) continue;

      const log = findLogForSlot(logs, reminder.medicationName, dateKey, time);
      slots.push({
        dateKey,
        scheduledAt,
        status: resolveSlotStatus(log, scheduledAt, now, dateKey),
      });
    }
  }

  return slots;
}

function rateFromSlots(slots: Slot[], now: Date, onlyPast = true): number {
  if (slots.length === 0) return 0;
  const relevant = slots.filter((s) => {
    if (!onlyPast) return s.status !== 'pending';
    return s.scheduledAt <= now && s.status !== 'pending';
  });
  if (relevant.length === 0) return 0;
  const taken = relevant.filter((s) => s.status === 'taken').length;
  return Math.round((taken / relevant.length) * 100);
}

function countByStatus(slots: Slot[], now: Date) {
  const past = slots.filter((s) => s.scheduledAt <= now && s.status !== 'pending');
  return {
    totalDoses: past.length,
    takenDoses: past.filter((s) => s.status === 'taken').length,
    missedDoses: past.filter((s) => s.status === 'missed').length,
    skippedDoses: past.filter((s) => s.status === 'skipped').length,
  };
}

function computeDayStreak(slots: Slot[], now: Date): number {
  const todayKey = toDateKey(now);
  const byDay = new Map<string, Slot[]>();
  for (const s of slots) {
    if (s.scheduledAt > now) continue;
    const list = byDay.get(s.dateKey) || [];
    list.push(s);
    byDay.set(s.dateKey, list);
  }

  let streak = 0;
  let cursor = startOfDay(now);
  while (true) {
    const key = toDateKey(cursor);
    if (key > todayKey) break;
    const daySlots = byDay.get(key) || [];
    const pastDaySlots = daySlots.filter((s) => s.scheduledAt <= now);
    if (pastDaySlots.length === 0) {
      if (key === todayKey) {
        cursor = addDays(cursor, -1);
        continue;
      }
      break;
    }
    const allTaken = pastDaySlots.every((s) => s.status === 'taken');
    if (!allTaken) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function weeklySeries(slots: Slot[], now: Date): number[] {
  const data: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(startOfDay(now), -i);
    const key = toDateKey(d);
    const daySlots = slots.filter((s) => s.dateKey === key);
    data.push(rateFromSlots(daySlots, now));
  }
  return data;
}

function monthlySeries(slots: Slot[], now: Date): number[] {
  const weeks: number[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekEnd = addDays(startOfDay(now), -w * 7);
    const weekStart = addDays(weekEnd, -6);
    const weekSlots = slots.filter((s) => {
      const day = startOfDay(s.scheduledAt);
      return day >= weekStart && day <= endOfDay(weekEnd);
    });
    weeks.push(rateFromSlots(weekSlots, now));
  }
  return weeks;
}

function buildItemFromLogsOnly(
  medicationName: string,
  logs: Array<{
    medicationName: string;
    scheduledTime: Date;
    status: string;
    takenTime: Date | null;
  }>,
  rangeStart: Date,
  now: Date
): MedicationAdherenceItem {
  const inRange = logs.filter(
    (l) =>
      l.medicationName === medicationName &&
      l.scheduledTime >= rangeStart &&
      l.scheduledTime <= now
  );

  const taken = inRange.filter((l) => l.status === 'taken').length;
  const missed = inRange.filter((l) => l.status === 'missed').length;
  const skipped = inRange.filter((l) => l.status === 'skipped').length;
  const total = taken + missed + skipped;
  const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

  const weeklyData = Array(7).fill(0);
  for (let i = 6; i >= 0; i--) {
    const d = addDays(startOfDay(now), -i);
    const key = toDateKey(d);
    const dayLogs = inRange.filter((l) => toDateKey(l.scheduledTime) === key);
    if (dayLogs.length > 0) {
      const t = dayLogs.filter((l) => l.status === 'taken').length;
      weeklyData[6 - i] = Math.round((t / dayLogs.length) * 100);
    }
  }

  const monthlyData = Array(4).fill(adherenceRate);
  const lastTakenLog = inRange
    .filter((l) => l.status === 'taken' && l.takenTime)
    .sort((a, b) => b.takenTime!.getTime() - a.takenTime!.getTime())[0];

  return {
    reminderId: null,
    medicationName,
    dosage: '',
    adherenceRate,
    weeklyData,
    monthlyData,
    totalDoses: total,
    takenDoses: taken,
    missedDoses: missed,
    skippedDoses: skipped,
    streak: 0,
    lastTaken: lastTakenLog?.takenTime?.toISOString() ?? null,
    hasReminder: false,
    isActive: false,
  };
}

export async function getMedicationAdherenceReport(
  patientId: string,
  period: AdherencePeriod = 'week'
): Promise<MedicationAdherenceReport> {
  const now = new Date();
  const periodDays = period === 'month' ? 28 : 7;
  const periodStart = startOfDay(addDays(now, -(periodDays - 1)));
  const rangeEnd = endOfDay(now);

  const [reminders, logs] = await Promise.all([
    prisma.medicationReminder.findMany({
      where: { patientId },
      orderBy: { medicationName: 'asc' },
    }),
    prisma.medicationLog.findMany({
      where: {
        patientId,
        scheduledTime: { gte: addDays(periodStart, -21), lte: now },
      },
      orderBy: { scheduledTime: 'desc' },
    }),
  ]);

  const medications: MedicationAdherenceItem[] = [];
  const coveredNames = new Set<string>();

  for (const reminder of reminders) {
    coveredNames.add(reminder.medicationName);
    const slots = generateSlotsForReminder(reminder, periodStart, rangeEnd, logs, now);
    const counts = countByStatus(slots, now);
    const adherenceRate = rateFromSlots(
      slots.filter((s) => s.scheduledAt >= periodStart),
      now
    );

    const lastTakenLog = logs
      .filter(
        (l) => l.medicationName === reminder.medicationName && l.status === 'taken' && l.takenTime
      )
      .sort((a, b) => b.takenTime!.getTime() - a.takenTime!.getTime())[0];

    medications.push({
      reminderId: reminder.id,
      medicationName: reminder.medicationName,
      dosage: reminder.dosage,
      adherenceRate,
      weeklyData: weeklySeries(slots, now),
      monthlyData: monthlySeries(slots, now),
      ...counts,
      streak: computeDayStreak(slots, now),
      lastTaken: lastTakenLog?.takenTime?.toISOString() ?? reminder.lastTaken?.toISOString() ?? null,
      hasReminder: true,
      isActive: reminder.isActive,
    });
  }

  const logOnlyMeds = new Set(
    logs
      .filter((l) => l.scheduledTime >= periodStart)
      .map((l) => l.medicationName)
      .filter((name) => !coveredNames.has(name))
  );

  for (const name of logOnlyMeds) {
    medications.push(buildItemFromLogsOnly(name, logs, periodStart, now));
  }

  medications.sort((a, b) => a.medicationName.localeCompare(b.medicationName, 'pt-BR'));

  const activeMeds = medications.filter((m) => m.hasReminder && m.isActive);
  const statsSource = activeMeds.length > 0 ? activeMeds : medications;

  const overallAdherence =
    statsSource.length === 0
      ? 0
      : Math.round(
          statsSource.reduce((sum, m) => sum + m.adherenceRate, 0) / statsSource.length
        );

  return {
    period,
    periodStart: periodStart.toISOString(),
    periodEnd: now.toISOString(),
    summary: {
      overallAdherence,
      longestStreak: statsSource.reduce((max, m) => Math.max(max, m.streak), 0),
      medicationCount: statsSource.length,
      totalMissed: statsSource.reduce((sum, m) => sum + m.missedDoses, 0),
      totalTaken: statsSource.reduce((sum, m) => sum + m.takenDoses, 0),
      totalScheduled: statsSource.reduce((sum, m) => sum + m.totalDoses, 0),
      totalSkipped: statsSource.reduce((sum, m) => sum + m.skippedDoses, 0),
    },
    medications,
  };
}
