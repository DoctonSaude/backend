import prisma from '../lib/prisma.js';
import { computeAdherenceRate } from './medication-reminder.service.js';

const CATEGORY = 'prescription_alert';

export type PrescriptionAlertType =
  | 'expiring'
  | 'expired'
  | 'running_low'
  | 'renewal_needed';

export type PrescriptionAlertDto = {
  id: string;
  type: PrescriptionAlertType;
  medicationName: string;
  prescriptionDate: string | null;
  expiryDate: string | null;
  daysRemaining: number;
  doctor: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  isDismissed: boolean;
  message: string;
  prescriptionId?: string;
  alertKey: string;
};

type AlertMeta = {
  alertKey: string;
  type: PrescriptionAlertType;
  medicationName: string;
  prescriptionId?: string;
  prescriptionDate?: string | null;
  expiryDate?: string | null;
  daysRemaining?: number;
  doctor?: string;
};

function parseMeta(row: { metadataJson: unknown }): AlertMeta | null {
  if (!row.metadataJson || typeof row.metadataJson !== 'object') return null;
  const m = row.metadataJson as AlertMeta;
  if (!m.alertKey || !m.type) return null;
  return m;
}

function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function buildGeneratedAlerts(
  prescriptions: Array<{
    id: string;
    medication: string | null;
    date: Date | null;
    endDate: Date | null;
    doctor: string | null;
    status: string | null;
  }>,
  reminders: Array<{
    id: string;
    medicationName: string;
    adherenceRate: number;
    isActive: boolean;
  }>
): Omit<PrescriptionAlertDto, 'id' | 'isRead' | 'isDismissed'>[] {
  const out: Omit<PrescriptionAlertDto, 'id' | 'isRead' | 'isDismissed'>[] = [];
  const now = new Date();

  for (const p of prescriptions) {
    if (p.status && p.status.toLowerCase() === 'cancelado') continue;
    const medName = p.medication || 'Medicamento';
    const doctor = p.doctor || 'Não informado';
    const prescriptionDate = p.date?.toISOString() ?? null;
    const expiry = p.endDate ? new Date(p.endDate) : null;
    if (!expiry) continue;

    const diffDays = daysUntil(expiry);

    if (diffDays <= 0) {
      out.push({
        alertKey: `alert_expired_${p.id}`,
        type: 'expired',
        medicationName: medName,
        prescriptionDate,
        expiryDate: expiry.toISOString(),
        daysRemaining: diffDays,
        doctor,
        priority: 'critical',
        message: `Prescrição de ${medName} expirou há ${Math.abs(diffDays)} dia(s). Consulte seu médico.`,
        prescriptionId: p.id,
      });
    } else if (diffDays <= 7) {
      out.push({
        alertKey: `alert_expiring_${p.id}`,
        type: 'expiring',
        medicationName: medName,
        prescriptionDate,
        expiryDate: expiry.toISOString(),
        daysRemaining: diffDays,
        doctor,
        priority: 'high',
        message: `Sua prescrição de ${medName} vence em ${diffDays} dia(s). Agende uma consulta para renovação.`,
        prescriptionId: p.id,
      });
    } else if (diffDays <= 30) {
      out.push({
        alertKey: `alert_renewal_${p.id}`,
        type: 'renewal_needed',
        medicationName: medName,
        prescriptionDate,
        expiryDate: expiry.toISOString(),
        daysRemaining: diffDays,
        doctor,
        priority: 'medium',
        message: `Renovação de ${medName} recomendada nos próximos ${diffDays} dias.`,
        prescriptionId: p.id,
      });
    }
  }

  for (const r of reminders) {
    if (!r.isActive) continue;
    if (r.adherenceRate >= 70) continue;
    out.push({
      alertKey: `alert_low_adherence_${r.id}`,
      type: 'running_low',
      medicationName: r.medicationName,
      prescriptionDate: now.toISOString(),
      expiryDate: null,
      daysRemaining: 0,
      doctor: 'Adesão ao tratamento',
      priority: r.adherenceRate < 50 ? 'critical' : 'high',
      message: `Adesão baixa (${r.adherenceRate}%) ao medicamento ${r.medicationName}. Verifique seus lembretes.`,
    });
  }

  return out;
}

function mapRowToDto(
  row: {
    id: string;
    title: string;
    description: string;
    priority: string;
    isRead: boolean;
    isDismissed: boolean;
    metadataJson: unknown;
  }
): PrescriptionAlertDto | null {
  const meta = parseMeta(row);
  if (!meta) return null;

  return {
    id: row.id,
    type: meta.type,
    medicationName: meta.medicationName || row.title,
    prescriptionDate: meta.prescriptionDate ?? null,
    expiryDate: meta.expiryDate ?? null,
    daysRemaining: meta.daysRemaining ?? 0,
    doctor: meta.doctor || 'Não informado',
    priority: (row.priority as PrescriptionAlertDto['priority']) || 'medium',
    isRead: row.isRead,
    isDismissed: row.isDismissed,
    message: row.description,
    prescriptionId: meta.prescriptionId,
    alertKey: meta.alertKey,
  };
}

