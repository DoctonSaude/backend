import prisma from '../lib/prisma.js';

export type CalendarEventStatus = 'pending' | 'taken' | 'missed' | 'skipped';

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseTimeKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function parseScheduledDateTime(dateKey: string, time: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes || 0, 0, 0);
}

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

export function findLogForSlot(
  logs: Array<{
    id: string;
    medicationName: string;
    scheduledTime: Date;
    status: string;
  }>,
  medicationName: string,
  dateKey: string,
  time: string
) {
  return logs.find((log) => {
    if (log.medicationName !== medicationName) return false;
    const st = new Date(log.scheduledTime);
    return toDateKey(st) === dateKey && parseTimeKey(st) === time;
  });
}

export async function getMedicationCalendar(
  patientId: string,
  year: number,
  month: number
) {
  const monthIndex = month - 1;
  const firstOfMonth = new Date(year, monthIndex, 1);
  const calendarStart = new Date(firstOfMonth);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
  const calendarEnd = new Date(calendarStart);
  calendarEnd.setDate(calendarEnd.getDate() + 41);
  calendarEnd.setHours(23, 59, 59, 999);

  const [reminders, logs] = await Promise.all([
    prisma.medicationReminder.findMany({
      where: { patientId, isActive: true },
      orderBy: { medicationName: 'asc' },
    }),
    prisma.medicationLog.findMany({
      where: {
        patientId,
        scheduledTime: { gte: calendarStart, lte: calendarEnd },
      },
    }),
  ]);

  const now = new Date();
  const todayKey = toDateKey(now);
  const events: Array<{
    id: string;
    reminderId: string;
    medicationName: string;
    dosage: string;
    time: string;
    date: string;
    status: CalendarEventStatus;
    scheduledTime: string;
    logId?: string;
    canEdit: boolean;
  }> = [];

  for (
    let cursor = new Date(calendarStart);
    cursor <= calendarEnd;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const dateKey = toDateKey(cursor);
    const dayStart = startOfDay(cursor);

    for (const med of reminders) {
      const medStart = med.startDate ? startOfDay(new Date(med.startDate)) : null;
      const medEnd = med.endDate ? endOfDay(new Date(med.endDate)) : null;
      if (medStart && dayStart < medStart) continue;
      if (medEnd && dayStart > medEnd) continue;

      for (const time of med.times) {
        const slotAt = parseScheduledDateTime(dateKey, time);
        const log = findLogForSlot(logs, med.medicationName, dateKey, time);

        let status: CalendarEventStatus = (log?.status as CalendarEventStatus) || 'pending';

        if (!log) {
          const isPastDay = dateKey < todayKey;
          const isPastSlotToday = dateKey === todayKey && slotAt < now;
          if (isPastDay || isPastSlotToday) {
            status = 'missed';
          }
        }

        events.push({
          id: `${med.id}_${dateKey}_${time}`,
          reminderId: med.id,
          medicationName: med.medicationName,
          dosage: med.dosage,
          time,
          date: dateKey,
          status,
          scheduledTime: slotAt.toISOString(),
          logId: log?.id,
          canEdit: status === 'pending' || status === 'missed' || !!log,
        });
      }
    }
  }

  events.sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );

  const summary = {
    total: events.length,
    taken: events.filter((e) => e.status === 'taken').length,
    missed: events.filter((e) => e.status === 'missed').length,
    pending: events.filter((e) => e.status === 'pending').length,
    skipped: events.filter((e) => e.status === 'skipped').length,
    activeReminders: reminders.length,
  };

  return {
    year,
    month,
    events,
    summary,
  };
}

export async function upsertMedicationLog(
  patientId: string,
  data: {
    medicationName: string;
    dosage?: string;
    scheduledTime: string;
    status: 'taken' | 'missed' | 'skipped';
    notes?: string;
  }
) {
  const scheduled = new Date(data.scheduledTime);
  if (Number.isNaN(scheduled.getTime())) {
    throw new Error('Horário agendado inválido');
  }

  const dateKey = toDateKey(scheduled);
  const timeKey = parseTimeKey(scheduled);

  const logs = await prisma.medicationLog.findMany({
    where: {
      patientId,
      medicationName: data.medicationName,
      scheduledTime: {
        gte: startOfDay(scheduled),
        lte: endOfDay(scheduled),
      },
    },
  });

  const existing = findLogForSlot(
    logs,
    data.medicationName,
    dateKey,
    timeKey
  );

  const payload = {
    status: data.status,
    takenTime: data.status === 'taken' ? new Date() : null,
    notes: data.notes ?? null,
    dosage: data.dosage || '',
    updatedAt: new Date(),
  };

  if (existing) {
    return prisma.medicationLog.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return prisma.medicationLog.create({
    data: {
      patientId,
      medicationName: data.medicationName,
      dosage: data.dosage || '',
      scheduledTime: scheduled,
      ...payload,
    },
  });
}
