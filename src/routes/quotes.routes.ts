// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import inAppNotificationService from '../services/inAppNotification.service.js';
import { SocketService } from '../lib/socket.js';

const router = Router();

// Log interceptor para depuração
router.use((req, res, next) => {
  console.log(`[QuotesRoute] ${req.method} ${req.originalUrl || req.url}`);
  next();
});

// Aceitar orçamento (Paciente)
router.post('/:id/accept', authenticate, authorize('PATIENT'), async (req, res) => {
  console.log(`[QuotesAccept] Iniciando aceite para ID: ${req.params.id}`);
  try {
    const { id } = req.params;
    const { date, time, paymentMethod, couponCode } = req.body;
    const userId = req.user?.userId;
    console.log(`[QuotesAccept] UserID: ${userId}, Data: ${date}, Hora: ${time}`);

    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) {
      console.warn('[QuotesAccept] Paciente não encontrado para userId:', userId);
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    let partnerId: string | null = null;
    let examTypeLabel: string = '';
    let notes: string = '';

    const isAvailabilityReq = id.startsWith('req-');
    const realId = isAvailabilityReq ? id.replace('req-', '') : id;
    console.log(`[QuotesAccept] isAvailabilityReq: ${isAvailabilityReq}, realId: ${realId}`);

    if (isAvailabilityReq) {
      const aq = await prisma.availabilityRequest.findUnique({
        where: { id: realId },
        include: { partner: true }
      });
      if (!aq) {
        console.warn('[QuotesAccept] AvailabilityRequest não encontrado:', realId);
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }
      if (aq.patientId !== patient.id) {
        console.warn(`[QuotesAccept] Não autorizado. AQ.patientId(${aq.patientId}) !== Patient.id(${patient.id})`);
        return res.status(403).json({ error: 'Não autorizado' });
      }

      partnerId = aq.partnerId;
      examTypeLabel = `Encaixe VIP: ${aq.specialty}`;
      notes = `Aceito via Encaixe VIP. ${aq.specialty}`;

      await prisma.availabilityRequest.update({
        where: { id: realId },
        data: { status: 'accepted' }
      });
    } else {
      const quote = await prisma.quote.findUnique({
        where: { id: realId },
        include: { partner: true }
      });

      if (!quote) {
        console.warn('[QuotesAccept] Quote não encontrado:', realId);
        return res.status(404).json({ error: 'Orçamento não encontrado' });
      }
      if (quote.patientId !== patient.id) {
        console.warn(`[QuotesAccept] Não autorizado. Quote.patientId(${quote.patientId}) !== Patient.id(${patient.id})`);
        return res.status(403).json({ error: 'Não autorizado' });
      }

      partnerId = quote.partnerId;
      examTypeLabel = quote.examType;
      notes = quote.crmNotes || '';

      await prisma.quote.update({
        where: { id: realId },
        data: {
          status: 'accepted',
          appointmentDate: new Date(`${date}T${time}`),
          crmStatus: 'won',
          coupon: couponCode || null
        }
      });
    }

    // Combinar data e hora para o agendamento
    const appointmentDateTime = new Date(`${date}T${time}`);
    console.log('[QuotesAccept] Appointment DateTime:', appointmentDateTime);

      // Criar agendamento automático
      console.log('[QuotesAccept] Criando agendamento para ID:', id);
      try {
        const appointmentId = 'appt-' + Math.random().toString(36).substring(2, 15);
        const newAppointment = await prisma.appointment.create({
          data: {
            id: appointmentId,
            patientId: patient.id,
            partnerId,
            dateTime: appointmentDateTime,
            duration: 30,
            status: 'CONFIRMED',
            isOnline: false,
            notes: `Agendado via: ${examTypeLabel}. ${notes}`,
            updatedAt: new Date() // Obrigatório no Schema sem @updatedAt
          }
        });
        console.log('[QuotesAccept] Agendamento criado com sucesso:', newAppointment.id);

        // Notificar parceiro
        const partnerUser = await prisma.partner.findUnique({
          where: { id: partnerId },
          include: { user: true }
        });

        if (partnerUser?.userId) {
          await inAppNotificationService.createNotification({
            userId: partnerUser.userId,
            type: 'SYSTEM',
            title: 'Novo Agendamento Confirmado',
            message: `O paciente aceitou seu orçamento/encaixe para ${examTypeLabel}.`,
            priority: 'high',
            link: '/partner/agenda'
          });

          // Sincronização em Tempo Real via Socket.io
          SocketService.sendToUser(partnerUser.userId, 'quoteUpdate', { quoteId: id });
          SocketService.sendToUser(patient.userId, 'appointmentUpdate', { appointmentId: newAppointment.id });
        }
      } catch (apptError) {
        console.error('[QuotesAccept] FALHA AO CRIAR AGENDAMENTO:', apptError);
        // Não vamos travar o processo principal se o agendamento automático falhar, 
        // mas vamos logar o erro detalhado.
      }

    res.json({ success: true, message: 'Agendamento realizado com sucesso!' });
  } catch (error) {
    console.error('CRITICAL ERROR ao aceitar orçamento:', error);
    res.status(500).json({ error: 'Erro ao aceitar orçamento', details: error.message });
  }
});

