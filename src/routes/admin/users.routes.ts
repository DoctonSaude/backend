// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { z } from 'zod';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

/**
 * @route GET /api/admin/users
 */
router.get('/users', ...adminAuth, async (req, res) => {
  try {
    const { role, q, page = '1', limit = '10' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where: any = {};
    if (role && role !== 'all') where.role = role;
    if (q) {
      where.OR = [
        { name: { contains: String(q), mode: 'insensitive' } },
        { email: { contains: String(q), mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        select: { 
          id: true, 
          name: true, 
          email: true, 
          role: true, 
          phone: true,
          createdAt: true, 
          emailVerified: true, 
          avatar: true,
          Patient: true,
          Partner: true,
          Pharmacy: true
        }
      }),
      prisma.user.count({ where })
    ]);

    return res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

/**
 * @route GET /api/admin/users/:id
 */
router.get('/users/:id', ...adminAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        partner: true,
        pharmacy: true
      }
    });

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    // Remove sensitive data
    const { password, ...safeUser } = user;
    return res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

/**
 * @route POST /api/admin/users
 */
router.post('/users', ...adminAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['ADMIN', 'PATIENT', 'PARTNER', 'PHARMACY', 'SUPPORT']).default('PATIENT')
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', issues: parsed.error.issues });

  try {
    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

    const created = await prisma.user.create({
      data: {
        ...parsed.data,
        password: hashedPassword,
        emailVerified: true
      }
    });

    const { password, ...safeUser } = created;
    return res.status(201).json(safeUser);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

/**
 * @route PUT /api/admin/users/:id
 */
router.put('/users/:id', ...adminAuth, async (req, res) => {
  const body = req.body || {};
  try {
    const update: any = {
      ...(typeof body.name === 'string' ? { name: body.name } : {}),
      ...(typeof body.email === 'string' ? { email: body.email } : {}),
      ...(typeof body.role === 'string' ? { role: body.role } : {}),
      ...(typeof body.emailVerified === 'boolean' ? { emailVerified: body.emailVerified } : {}),
    };

    if (body.password) {
      const bcrypt = (await import('bcryptjs')).default;
      update.password = await bcrypt.hash(String(body.password), 10);
    }

    if (body.phone) {
      update.phone = body.phone;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: update,
      include: {
        Patient: true,
        Partner: true
      }
    });

    // Sincroniza plano e telefone nos modelos relacionados
    if (body.plan || body.phone) {
      if (updated.Patient) {
        const patientData: any = {};
        if (body.plan) patientData.planType = body.plan;
        // Nota: O modelo Patient não possui campo 'phone' direto, usa o do User
        
        if (Object.keys(patientData).length > 0) {
          await prisma.patient.update({
            where: { id: updated.Patient.id },
            data: patientData
          });
        }
      }

      if (updated.Partner) {
        const partnerData: any = {};
        if (body.plan) partnerData.planType = body.plan;
        if (body.phone) partnerData.phone = body.phone;

        if (Object.keys(partnerData).length > 0) {
          await prisma.partner.update({
            where: { id: updated.Partner.id },
            data: partnerData
          });
        }
      }
    }

    const { password, ...safeUser } = updated;
    return res.json(safeUser);
  } catch (error) {
    console.error('Update error:', error);
    res.status(404).json({ error: 'Usuário não encontrado ou erro na atualização' });
  }
});

/**
 * @route DELETE /api/admin/users/:id
 */
router.delete('/users/:id', ...adminAuth, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'Usuário não encontrado' });
  }
});

/**
 * @route GET /api/admin/roles
 */
