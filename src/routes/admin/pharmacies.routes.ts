// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/pharmacies
 */
router.get('/pharmacies', ...adminAuth, async (req, res) => {
  try {
    const { status, q } = req.query;
    const where: any = {};
    
    if (status === 'pending') where.isApproved = false;
    if (status === 'active') where.isApproved = true;
    if (q) {
      where.OR = [
        { name: { contains: String(q), mode: 'insensitive' } },
        { city: { contains: String(q), mode: 'insensitive' } },
        { cnpj: { contains: String(q) } }
      ];
    }

    const pharmacies = await prisma.pharmacy.findMany({
      where,
      include: {
        User: { select: { email: true, phone: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Mapeia para o formato esperado pelo frontend (User[] -> user)
    const mapped = pharmacies.map(p => ({
      ...p,
      user: p.User?.[0] || null
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('[GET /pharmacies]', error);
    res.status(500).json({ error: 'Erro ao listar farmácias' });
  }
});

/**
 * @route GET /api/admin/pharmacies/:id
 */
router.get('/pharmacies/:id', ...adminAuth, async (req, res) => {
  try {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: req.params.id },
      include: {
        User: { select: { email: true, phone: true, name: true } }
      }
    });
    if (!pharmacy) return res.status(404).json({ error: 'Farmácia não encontrada' });
    
    return res.json({
      ...pharmacy,
      user: pharmacy.User?.[0] || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar farmácia' });
  }
});

/**
 * @route POST /api/admin/pharmacies
 */
router.post('/pharmacies', ...adminAuth, async (req, res) => {
  try {
    const body = req.body || {};
    let userId = null;

    // Se fornecido e-mail, cria ou associa um usuário
    if (body.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
      if (!existingUser) {
        const bcrypt = (await import('bcryptjs')).default;
        const passToHash = body.password || (Math.random().toString(36).slice(2) + 'Ph@rm1!');
        const hashedPassword = await bcrypt.hash(passToHash, 10);
        
        const newUser = await prisma.user.create({
          data: {
            email: body.email,
            name: body.name || 'Farmácia',
            phone: body.phone || '',
            password: hashedPassword,
            role: 'PHARMACY'
          }
        });
        userId = newUser.id;
      } else {
        userId = existingUser.id;
        // Atualiza a role se necessário
        await prisma.user.update({
            where: { id: userId },
            data: { role: 'PHARMACY' }
        });
      }
    }

    const pharmacy = await prisma.pharmacy.create({
      data: {
        name: body.name,
        cnpj: body.cnpj,
        phone: body.phone,
        address: body.address,
        isApproved: body.status === 'Ativo' || body.isApproved === true,
        updatedAt: new Date()
      }
    });

    // Vincula o usuário à farmácia se existir
    if (userId) {
        await prisma.user.update({
            where: { id: userId },
            data: { pharmacyId: pharmacy.id }
        });
    }

    return res.status(201).json(pharmacy);
  } catch (error) {
    console.error('[POST /pharmacies]', error);
    res.status(500).json({ error: 'Erro ao criar farmácia' });
  }
});

/**
 * @route PUT /api/admin/pharmacies/:id
 */
router.put('/pharmacies/:id', ...adminAuth, async (req, res) => {
  const body = req.body || {};
  try {
    const updated = await prisma.pharmacy.update({
      where: { id: req.params.id },
      data: {
        name: body.name,
        cnpj: body.cnpj,
        city: body.city,
        state: body.state,
        address: body.address,
        isApproved: body.status === 'Ativo' ? true : (body.status === 'Inativo' ? false : body.isApproved),
        updatedAt: new Date()
      },
      include: {
          User: true
      }
    });

    // Se houver userId vinculado e dados de usuário para atualizar
    const userId = updated.User?.[0]?.id;
    if (userId && (body.email || body.password)) {
        const userData: any = {};
        if (body.email) userData.email = body.email;
        if (body.password) {
            const bcrypt = (await import('bcryptjs')).default;
            userData.password = await bcrypt.hash(body.password, 10);
        }
        await prisma.user.update({
            where: { id: userId },
            data: userData
        }).catch(() => {});
    }

    return res.json(updated);
  } catch (error) {
    console.error('[PUT /pharmacies/:id]', error);
    res.status(404).json({ error: 'Farmácia não encontrada ou erro na atualização' });
  }
});

/**
 * @route DELETE /api/admin/pharmacies/:id
 */
router.delete('/pharmacies/:id', ...adminAuth, async (req, res) => {
  try {
    // Ao deletar a farmácia, opcionalmente limpar o pharmacyId dos usuários vinculados
    await prisma.user.updateMany({
        where: { pharmacyId: req.params.id },
        data: { pharmacyId: null }
    });
    
    await prisma.pharmacy.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'Farmácia não encontrada' });
  }
});

export default router;