// Recusar orçamento (Paciente)
router.post('/:id/reject', authenticate, authorize('PATIENT'), async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user?.userId;

  console.log(`[QuotesReject] Request: POST ${req.url} | ID Original: ${id}`);

  try {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const isAvailabilityReq = id.startsWith('req-');
    const realId = isAvailabilityReq ? id.replace('req-', '') : id;
    
    console.log(`[QuotesReject] Tipo: ${isAvailabilityReq ? 'VIP' : 'MEDICO'} | ID Real: ${realId}`);

    if (isAvailabilityReq) {
      const aq = await prisma.availabilityRequest.findUnique({ where: { id: realId } });
      if (!aq) {
        console.error(`[QuotesReject] Erro: Solicitação VIP ${realId} não existe no DB.`);
        return res.status(404).json({ error: 'Solicitação VIP não encontrada' });
      }
      if (aq.patientId !== patient.id) return res.status(403).json({ error: 'Não autorizado' });

      await prisma.availabilityRequest.update({
        where: { id: realId },
        data: { status: 'rejected' }
      });
    } else {
      const quote = await prisma.quote.findUnique({ where: { id: realId } });
      if (!quote) {
        console.error(`[QuotesReject] Erro: Orçamento Médico ${realId} não existe no DB.`);
        return res.status(404).json({ error: 'Orçamento médico não encontrado' });
      }
      if (quote.patientId !== patient.id) return res.status(403).json({ error: 'Não autorizado' });

      await prisma.quote.update({
        where: { id: realId },
        data: {
          status: 'rejected',
          crmStatus: 'lost',
          crmLossReason: reason || 'Recusado pelo paciente'
        }
      });
    }

    console.log(`[QuotesReject] Sucesso ao recusar ${id}`);
    res.json({ success: true, message: 'Orçamento/Pedido recusado com sucesso' });
  } catch (error) {
    console.error('[QuotesReject] Erro crítico:', error);
    res.status(500).json({ error: 'Erro interno ao recusar orçamento' });
  }
});

// Rota pública para pacientes solicitarem orçamentos
router.post('/request', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { partnerId, examType, urgency, contactPhone, description, imageUrl } = req.body;
    const userId = req.user?.userId;

    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const newQuote = await prisma.quote.create({
      data: {
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        patientId: patient.id,
        patientName: (req.user as any)?.name || 'Paciente',
        patientPhone: contactPhone || '',
        examType,
        urgency: urgency || 'normal',
        description: description || '',
        imageUrl: imageUrl || null,
        status: 'pending',
        partnerId: partnerId || null,
        crmStatus: 'novo',
        updatedAt: new Date()
      }
    });

    // Notificar admin (não-bloqueante para o paciente)
    inAppNotificationService.createNotification({
      userId: null,
      type: 'quote_request',
      title: 'Novo pedido de orçamento',
      message: `Novo pedido de orçamento para: ${examType}${partnerId ? ` (Parceiro: ${partnerId})` : ''}`,
      priority: 'high',
      link: `/admin/orcamentos?highlight=${newQuote.id}`
    }).catch(err => console.error('[NOTIFY_ADMIN_ERROR]:', err));

    res.status(201).json({
      success: true,
      message: 'Pedido de orçamento enviado com sucesso',
      quote: newQuote
    });
  } catch (error) {
    console.error('Erro ao criar pedido de orçamento:', error);
    res.status(500).json({ error: 'Erro interno ao salvar orçamento' });
  }
});