router.get('/roles', ...adminAuth, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    });
    
    if (roles.length === 0) {
      // Seed roles com as permissões padrões completas em JSON
      const adminPerms = {
        dashboard: { visualizar: true },
        usuarios: { visualizar: true, excluir: true, adicionar: true, editar: true },
        parceiros: { visualizar: true, excluir: true, adicionar: true, editar: true },
        financeiro: { visualizar: true, adicionarTransacao: true, editarTransacao: true, gerarRelatorio: true },
        orcamentos: { visualizar: true, adicionar: true, aprovar: true, recusar: true, editar: true },
        relatorios: { visualizar: true, exportar: true },
        planos: { visualizar: true, desativar: true, adicionar: true, editar: true },
        suporte: { visualizarTickets: true, verMetricas: true, responderTickets: true, encerrarTickets: true },
        permissoes: { visualizar: true, excluirFuncao: true, adicionarFuncao: true, editarFuncao: true }
      };

      const supportPerms = {
        dashboard: { visualizar: true },
        usuarios: { visualizar: true, excluir: false, adicionar: false, editar: false },
        parceiros: { visualizar: true, excluir: false, adicionar: false, editar: false },
        financeiro: { visualizar: false, adicionarTransacao: false, editarTransacao: false, gerarRelatorio: false },
        orcamentos: { visualizar: true, adicionar: false, aprovar: false, recusar: false, editar: false },
        relatorios: { visualizar: false, exportar: false },
        planos: { visualizar: true, desativar: false, adicionar: false, editar: false },
        suporte: { visualizarTickets: true, verMetricas: true, responderTickets: true, encerrarTickets: true },
        permissoes: { visualizar: false, excluirFuncao: false, adicionarFuncao: false, editarFuncao: false }
      };

      const financialPerms = {
        dashboard: { visualizar: true },
        usuarios: { visualizar: false, excluir: false, adicionar: false, editar: false },
        parceiros: { visualizar: true, excluir: false, adicionar: false, editar: false },
        financeiro: { visualizar: true, adicionarTransacao: true, editarTransacao: true, gerarRelatorio: true },
        orcamentos: { visualizar: true, adicionar: false, aprovar: true, recusar: true, editar: true },
        relatorios: { visualizar: true, exportar: true },
        planos: { visualizar: true, desativar: false, adicionar: false, editar: false },
        suporte: { visualizarTickets: false, verMetricas: false, responderTickets: false, encerrarTickets: false },
        permissoes: { visualizar: false, excluirFuncao: false, adicionarFuncao: false, editarFuncao: false }
      };

      const marketingPerms = {
        dashboard: { visualizar: true },
        usuarios: { visualizar: false, excluir: false, adicionar: false, editar: false },
        parceiros: { visualizar: true, excluir: false, adicionar: false, editar: false },
        financeiro: { visualizar: false, adicionarTransacao: false, editarTransacao: false, gerarRelatorio: false },
        orcamentos: { visualizar: false, adicionar: false, aprovar: false, recusar: false, editar: false },
        relatorios: { visualizar: true, exportar: false },
        planos: { visualizar: false, desativar: false, adicionar: false, editar: false },
        suporte: { visualizarTickets: false, verMetricas: false, responderTickets: false, encerrarTickets: false },
        permissoes: { visualizar: false, excluirFuncao: false, adicionarFuncao: false, editarFuncao: false }
      };

      await prisma.role.createMany({
        data: [
          { name: 'ADMIN', description: 'Acesso total ao sistema', permissionsJson: adminPerms, updatedAt: new Date() },
          { name: 'SUPPORT', description: 'Atendimento e suporte ao cliente', permissionsJson: supportPerms, updatedAt: new Date() },
          { name: 'FINANCIAL', description: 'Gestão de faturamento e pagamentos', permissionsJson: financialPerms, updatedAt: new Date() },
          { name: 'MARKETING', description: 'Gestão de blog, cupons e campanhas', permissionsJson: marketingPerms, updatedAt: new Date() }
        ]
      });

      const seededRoles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
      return res.json(seededRoles.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        permissions: r.permissionsJson || {}
      })));
    }

    return res.json(roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      permissions: r.permissionsJson || {}
    })));
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Erro ao listar funções' });
  }
});

/**
 * @route POST /api/admin/roles
 */
router.post('/roles', ...adminAuth, async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome da função é obrigatório' });

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ error: 'Função com este nome já existe' });

    const created = await prisma.role.create({
      data: {
        name,
        description,
        permissionsJson: permissions || {},
        updatedAt: new Date()
      }
    });

    return res.status(201).json({
      id: created.id,
      name: created.name,
      description: created.description || '',
      permissions: created.permissionsJson || {}
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Erro ao criar função' });
  }
});

/**
 * @route PUT /api/admin/roles/:id
 */
router.put('/roles/:id', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return res.status(404).json({ error: 'Função não encontrada' });

    const updated = await prisma.role.update({
      where: { id },
      data: {
        name: name !== undefined ? name : role.name,
        description: description !== undefined ? description : role.description,
        permissionsJson: permissions !== undefined ? permissions : role.permissionsJson,
        updatedAt: new Date()
      }
    });

    return res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description || '',
      permissions: updated.permissionsJson || {}
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Erro ao atualizar função' });
  }
});

/**
 * @route DELETE /api/admin/roles/:id
 */
router.delete('/roles/:id', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return res.status(404).json({ error: 'Função não encontrada' });

    // Desvincula os usuários da relação implícita N-para-N RoleToUser
    await prisma.role.update({
      where: { id },
      data: {
        User: {
          set: []
        }
      }
    });

    // Desvincula de Admin
    await prisma.admin.updateMany({
      where: { roleId: id },
      data: { roleId: null }
    });

    await prisma.role.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Erro ao excluir função' });
  }
});

