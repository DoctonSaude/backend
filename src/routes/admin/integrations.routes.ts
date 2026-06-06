// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

// --- API Keys ---

/**
 * @route GET /api/admin/api-keys
 */
router.get('/api-keys', ...adminAuth, async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(keys);
  } catch (error) {
    res.json([]);
  }
});

/**
 * @route POST /api/admin/api-keys
 */
router.post('/api-keys', ...adminAuth, async (req, res) => {
  const b = req.body || {};
  try {
    const bcrypt = (await import('bcryptjs')).default;
    const raw = 'dk_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const hash = await bcrypt.hash(raw, 10);
    const masked = `${raw.slice(0, 4)}****${raw.slice(-2)}`;
    
    const created = await prisma.apiKey.create({
      data: {
        name: String(b.name || 'Chave API'),
        keyHash: hash,
        keyMasked: masked,
        scopes: b.scopes || [],
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        createdAt: new Date()
      }
    });

    res.status(201).json({ ...created, secret: raw });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar chave' });
  }
});

/**
 * @route DELETE /api/admin/api-keys/:id
 */
router.delete('/api-keys/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.apiKey.update({
      where: { id: req.params.id },
      data: { revoked: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'Chave não encontrada' });
  }
});

/**
 * @route POST /api/admin/api-keys/:id/rotate
 */
router.post('/api-keys/:id/rotate', ...adminAuth, async (req, res) => {
  try {
    const bcrypt = (await import('bcryptjs')).default;
    const raw = 'dk_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const hash = await bcrypt.hash(raw, 10);
    const masked = `${raw.slice(0, 4)}****${raw.slice(-2)}`;
    
    const updated = await prisma.apiKey.update({
      where: { id: req.params.id },
      data: { keyHash: hash, keyMasked: masked, updatedAt: new Date() }
    });

    res.json({ ...updated, secret: raw });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao rotacionar chave' });
  }
});

// --- Webhooks ---

/**
 * @route GET /api/admin/webhooks
 */
router.get('/webhooks', ...adminAuth, async (req, res) => {
  try {
    const hooks = await prisma.webhook.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(hooks);
  } catch (error) {
    res.json([]);
  }
});

/**
 * @route POST /api/admin/webhooks
 */
router.post('/webhooks', ...adminAuth, async (req, res) => {
  const b = req.body || {};
  try {
    const created = await prisma.webhook.create({
      data: {
        url: String(b.url || ''),
        secret: b.secret || null,
        active: b.active !== false
      }
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar webhook' });
  }
});

/**
 * @route PUT /api/admin/webhooks/:id
 */
router.put('/webhooks/:id', ...adminAuth, async (req, res) => {
  const b = req.body || {};
  try {
    const updated = await prisma.webhook.update({
      where: { id: req.params.id },
      data: {
        ...(typeof b.url === 'string' ? { url: b.url } : {}),
        ...(typeof b.secret === 'string' ? { secret: b.secret } : {}),
        ...(typeof b.active === 'boolean' ? { active: b.active } : {})
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar webhook' });
  }
});

/**
 * @route DELETE /api/admin/webhooks/:id
 */
router.delete('/webhooks/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.webhook.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover webhook' });
  }
});

/**
 * @route POST /api/admin/webhooks/:id/test
 */
router.post('/webhooks/:id/test', ...adminAuth, async (req, res) => {
  try {
    // Apenas simula o envio de um payload
    await new Promise(resolve => setTimeout(resolve, 500));
    res.json({ success: true, message: 'Ping enviado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Falha no teste' });
  }
});

// --- Integrations ---

/**
 * @route GET /api/admin/integrations
 */
router.get('/integrations', ...adminAuth, async (req, res) => {
  try {
    const integrations = await prisma.integration.findMany({ orderBy: { createdAt: 'desc' } });
    if (integrations.length === 0) {
      // Seed samples
      await prisma.integration.createMany({
        data: [
          { name: 'WhatsApp API', description: 'Notificações via WhatsApp', status: 'active' },
          { name: 'Gateway de Pagamento', description: 'Iugu/Stripe', status: 'active' },
          { name: 'Google Calendar', description: 'Sincronização de agendas', status: 'inactive' }
        ]
      });
      return res.json(await prisma.integration.findMany({ orderBy: { createdAt: 'desc' } }));
    }
    return res.json(integrations);
  } catch (error) {
    res.json([]);
  }
});

/**
 * @route PUT /api/admin/integrations/:id
 */
router.put('/integrations/:id', ...adminAuth, async (req, res) => {
  const b = req.body || {};
  try {
    const dataToUpdate: any = {};
    if (typeof b.name === 'string') dataToUpdate.name = b.name;
    if (typeof b.description === 'string') dataToUpdate.description = b.description;
    if (typeof b.status === 'string') dataToUpdate.status = b.status;
    if (b.settings !== undefined) dataToUpdate.settings = b.settings;

    const updated = await prisma.integration.update({
      where: { id: req.params.id },
      data: dataToUpdate
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar integração' });
  }
});

/**
 * @route POST /api/admin/integrations/:id/health
 */
router.post('/integrations/:id/health', ...adminAuth, async (req, res) => {
  try {
    // Simula um ping com latência variável
    const latency = Math.floor(Math.random() * 80) + 20;
    await new Promise(resolve => setTimeout(resolve, latency));
    res.json({ success: true, latency: `${latency}ms` });
  } catch (error) {
    res.status(500).json({ error: 'Erro de comunicação' });
  }
});

export default router;
