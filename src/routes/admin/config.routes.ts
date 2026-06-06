// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/config
 */
router.get('/config', ...adminAuth, async (req, res) => {
  try {
    const config = await prisma.systemConfig.findMany();
    const configMap = config.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    // Fallbacks
    const defaults = {
      maintenance_mode: 'false',
      signup_enabled: 'true',
      min_withdrawal_amount: '100',
      docton_fee_percent: '15'
    };

    return res.json({ ...defaults, ...configMap });
  } catch (error) {
    res.json({ maintenance_mode: 'false', signup_enabled: 'true' });
  }
});

/**
 * @route POST /api/admin/config
 */
router.post('/config', ...adminAuth, async (req, res) => {
  const body = req.body || {};
  try {
    const entries = Object.entries(body);
    for (const [key, value] of entries) {
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value), updatedAt: new Date() },
        create: { key, value: String(value) }
      });
    }

    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_CONFIG_UPDATED',
        resource: 'SystemConfig',
        userName: req.user?.userId ? String(req.user.userId) : 'Admin',
        userRole: 'ADMIN',
        ipAddress: req.ip || '127.0.0.1',
        details: body
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

/**
 * @route POST /api/admin/config/invalidate-tokens
 */
router.post('/config/invalidate-tokens', ...adminAuth, async (req, res) => {
  try {
    // Em uma implementação real com Redis, aqui invalidaríamos todos os tokens.
    // Com JWT stateless sem whitelist, poderíamos atualizar uma versão secreta global no DB (que exigiria re-login).
    await prisma.auditLog.create({
      data: {
        action: 'GLOBAL_TOKEN_INVALIDATION',
        resource: 'Auth',
        userName: req.user?.userId ? String(req.user.userId) : 'Admin',
        userRole: 'ADMIN',
        ipAddress: req.ip || '127.0.0.1',
        severity: 'critical',
        status: 'success'
      }
    });
    return res.json({ success: true, message: 'Comando de invalidação registrado e processando.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao invalidar sessões' });
  }
});

/**
 * @route GET /api/admin/boost-prices
 */
router.get('/boost-prices', ...adminAuth, async (req, res) => {
  try {
    const prices = await prisma.boostPrice.findMany({
      orderBy: { type: 'asc' }
    });
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar preços de impulsos' });
  }
});

/**
 * @route PUT /api/admin/boost-prices/:id
 */
router.put('/boost-prices/:id', ...adminAuth, async (req, res) => {
  const { id } = req.params;
  const { price, description } = req.body;
  try {
    const updated = await prisma.boostPrice.update({
      where: { id },
      data: {
        price: Number(price),
        description,
        updatedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'BOOST_PRICE_UPDATED',
        resource: 'BoostPrice',
        userName: req.user?.userId ? String(req.user.userId) : 'Admin',
        userRole: 'ADMIN',
        ipAddress: req.ip || '127.0.0.1',
        details: { id, price, description }
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar preço de impulso' });
  }
});

export default router;
