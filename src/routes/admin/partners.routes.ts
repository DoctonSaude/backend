// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/partners
 */
router.get('/partners', ...adminAuth, async (req, res) => {
  try {
    const { status, q } = req.query;
    const where: any = {
      isApproved: true // Padrão: mostra somente parceiros aprovados nesta tela
    };
    
    if (status === 'pending') where.isApproved = false;
    if (status === 'all') delete where.isApproved;

    if (q) {
      where.OR = [
        { name: { contains: String(q), mode: 'insensitive' } },
        { city: { contains: String(q), mode: 'insensitive' } },
        { specialty: { contains: String(q), mode: 'insensitive' } }
      ];
    }

    const partners = await prisma.partner.findMany({
      where: where,
      include: {
        User: {
          select: {
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const mappedPartners = partners.map(p => ({
      ...p,
      status: p.isApproved ? 'Ativo' : 'Inativo',
      registrationDate: p.createdAt
    }));

    return res.json(mappedPartners);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar parceiros' });
  }
});

/**
 * @route GET /api/admin/partners/:id
 */
router.get('/partners/:id', ...adminAuth, async (req, res) => {
  try {
    const partner = await prisma.partner.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { email: true, phone: true, name: true } },
        services: true,
        addresses: true
      }
    });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });
    return res.json(partner);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar parceiro' });
  }
});

/**
 * @route POST /api/admin/partners
 */
router.post('/partners', ...adminAuth, async (req, res) => {
  try {
    const body = req.body || {};
    let userId = null;

    if (body.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
      if (!existingUser) {
        const bcrypt = (await import('bcryptjs')).default;
        const passToHash = body.password || (Math.random().toString(36).slice(2) + 'P@ss!');
        const hashedPassword = await bcrypt.hash(passToHash, 10);
        
        const newUser = await prisma.user.create({
          data: {
            email: body.email,
            name: body.name || 'Parceiro',
            phone: body.phone || '',
            password: hashedPassword,
            role: 'PARTNER'
          }
        });
        userId = newUser.id;
      } else {
        userId = existingUser.id;
        // Optionally update password if provided and user already exists?
        if (body.password) {
          const bcrypt = (await import('bcryptjs')).default;
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { password: await bcrypt.hash(body.password, 10) }
          });
        }
      }
    }

    const partner = await prisma.partner.create({
      data: {
        userId,
        name: body.name,
        phone: body.phone,
        type: body.type || 'INDIVIDUAL',
        specialty: body.specialty,
        crm: body.crm,
        cnpj: body.cnpj,
        rating: body.rating ? Number(body.rating) : 0,
        isApproved: body.status === 'Ativo' ? true : (body.isApproved || false),
        zipCode: body.zipCode || body.cep,
        updatedAt: new Date()
      }
    });

    return res.status(201).json(partner);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar parceiro' });
  }
});

/**
 * @route PUT /api/admin/partners/:id
 */
router.put('/partners/:id', ...adminAuth, async (req, res) => {
  const body = req.body || {};
  try {
    // Monta objeto apenas com campos definidos (evita erros no Prisma com undefined)
    const dataToUpdate: any = { updatedAt: new Date() };

    const stringFields = ['name', 'specialty', 'city', 'state', 'type', 'cnpj', 'crm', 'phone', 'description', 'address'];
    for (const field of stringFields) {
      if (typeof body[field] !== 'undefined') dataToUpdate[field] = body[field] || null;
    }

    const zipCode = body.zipCode || body.cep;
    if (zipCode) dataToUpdate.zipCode = zipCode;

    if (body.status === 'Ativo') dataToUpdate.isApproved = true;
    else if (body.status === 'Inativo') dataToUpdate.isApproved = false;
    else if (typeof body.isApproved !== 'undefined') dataToUpdate.isApproved = Boolean(body.isApproved);

    if (typeof body.rating !== 'undefined' && body.rating !== '') {
      const r = Number(body.rating);
      if (!isNaN(r)) dataToUpdate.rating = r;
    }

    const updated = await prisma.partner.update({
      where: { id: req.params.id },
      data: dataToUpdate
    });

    // Atualiza email/senha do usuário vinculado
    if (updated.userId && (body.email || body.password)) {
      const userDataToUpdate: any = {};
      if (body.email) userDataToUpdate.email = body.email;
      
      if (body.password && body.password.trim().length > 0) {
        const bcrypt = (await import('bcryptjs')).default;
        userDataToUpdate.password = await bcrypt.hash(body.password, 10);
      }
      
      if (Object.keys(userDataToUpdate).length > 0) {
        prisma.user.update({
          where: { id: updated.userId },
          data: userDataToUpdate
        }).catch(() => {});
      }
    }

    // Salva auditLog em paralelo sem bloquear a resposta
    prisma.auditLog.create({
      data: {
        action: 'PARTNER_UPDATED',
        resource: 'Partner',
        resourceId: updated.id,
        userName: req.user?.userId ? String(req.user.userId) : 'Admin',
        userRole: 'ADMIN',
        ipAddress: req.ip || '127.0.0.1',
        details: { id: updated.id, fields: Object.keys(dataToUpdate) }
      }
    }).catch(() => {});

    return res.json({
      ...updated,
      status: updated.isApproved ? 'Ativo' : 'Inativo',
      registrationDate: updated.createdAt
    });
  } catch (error: any) {
    console.error('[PUT /partners/:id]', error?.message || error);
    res.status(500).json({ error: 'Erro ao atualizar parceiro: ' + (error?.message || 'Desconhecido') });
  }
});

/**
 * @route DELETE /api/admin/partners/:id
 */
router.delete('/partners/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.partner.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'Parceiro não encontrado' });
  }
});

/**
 * @route POST /api/admin/partners/:id/approve
 */
router.post('/partners/:id/approve', ...adminAuth, async (req, res) => {
  try {
    const updated = await prisma.partner.update({
      where: { id: req.params.id },
      data: { isApproved: true, updatedAt: new Date() }
    });
    
    // Notificar usuário?
    
    return res.json(updated);
  } catch (error) {
    res.status(404).json({ error: 'Parceiro não encontrado' });
  }
});

export default router;
