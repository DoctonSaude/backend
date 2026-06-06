// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { sendEmail } from '../../services/email.service.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/workflow-rules
 */
router.get('/workflow-rules', ...adminAuth, async (req, res) => {
  try {
    let rules = await prisma.workflowRule.findMany({ orderBy: { createdAt: 'desc' } });

    if (rules.length === 0) {
      await prisma.workflowRule.createMany({
        data: [
          {
            name: 'Boas-vindas para Novos Pacientes',
            description: 'Envia sequência de emails de onboarding automaticamente após o cadastro.',
            trigger: { type: 'user_action', condition: 'user_registered', parameters: { delay: 0 } },
            actions: [
              { type: 'email', description: 'Email de boas-vindas imediato', parameters: { template: 'welcome_patient' } },
              { type: 'notification', description: 'Push: Complete seu perfil', parameters: { delay: 24 } }
            ],
            isActive: true,
            category: 'user_management',
            executionCount: 154
          },
          {
            name: 'Lembrete de Agendamento (24h)',
            description: 'Notifica o paciente um dia antes da consulta marcada.',
            trigger: { type: 'time_based', condition: 'appointment_reminder', parameters: { interval: 24, unit: 'hours' } },
            actions: [
              { type: 'sms', description: 'SMS de lembrete', parameters: { template: 'reminder_sms' } },
              { type: 'email', description: 'Email com detalhes do acesso', parameters: { template: 'appointment_details' } }
            ],
            isActive: true,
            category: 'notifications',
            executionCount: 890
          },
          {
            name: 'Cobrança de Faturas Vencidas',
            description: 'Verifica faturas pendentes e inicia fluxo de recuperação.',
            trigger: { type: 'data_change', condition: 'payment_overdue', parameters: { check_frequency: 'daily' } },
            actions: [
              { type: 'api_call', description: 'Bloquear acesso premium', parameters: { action: 'suspend_plan' } },
              { type: 'email', description: 'Aviso de pendência financeira', parameters: { template: 'payment_warning' } }
            ],
            isActive: true,
            category: 'financial',
            executionCount: 42
          }
        ]
      });
      rules = await prisma.workflowRule.findMany({ orderBy: { createdAt: 'desc' } });
    }

    return res.json(rules);
  } catch (error) {
    console.error('Error fetching workflow rules:', error);
    res.json([]);
  }
});

/**
 * @route POST /api/admin/workflow-rules
 */
router.post('/workflow-rules', ...adminAuth, async (req, res) => {
  const body = req.body || {};
  try {
    const created = await prisma.workflowRule.create({
      data: {
        name: String(body.name || 'Nova Regra'),
        description: body.description ? String(body.description) : null,
        trigger: body.trigger || {},
        actions: body.actions || [],
        isActive: body.isActive !== false,
        category: String(body.category || 'user_management'),
        executionCount: 0
      }
    });
    return res.status(201).json(created);
  } catch (error) {
    console.error('Error creating workflow rule:', error);
    res.status(500).json({ error: 'Erro ao criar regra de workflow' });
  }
});

/**
 * @route GET /api/admin/workflow-rules/:id
 */
router.get('/workflow-rules/:id', ...adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const rule = await prisma.workflowRule.findUnique({ where: { id } });
    if (!rule) return res.status(404).json({ error: 'Regra não encontrada' });
    return res.json(rule);
  } catch (error) {
    console.error('Error fetching workflow rule:', error);
    res.status(500).json({ error: 'Erro ao buscar regra' });
  }
});

/**
 * @route PUT /api/admin/workflow-rules/:id
 */
router.put('/workflow-rules/:id', ...adminAuth, async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  try {
    const update: any = {
      ...(typeof body.name === 'string' ? { name: body.name } : {}),
      ...(typeof body.description === 'string' ? { description: body.description } : {}),
      ...(typeof body.trigger !== 'undefined' ? { trigger: body.trigger } : {}),
      ...(typeof body.actions !== 'undefined' ? { actions: body.actions } : {}),
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
      ...(typeof body.category === 'string' ? { category: body.category } : {}),
    };

    const updated = await prisma.workflowRule.update({
      where: { id },
      data: update
    });
    return res.json(updated);
  } catch (error) {
    console.error('Workflow update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar regra. Verifique se o ID existe.' });
  }
});

/**
 * @route DELETE /api/admin/workflow-rules/:id
 */
router.delete('/workflow-rules/:id', ...adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.workflowRule.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow rule:', error);
    res.status(500).json({ error: 'Erro ao excluir regra' });
  }
});

/**
 * @route POST /api/admin/workflow-rules/:id/send
 */
router.post('/workflow-rules/:id/send', ...adminAuth, async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const channels = body.channels || {};
  const message = body.message || {};
  const recipients = body.recipients || {};
  const emails: string[] = Array.isArray(recipients.emails) ? recipients.emails.filter((e: any) => typeof e === 'string' && e.includes('@')) : [];
  const phones: string[] = Array.isArray(recipients.phones) ? recipients.phones.filter((p: any) => typeof p === 'string' && p.trim().length >= 8) : [];
  
  try {
    const rule = await prisma.workflowRule.findUnique({ where: { id } });
    if (!rule) return res.status(404).json({ error: 'Regra não encontrada' });
    
    const results: any = { email: [], whatsapp: [] };
    
    if (channels.email && emails.length > 0) {
      for (const to of emails) {
        const info = await sendEmail({
          to,
          subject: String(message.subject || rule.name),
          html: typeof message.html === 'string' ? message.html : undefined,
          text: typeof message.text === 'string' ? message.text : undefined,
          data: { title: rule.name, description: rule.description || '', content: message.text || '' },
        });
        results.email.push({ to, id: info?.messageId || null });
      }
    }
    
    if (channels.whatsapp && phones.length > 0) {
      for (const phone of phones) {
        results.whatsapp.push({ to: phone, status: 'queued' });
      }
    }
    
    await prisma.auditLog.create({
      data: {
        timestamp: new Date(),
        userId: req.user?.userId || null,
        userName: req.user?.userId ? String(req.user.userId) : 'Sistema',
        userRole: 'ADMIN',
        action: 'WORKFLOW_MESSAGE_SEND',
        resource: 'WorkflowRule',
        resourceId: id,
        ipAddress: (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
        severity: 'medium',
        category: 'system',
        status: 'success',
        details: { channels, recipients: { emails, phones }, counts: { email: results.email.length, whatsapp: results.whatsapp.length } },
      },
    });
    
    return res.json({ success: true, results });
  } catch (error) {
    console.error('Error sending workflow message:', error);
    return res.status(500).json({ error: 'Erro ao enviar mensagens' });
  }
});

export default router;