// Listar orçamentos do paciente
router.get('/patient', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: { User: { select: { phone: true } } },
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const patientPhone = patient.User?.phone || '___no_phone___';

    // Busca de Orçamentos e Pedidos de Disponibilidade em paralelo
    const [quotes, availabilityRequests] = await Promise.all([
      prisma.quote.findMany({
        where: {
          OR: [
            { patientId: patient.id },
            {
              AND: [{ patientId: null }, { patientPhone }],
            },
          ],
        },
        include: {
          Partner: {
            include: { User: { select: { name: true, avatar: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.availabilityRequest.findMany({
        where: {
          OR: [
            { patientId: patient.id },
            {
              Patient: {
                User: { phone: patientPhone },
              },
            },
          ],
        },
        include: {
          Partner: {
            include: { User: { select: { name: true, avatar: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Mapeamento de Orçamentos Tradicionais
    const mappedQuotes = quotes.map(q => {
      let responseData = { availableDates: [], preparationInstructions: [], observations: '' };
      try {
        if (q.crmNotes && q.crmNotes.trim().startsWith('{')) {
          responseData = JSON.parse(q.crmNotes);
        }
      } catch (e) { }

      return {
        id: q.id,
        partnerName: q.Partner?.User?.name || q.Partner?.name || 'Consultar',
        partnerRating: q.Partner?.rating || 4.5,
        partnerAddress: q.Partner?.address || '',
        examType: q.examType,
        price: q.valorEstimado || 0,
        availableDates: responseData.availableDates || (q.appointmentDate ? [q.appointmentDate.toISOString()] : []),
        preparationInstructions: responseData.preparationInstructions || [],
        observations: responseData.observations || q.crmNotes || '',
        status: q.status,
        validUntil: new Date(q.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: q.createdAt.toISOString(),
        partner: q.Partner ? { ...q.Partner, user: q.Partner.User } : null,
      };
    });

    // Mapeamento de Pedidos de Disponibilidade (Encaixe VIP)
    const mappedAvailability = availabilityRequests.map(aq => {
      let slots = [];
      if (Array.isArray(aq.suggestedSlotsJson)) {
        slots = aq.suggestedSlotsJson;
      } else if (aq.suggestedSlotsJson && typeof aq.suggestedSlotsJson === 'object') {
        // Fallback para caso seja um objeto com datas
        slots = (aq as any).suggestedSlotsJson.dates || [];
      }
      
      if (slots.length === 0 && aq.date) {
        slots = [aq.date];
      }

      return {
        id: `req-${aq.id}`,
        partnerName: aq.Partner?.User?.name || aq.Partner?.name || 'Parceiro Docton',
        partnerRating: aq.Partner?.rating || 5.0,
        partnerAddress: aq.Partner?.address || '',
        examType: `Encaixe VIP: ${aq.specialty}`,
        price: (aq as any).price || 0, 
        availableDates: slots,
        preparationInstructions: [],
        observations: `Solicitado para ${aq.date} às ${aq.time}. Urgência: ${aq.urgency}`,
        status: aq.status,
        validUntil: new Date(aq.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: aq.createdAt.toISOString(),
        partner: aq.Partner ? { ...aq.Partner, user: aq.Partner.User } : null,
      };
    });

    // Mesclar e ordenar
    const combined = [...mappedQuotes, ...mappedAvailability].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(combined);
  } catch (error) {
    console.error('Erro ao buscar orçamentos do paciente:', error);
    res.status(500).json({ error: 'Erro ao listar seus orçamentos' });
  }
});

// Listar para parceiro
router.get('/partner', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const quotes = await prisma.quote.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(quotes);
  } catch (error) {
    console.error('Erro ao buscar orçamentos do parceiro:', error);
    res.status(500).json({ error: 'Erro ao listar orçamentos' });
  }
});

// Responder a um orçamento (Parceiro)
router.post('/:id/respond', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { price, availableDates, preparationInstructions, observations } = req.body;
    const userId = req.user?.userId;

    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    // Verificar se o orçamento pertence ao parceiro
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) return res.status(404).json({ error: 'Orçamento não encontrado' });
    if (quote.partnerId !== partner.id) return res.status(403).json({ error: 'Não autorizado' });

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        status: 'responded',
        valorEstimado: price,
        crmNotes: JSON.stringify({
          availableDates,
          preparationInstructions,
          observations
        }),
        crmStatus: 'negotiation'
      }
    });

    // Notificar paciente
    if (updatedQuote.patientId) {
      const patient = await prisma.patient.findUnique({ where: { id: updatedQuote.patientId } });
      if (patient) {
        await inAppNotificationService.createNotification({
          userId: patient.userId,
          type: 'SYSTEM',
          title: 'Orçamento Recebido!',
          message: `Sua solicitação de ${updatedQuote.examType} foi respondida.`,
          priority: 'high',
          link: '/patient/orcamentos'
        });
        
        // Sincronização em Tempo Real via Socket.io
        SocketService.sendToUser(patient.userId, 'quoteUpdate', { quoteId: updatedQuote.id });
      }
    }

    res.json({ success: true, quote: updatedQuote });
  } catch (error) {
    console.error('Erro ao responder orçamento:', error);
    res.status(500).json({ error: 'Erro ao responder orçamento' });
  }
});

export default router;