export async function syncPrescriptionAlerts(patientId: string) {
  const [prescriptions, reminders] = await Promise.all([
    prisma.prescription.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.medicationReminder.findMany({
      where: { patientId, isActive: true },
    }),
  ]);

  const remindersWithAdherence = await Promise.all(
    reminders.map(async (r) => ({
      id: r.id,
      medicationName: r.medicationName,
      isActive: r.isActive,
      adherenceRate: await computeAdherenceRate(patientId, r.medicationName),
    }))
  );

  const generated = buildGeneratedAlerts(prescriptions, remindersWithAdherence);
  const generatedKeys = new Set(generated.map((g) => g.alertKey));

  const existing = await prisma.patientInsight.findMany({
    where: { patientId, category: CATEGORY },
  });

  for (const alert of generated) {
    const found = existing.find((e) => parseMeta(e)?.alertKey === alert.alertKey);
    const metadataJson: AlertMeta = {
      alertKey: alert.alertKey,
      type: alert.type,
      medicationName: alert.medicationName,
      prescriptionId: alert.prescriptionId,
      prescriptionDate: alert.prescriptionDate,
      expiryDate: alert.expiryDate,
      daysRemaining: alert.daysRemaining,
      doctor: alert.doctor,
    };

    if (found) {
      await prisma.patientInsight.update({
        where: { id: found.id },
        data: {
          title: alert.medicationName,
          description: alert.message,
          priority: alert.priority,
          type: alert.type,
          metadataJson: metadataJson as object,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.patientInsight.create({
        data: {
          patientId,
          category: CATEGORY,
          type: alert.type,
          title: alert.medicationName,
          description: alert.message,
          priority: alert.priority,
          actionable: true,
          isRead: false,
          isDismissed: false,
          metadataJson: metadataJson as object,
          updatedAt: new Date(),
        },
      });
    }
  }

  const obsolete = existing.filter((e) => {
    const key = parseMeta(e)?.alertKey;
    return key && !generatedKeys.has(key);
  });

  if (obsolete.length) {
    await prisma.patientInsight.deleteMany({
      where: { id: { in: obsolete.map((o) => o.id) } },
    });
  }

  return generated.length;
}

export async function getPrescriptionAlerts(
  patientId: string,
  filter: 'all' | 'unread' | 'high' | 'critical' = 'all'
) {
  await syncPrescriptionAlerts(patientId);

  const rows = await prisma.patientInsight.findMany({
    where: { patientId, category: CATEGORY },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });

  let alerts = rows
    .map(mapRowToDto)
    .filter((a): a is PrescriptionAlertDto => a !== null)
    .filter((a) => !a.isDismissed);

  if (filter === 'unread') {
    alerts = alerts.filter((a) => !a.isRead);
  } else if (filter === 'high') {
    alerts = alerts.filter((a) => a.priority === 'high');
  } else if (filter === 'critical') {
    alerts = alerts.filter((a) => a.priority === 'critical');
  }

  const summary = {
    total: alerts.length,
    unread: alerts.filter((a) => !a.isRead).length,
    critical: alerts.filter((a) => a.priority === 'critical').length,
    high: alerts.filter((a) => a.priority === 'high').length,
  };

  return { alerts, summary };
}

async function findPrescriptionAlertRow(patientId: string, alertId: string) {
  return prisma.patientInsight.findFirst({
    where: { id: alertId, patientId, category: CATEGORY },
  });
}

export async function markPrescriptionAlertRead(patientId: string, alertId: string) {
  const row = await findPrescriptionAlertRow(patientId, alertId);
  if (!row) throw new Error('Alerta não encontrado');

  const updated = await prisma.patientInsight.update({
    where: { id: alertId },
    data: { isRead: true, updatedAt: new Date() },
  });
  const dto = mapRowToDto(updated);
  if (!dto) throw new Error('Alerta não encontrado');
  return dto;
}

export async function dismissPrescriptionAlert(patientId: string, alertId: string) {
  const row = await findPrescriptionAlertRow(patientId, alertId);
  if (!row) throw new Error('Alerta não encontrado');

  const updated = await prisma.patientInsight.update({
    where: { id: alertId },
    data: { isDismissed: true, isRead: true, updatedAt: new Date() },
  });
  const dto = mapRowToDto(updated);
  if (!dto) throw new Error('Alerta não encontrado');
  return dto;
}

export async function markAllPrescriptionAlertsRead(patientId: string) {
  const result = await prisma.patientInsight.updateMany({
    where: { patientId, category: CATEGORY, isDismissed: false },
    data: { isRead: true, updatedAt: new Date() },
  });
  return { updated: result.count };
}
