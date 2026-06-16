// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import inAppNotificationService from '../../services/inAppNotification.service.js';
import { SocketService } from '../../lib/socket.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route POST /api/admin/quotes
 */
router.post('/quotes', ...adminAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const newQuote = await prisma.quote.create({
      data: {
        id: Math.random().toString(36).substring(2, 11),
        patientName: body.patientName || 'Paciente',
        patientPhone: body.patientPhone || '',
        examType: body.examType || 'Consulta',
        urgency: body.urgency || 'normal',
        description: body.description || '',
        status: 'pending',
        valorEstimado: body.valorEstimado ? Number(body.valorEstimado) : null,
        discount: body.discount ? Number(body.discount) : 0,
        coupon: body.coupon || null,
        crmStatus: 'novo',
        updatedAt: new Date()
      }
    });
    res.status(201).json(newQuote);
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ error: 'Erro ao criar orçamento' });
  }
});

/**
 * @route GET /api/admin/quotes
 */
router.get('/quotes', ...adminAuth, async (req, res) => {
  try {
    const [quotes, availabilityRequests] = await Promise.all([
      prisma.quote.findMany({
        orderBy: { createdAt: 'desc' },
        include: { patient: {
            select: {
              User: { select: { name: true, phone: true } }
            }
          },
          Partner: {
            select: {
              id: true,
              name: true,
              crm: true
            }
          }
        }
      }),
      prisma.availabilityRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: { patient: {
             include: { User: true }
          },
          Partner: true
        }
      })
    ]);

    console.log(`[AdminQuotes] Encontrados ${quotes.length} orçamentos e ${availabilityRequests.length} pedidos de encaixe.`);

    const mappedQuotes = quotes.map(q => ({
      id: q.id,
      displayId: q.displayId || 0,
      patientName: q.patientName || q.Patient?.User?.name || 'Não identificado',
      patientPhone: q.patientPhone || q.Patient?.User?.phone || '',
      examType: q.examType,
      urgency: q.urgency,
      description: q.description || '',
      status: q.status,
      createdAt: q.createdAt.toISOString(),
      partnerId: q.partnerId || undefined,
      partner: q.Partner || undefined,
      valorEstimado: q.valorEstimado ?? undefined,
      patientInfo: {
        plan: undefined
      },
      crm: {
        statusInterno: q.crmStatus,
        proximoContato: q.crmNextContact?.toISOString().split('T')[0] || undefined,
        notas: q.crmNotes || undefined,
        responsavel: q.crmResponsavel || undefined,
        motivoPerda: q.crmMotivoPerda || undefined
      }
    }));

    const mappedAvailability = availabilityRequests.map(aq => ({
      id: `req-${aq.id}`,
      displayId: 0,
      patientName: aq.Patient?.User?.name || 'Não identificado',
      patientPhone: aq.Patient?.User?.phone || '',
      examType: `Encaixe VIP: ${aq.specialty}`,
      urgency: aq.urgency || 'normal',
      description: `Solicitação de Encaixe VIP para ${aq.specialty} em ${aq.date} às ${aq.time}. Parceiro desejado: ${aq.Partner?.name || 'Não informado'}`,
      status: (aq.status as any) || 'pending',
      createdAt: aq.createdAt.toISOString(),
      partnerId: aq.partnerId || undefined,
      partner: aq.Partner || undefined,
      valorEstimado: undefined,
      patientInfo: {
        plan: undefined
      },
      crm: {
        statusInterno: 'novo',
        proximoContato: undefined,
        notas: undefined,
        responsavel: undefined,
        motivoPerda: undefined
      }
    }));

    // Mesclar e ordenar por data
    const combined = [...mappedQuotes, ...mappedAvailability].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(combined);
  } catch (error: any) {
    console.error('CRITICAL ERROR in Admin Quotes List:', error);
    res.status(500).json({ error: 'Erro interno ao listar orçamentos/pedidos' });
  }
});

/**
 * @route PATCH /api/admin/quotes/:id
 */
router.patch('/quotes/:id', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    if (id.startsWith('req-')) {
      const updated = await prisma.availabilityRequest.update({
        where: { id: id.replace('req-', '') },
        data: {
          specialty: body.examType ? body.examType.replace('Encaixe VIP: ', '') : undefined,
          urgency: body.urgency ?? undefined,
          status: body.status ?? undefined,
          price: body.valorEstimado !== undefined ? Number(body.valorEstimado) : undefined,
        }
      });
      return res.json(updated);
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        patientName: body.patientName ?? undefined,
        patientPhone: body.patientPhone ?? undefined,
        examType: body.examType ?? undefined,
        urgency: body.urgency ?? undefined,
        description: body.description ?? undefined,
        status: body.status ?? undefined,
        valorEstimado: body.valorEstimado !== undefined ? Number(body.valorEstimado) : undefined,
        discount: body.discount !== undefined ? Number(body.discount) : undefined,
        coupon: body.coupon ?? undefined
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(404).json({ error: 'Orçamento não encontrado' });
  }
});

