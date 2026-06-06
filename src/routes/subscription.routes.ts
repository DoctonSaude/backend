import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { SocketService } from '../lib/socket.js';
import inAppNotificationService from '../services/inAppNotification.service.js';
import {
  resolvePatientIdByUserId,
  listPharmacyOptionsForSubscription,
  listMedicationSubscriptions,
  getMedicationSubscriptionStats,
  createMedicationSubscription,
  updateMedicationSubscription,
  cancelMedicationSubscription,
} from '../services/medication-subscription.service.js';

const router = Router();

const CreateSubscriptionSchema = z.object({
  medicationName: z.string().min(1, 'Medicamento é obrigatório'),
  dosage: z.string().optional(),
  quantity: z.coerce.number().int().positive().default(1),
  frequencyDays: z.coerce.number().int().positive().default(30),
  pharmacyId: z.string().cuid().optional().nullable(),
  paymentMethod: z.string().optional(),
});

const UpdateSubscriptionSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED']).optional(),
  frequencyDays: z.coerce.number().int().positive().optional(),
});

async function getPatientIdOr404(userId: string, res: any): Promise<string | null> {
  const patientId = await resolvePatientIdByUserId(userId);
  if (!patientId) {
    res.status(404).json({ error: 'Paciente não encontrado' });
    return null;
  }
  return patientId;
}

function emitSubscriptionsUpdate(userId: string, payload?: unknown) {
  SocketService.sendToUser(userId, 'medicationSubscriptionsUpdate', payload ?? { refresh: true });
}

// Estatísticas — antes de /:id
router.get('/stats', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patientId = await getPatientIdOr404(req.user!.userId, res);
    if (!patientId) return;

    const stats = await getMedicationSubscriptionStats(patientId);
    res.json(stats);
  } catch (error) {
    console.error('[Subscriptions Stats Error]', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Farmácias parceiras para nova assinatura
router.get('/pharmacy-options', authenticate, authorize('PATIENT'), async (_req, res) => {
  try {
    const pharmacies = await listPharmacyOptionsForSubscription();
    res.json(pharmacies);
  } catch (error) {
    console.error('[Subscriptions Pharmacy Options Error]', error);
    res.status(500).json({ error: 'Erro ao buscar farmácias parceiras' });
  }
});

// Listar assinaturas
router.get('/', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patientId = await getPatientIdOr404(req.user!.userId, res);
    if (!patientId) return;

    const includeCancelled = req.query.includeCancelled === 'true';
    const subscriptions = await listMedicationSubscriptions(patientId, { includeCancelled });
    res.json(subscriptions);
  } catch (error) {
    console.error('[Subscriptions GET Error]', error);
    res.status(500).json({ error: 'Erro ao buscar assinaturas' });
  }
});

// Criar assinatura
router.post('/', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patientId = await getPatientIdOr404(req.user!.userId, res);
    if (!patientId) return;

    const parsed = CreateSubscriptionSchema.parse(req.body);
    const subscription = await createMedicationSubscription(patientId, parsed);

    await inAppNotificationService
      .createNotification({
        userId: null,
        type: 'system',
        title: 'Nova Assinatura de Medicamento',
        message: `Assinatura criada para ${subscription.medicationName}.`,
        priority: 'medium',
        link: '/admin/medicamentos',
      })
      .catch((err) => console.error('Erro ao notificar admin:', err));

    emitSubscriptionsUpdate(req.user!.userId, subscription);
    res.status(201).json(subscription);
  } catch (error: any) {
    console.error('[Subscriptions POST Error]', error);
    const msg = error?.message || 'Erro ao criar assinatura';
    res.status(msg.includes('Já existe') ? 409 : 400).json({ error: msg });
  }
});

// Atualizar (pausar / reativar / frequência)
router.patch('/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patientId = await getPatientIdOr404(req.user!.userId, res);
    if (!patientId) return;

    const parsed = UpdateSubscriptionSchema.parse(req.body);
    const updated = await updateMedicationSubscription(patientId, req.params.id, parsed);

    emitSubscriptionsUpdate(req.user!.userId, updated);
    res.json(updated);
  } catch (error: any) {
    console.error('[Subscriptions PATCH Error]', error);
    const status = error?.message === 'Assinatura não encontrada' ? 404 : 400;
    res.status(status).json({ error: error?.message || 'Erro ao atualizar assinatura' });
  }
});

// Cancelar
router.delete('/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const patientId = await getPatientIdOr404(req.user!.userId, res);
    if (!patientId) return;

    const updated = await cancelMedicationSubscription(patientId, req.params.id);
    emitSubscriptionsUpdate(req.user!.userId, updated);
    res.json({ message: 'Assinatura cancelada com sucesso', subscription: updated });
  } catch (error: any) {
    console.error('[Subscriptions DELETE Error]', error);
    const status = error?.message === 'Assinatura não encontrada' ? 404 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao cancelar assinatura' });
  }
});

export default router;
