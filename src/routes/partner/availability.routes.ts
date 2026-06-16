// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import inAppNotificationService from '../../services/inAppNotification.service.js';
import { SocketService } from '../../lib/socket.js';
import { mapPartnerData } from './public.routes.js';

const router = Router();

/**
 * @route POST /api/partners/availability
 */
router.post('/availability', authenticate, authorize('PATIENT'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { partnerId, specialty, date, time, urgency } = req.body;

    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const request = await prisma.availabilityRequest.create({
      data: {
        patientId: patient.id,
        partnerId,
        specialty,
        date,
        time,
        urgency: urgency || 'normal',
        status: 'pending'
      }
    });

    const partner = await prisma.partner.findUnique({ 
      where: { id: partnerId },
      include: { User: { select: { name: true } } }
    });

    if (partner) {
      await inAppNotificationService.createNotification({
        userId: partner.userId,
        type: 'system',
        title: 'Nova consulta de disponibilidade',
        message: `Você recebeu um novo pedido de disponibilidade para ${specialty}.`,
        priority: urgency === 'urgent' ? 'high' : 'medium',
        link: '/partner/disponibilidade'
      });
    }

    console.log(`[Encaixe VIP] Novo pedido criado ID: ${request.id} para especialidade: ${specialty}`);

    // --- NOTIFICAR ADMINS (Encaixe VIP) ---
    await inAppNotificationService.createNotification({
      userId: null,
      type: 'quote_request',
      title: 'Novo pedido de Encaixe VIP',
      message: `Paciente solicitou Encaixe VIP para: ${specialty}${partner ? ` (Parceiro: ${partner.User?.name || 'Não informado'})` : ''}.`,
      priority: urgency === 'urgent' ? 'high' : 'medium',
      link: '/admin/orcamentos'
    });
    
    console.log('[Encaixe VIP] Notificação enviada para sala de ADMINS');

    res.status(201).json(request);
  } catch (error) {
    console.error('Erro disponibilidade POST:', error);
    res.status(500).json({ error: 'Erro ao solicitar disponibilidade', details: error.message });
  }
});

/**
 * @route GET /api/partners/availability
 */
router.get('/availability', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    let where: any = {};
    if (role === 'ADMIN') {
      // ADMIN vê tudo
      where = {};
    } else if (role === 'PARTNER') {
      const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
      if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });
      where.partnerId = partner.id;
    } else {
      const patient = await prisma.patient.findFirst({ where: { userId }, select: { id: true } });
      if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });
      where.patientId = patient.id;
    }

    const requests = await prisma.availabilityRequest.findMany({
      where,
      include: { patient: { include: { User: { select: { name: true, avatar: true } } } },
        Partner: {
          include: {
            User: { select: { name: true, avatar: true } },
            PartnerService: { where: { isActive: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests.map(r => ({
      ...r,
      patient: r.Patient,
      partner: r.Partner ? mapPartnerData({
        ...r.Partner,
        user: r.Partner.User,
        services: r.Partner.PartnerService
      }) : null
    })));
  } catch (error) {
    console.error('Erro disponibilidade GET:', error);
    res.status(500).json({ error: 'Erro ao listar disponibilidade', details: error.message });
  }
});

/**
 * @route PUT /api/partners/availability/:id
 */
router.put('/availability/:id', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status, suggestedSlots } = req.body;

    const request = await prisma.availabilityRequest.findUnique({
      where: { id },
      include: { patient: { include: { User: true } } }
    });

    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

    const updated = await prisma.availabilityRequest.update({
      where: { id },
      data: {
        status,
        suggestedSlots: suggestedSlots ? JSON.stringify(suggestedSlots) : undefined
      }
    });

    if (request.Patient?.User) {
      await inAppNotificationService.createNotification({
        userId: request.Patient.User.id,
        type: 'system',
        title: 'Resposta de Disponibilidade',
        message: `O profissional respondeu sua solicitação de disponibilidade.`,
        priority: 'medium',
        link: '/patient/agendamentos?tab=requests'
      });
      SocketService.sendToUser(request.Patient.User.id, 'availabilityUpdate', updated);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao responder disponibilidade', details: error.message });
  }
});

export default router;