/**
 * @route PATCH /api/admin/quotes/:id/crm
 */
router.patch('/quotes/:id/crm', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { statusInterno, proximoContato, notas, responsavel, motivoPerda } = req.body;

    let newStatus = undefined;
    if (statusInterno === 'fechado_ganho') newStatus = 'accepted';
    else if (statusInterno === 'fechado_perdido') newStatus = 'rejected';
    else if (statusInterno) newStatus = 'responded';

    if (id.startsWith('req-')) {
       const updated = await prisma.availabilityRequest.update({
         where: { id: id.replace('req-', '') },
         data: {
           status: newStatus || undefined,
           updatedAt: new Date()
         }
       });
       return res.json({ id, crm: { statusInterno } });
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        crmStatus: statusInterno,
        crmNextContact: proximoContato ? new Date(proximoContato) : undefined,
        crmNotes: notas,
        crmResponsavel: responsavel,
        crmMotivoPerda: motivoPerda,
        status: newStatus,
        updatedAt: new Date()
      }
    });

    res.json({
      ...updated,
      crm: {
        statusInterno: updated.crmStatus,
        proximoContato: updated.crmNextContact,
        notas: updated.crmNotes,
        responsavel: updated.crmResponsavel,
        motivoPerda: updated.crmMotivoPerda
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar CRM' });
  }
});

/**
 * @route POST /api/admin/quotes/:id/respond
 */
router.post('/quotes/:id/respond', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    // Se for um pedido de Encaixe VIP vindo da aba unificada
    if (id.startsWith('req-')) {
      const realId = id.replace('req-', '');
      console.log(`[AdminRespond] Respondendo pedido de encaixe: ${realId}`);
      
      try {
        const aq = await prisma.availabilityRequest.update({
          where: { id: realId },
          data: {
            status: 'responded',
            suggestedSlotsJson: Array.isArray(body.availableDates) ? body.availableDates.filter(Boolean) : [],
            price: (!isNaN(parseFloat(body.price)) ? parseFloat(body.price) : 0),
            updatedAt: new Date()
          },
          include: { patient: { select: { userId: true, id: true } },
            Partner: { select: { name: true } }
          }
        });

        console.log(`[AdminRespond] Pedido ${realId} atualizado com sucesso.`);

        // Notificar o paciente
        if (aq.Patient?.userId) {
          await inAppNotificationService.createNotification({
            userId: aq.Patient.userId,
            type: 'quote_response',
            title: '✅ Encaixe VIP Respondido!',
            message: `Sua solicitação de encaixe para ${aq.specialty} foi analisada. Valor: R$ ${parseFloat(body.price || 0).toFixed(2)}. Confira as datas disponíveis!`,
            link: '/patient/orcamentos'
          }).catch(e => console.error('[NotifyError]', e));
          
          // Socket (Opcional se já estiver no notificationService)
          SocketService.sendToUser(aq.Patient.userId, 'quoteUpdate', { quoteId: id });
        }

        return res.json({ 
          id, 
          status: 'responded', 
          examType: `Encaixe VIP: ${aq.specialty}`,
          partner: aq.partner
        });
      } catch (innerError: any) {
        console.error(`[AdminRespond] Erro específico ao atualizar AvailabilityRequest ${realId}:`, innerError);
        return res.status(500).json({ error: 'Erro ao atualizar pedido de encaixe no banco de dados', details: innerError.message });
      }
    }

    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) return res.status(404).json({ error: 'Orçamento não encontrado' });

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        status: 'responded',
        crmStatus: 'aguardando_resposta',
        valorEstimado: (!isNaN(parseFloat(body.price)) ? parseFloat(body.price) : undefined),
        discount: (!isNaN(parseFloat(body.discount)) ? parseFloat(body.discount) : 0),
        coupon: body.coupon || null,
        partnerId: body.partnerId || null,
        appointmentDate: (body.appointmentDate && !isNaN(new Date(body.appointmentDate).getTime())) ? new Date(body.appointmentDate) : undefined,
        crmNotes: JSON.stringify({
          availableDates: body.availableDates || [],
          preparationInstructions: body.preparationInstructions || [],
          observations: body.observations || ''
        }),
        updatedAt: new Date()
      }
    });

    // Notify patient
    if (updated.patientId || updated.patientPhone) {
      const patient = await prisma.patient.findFirst({
        where: { OR: [{ id: updated.patientId || '' }, { User: { phone: updated.patientPhone || '' } }] }
      });
      
      if (patient) {
        const priceValue = parseFloat(body.price) || 0;
        await inAppNotificationService.createNotification({
          userId: patient.userId,
          type: 'quote_response',
          title: '✅ Orçamento Respondido!',
          message: `Seu orçamento para ${updated.examType} foi respondido. Valor: R$ ${priceValue.toFixed(2)}`,
          link: '/patient/orcamentos',
          priority: 'high'
        }).catch(() => {});
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error('RESPOND_QUOTE_ERROR:', error);
    res.status(500).json({ error: 'Erro ao responder orçamento' });
  }
});