/**
 * @route GET /api/admin/permissions/users
 */
router.get('/permissions/users', ...adminAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: { in: ['ADMIN', 'SUPPORT', 'FINANCIAL', 'MARKETING'] } },
          { Admin: { isNot: null } }
        ]
      },
      include: {
        Admin: {
          include: {
            Role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mapped = users.map(u => {
      return {
        id: u.id,
        name: u.name || 'Sem Nome',
        email: u.email,
        role: u.Admin?.Role?.name || u.role,
        status: u.emailVerified ? 'Ativo' : 'Inativo',
        lastAccess: u.updatedAt ? u.updatedAt.toLocaleString('pt-BR') : 'Nunca'
      };
    });

    return res.json(mapped);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Erro ao listar equipe administrativa' });
  }
});

/**
 * @route POST /api/admin/permissions/users
 */
router.post('/permissions/users', ...adminAuth, async (req, res) => {
  try {
    const { name, email, role, status } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'Email e função são obrigatórios' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Gerar senha padrão para usuários criados via painel
    const bcrypt = (await import('bcryptjs')).default;
    const defaultPassword = 'Docton@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const dbRole = await prisma.role.findFirst({
      where: { name: { equals: role, mode: 'insensitive' } }
    });

    // Criar a Person para integridade referencial
    const person = await prisma.person.create({
      data: {
        name: name || email.split('@')[0],
        phone: '',
      }
    });

    let globalRole = 'SUPPORT';
    if (role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'ADMINISTRADOR') {
      globalRole = 'ADMIN';
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role: globalRole,
        emailVerified: status === 'Ativo',
        personId: person.id
      }
    });

    const admin = await prisma.admin.create({
      data: {
        userId: user.id,
        roleId: dbRole ? dbRole.id : null,
        permissions: []
      },
      include: {
        Role: true
      }
    });

    return res.status(201).json({
      id: user.id,
      name: user.name || '',
      email: user.email,
      role: admin.Role?.name || role,
      status: user.emailVerified ? 'Ativo' : 'Inativo',
      lastAccess: user.updatedAt ? user.updatedAt.toLocaleString('pt-BR') : 'Nunca'
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Erro ao criar usuário administrativo' });
  }
});

/**
 * @route PUT /api/admin/permissions/users/:id
 */
router.put('/permissions/users/:id', ...adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { Admin: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (status === 'toggle') {
      const nextStatus = !user.emailVerified;
      const updated = await prisma.user.update({
        where: { id },
        data: { emailVerified: nextStatus },
        include: {
          Admin: {
            include: { Role: true }
          }
        }
      });

      return res.json({
        id: updated.id,
        name: updated.name || '',
        email: updated.email,
        role: updated.Admin?.Role?.name || updated.role,
        status: updated.emailVerified ? 'Ativo' : 'Inativo',
        lastAccess: updated.updatedAt ? updated.updatedAt.toLocaleString('pt-BR') : 'Nunca'
      });
    }

    const dataUpdate: any = {};
    if (name !== undefined) dataUpdate.name = name;
    if (email !== undefined) dataUpdate.email = email;
    if (status !== undefined) dataUpdate.emailVerified = (status === 'Ativo');

    if (role !== undefined) {
      if (role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'ADMINISTRADOR') {
        dataUpdate.role = 'ADMIN';
      } else {
        dataUpdate.role = 'SUPPORT';
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataUpdate,
      include: {
        Admin: {
          include: { Role: true }
        }
      }
    });

    if (role !== undefined) {
      const dbRole = await prisma.role.findFirst({
        where: {
          OR: [
            { id: role },
            { name: { equals: role, mode: 'insensitive' } }
          ]
        }
      });

      if (dbRole) {
        await prisma.admin.upsert({
          where: { userId: id },
          create: {
            userId: id,
            roleId: dbRole.id,
            permissions: []
          },
          update: {
            roleId: dbRole.id
          }
        });
      }
    }

    const finalUser = await prisma.user.findUnique({
      where: { id },
      include: {
        Admin: {
          include: { Role: true }
        }
      }
    });

    if (!finalUser) return res.status(404).json({ error: 'Erro ao buscar dados finais' });

    return res.json({
      id: finalUser.id,
      name: finalUser.name || '',
      email: finalUser.email,
      role: finalUser.Admin?.Role?.name || finalUser.role,
      status: finalUser.emailVerified ? 'Ativo' : 'Inativo',
      lastAccess: finalUser.updatedAt ? finalUser.updatedAt.toLocaleString('pt-BR') : 'Nunca'
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    console.error('Error updating admin user:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário administrativo' });
  }
});

export default router;