/**
 * @route DELETE /api/admin/quotes/:id
 */
router.delete('/quotes/:id', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (id.startsWith('req-')) {
       await prisma.availabilityRequest.delete({ where: { id: id.replace('req-', '') } });
    } else {
       await prisma.quote.delete({ where: { id } });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE_QUOTE_ERROR:', error);
    res.status(404).json({ error: 'Orçamento não encontrado' });
  }
});

/**
 * @route POST /api/admin/quotes/:id/schedule
 */
router.post('/quotes/:id/schedule', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, partnerId } = req.body;
    
    if (id.startsWith('req-')) {
      const updated = await prisma.availabilityRequest.update({
        where: { id: id.replace('req-', '') },
        data: {
          status: 'scheduled',
          date: appointmentDate ? new Date(appointmentDate).toISOString().split('T')[0] : undefined,
          partnerId: partnerId || undefined,
          updatedAt: new Date()
        }
      });
      return res.json(updated);
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        status: 'scheduled',
        appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
        partnerId: partnerId || undefined,
        updatedAt: new Date()
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('SCHEDULE_QUOTE_ERROR:', error);
    res.status(500).json({ error: 'Erro ao agendar orçamento' });
  }
});

/**
 * @route POST /api/admin/quotes/:id/create-appointment
 */
router.post('/quotes/:id/create-appointment', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, partnerId, specialty, notes } = req.body;

    // First find the quote
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    // Create an appointment
    const appointment = await prisma.appointment.create({
      data: {
        id: Math.random().toString(36).substring(2, 11),
        patientId: quote.patientId || null,
        partnerId: partnerId || quote.partnerId || null,
        specialty: specialty || quote.examType,
        date: appointmentDate ? new Date(appointmentDate) : new Date(),
        status: 'scheduled',
        notes: notes || quote.description || '',
        type: 'in_person',
        price: quote.valorEstimado || 0
      }
    });

    // Update quote status
    await prisma.quote.update({
      where: { id },
      data: {
        status: 'accepted',
        appointmentId: appointment.id,
        updatedAt: new Date()
      }
    });

    res.json(appointment);
  } catch (error) {
    console.error('CREATE_APPOINTMENT_ERROR:', error);
    res.status(500).json({ error: 'Erro ao criar consulta' });
  }
});

/**
 * @route GET /api/admin/quotes/tasks
 */
router.get('/quotes/tasks', ...adminAuth, async (req, res) => {
  try {
    // Get recent quotes and availability requests to use as tasks
    const [quotes, availabilityRequests] = await Promise.all([
      prisma.quote.findMany({
        where: {
          OR: [
            { status: 'pending' },
            { crmNextContact: { not: null } }
          ]
        },
        include: { patient: {
            include: { User: { select: { name: true, phone: true } } }
          },
          Partner: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.availabilityRequest.findMany({
        where: { status: 'pending' },
        include: { patient: {
            include: { User: { select: { name: true, phone: true } } }
          },
          Partner: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    const tasks = [
      ...quotes.map(q => ({
        id: q.id,
        title: q.examType,
        description: q.description,
        patientName: q.Patient?.User?.name || q.patientName,
        patientPhone: q.Patient?.User?.phone || q.patientPhone,
        status: q.status,
        urgency: q.urgency,
        type: 'quote',
        dueDate: q.crmNextContact,
        createdAt: q.createdAt
      })),
      ...availabilityRequests.map(aq => ({
        id: `req-${aq.id}`,
        title: `Encaixe VIP: ${aq.specialty}`,
        description: `Solicitação de encaixe para ${aq.specialty}`,
        patientName: aq.Patient?.User?.name,
        patientPhone: aq.Patient?.User?.phone,
        status: aq.status,
        urgency: aq.urgency,
        type: 'availability',
        dueDate: aq.date ? new Date(aq.date) : null,
        createdAt: aq.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(tasks);
  } catch (error) {
    console.error('GET_TASKS_ERROR:', error);
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

/**
 * @route GET /api/admin/quotes/report-by-responsavel
 */
router.get('/quotes/report-by-responsavel', ...adminAuth, async (req, res) => {
  try {
    const quotes = await prisma.quote.findMany({
      where: {
        crmResponsavel: { not: null }
      },
      select: {
        crmResponsavel: true,
        crmStatus: true,
        valorEstimado: true
      }
    });

    const reportMap = new Map();
    quotes.forEach(q => {
      const key = q.crmResponsavel;
      if (!reportMap.has(key)) {
        reportMap.set(key, {
          responsavel: key,
          fechadosGanho: 0,
          receitaGanha: 0
        });
      }
      const entry = reportMap.get(key);
      if (q.crmStatus === 'fechado_ganho') {
        entry.fechadosGanho++;
        entry.receitaGanha += Number(q.valorEstimado || 0);
      }
    });

    const report = Array.from(reportMap.values());
    res.json(report);
  } catch (error) {
    console.error('Error fetching quotes report:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

export default router;
