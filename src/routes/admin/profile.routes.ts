// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { supabase } from '../../lib/supabase.js';
import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Apenas imagens são permitidas'));
    }
    cb(null, true);
  }
});

/**
 * @route GET /api/admin/profile
 * Retorna os dados do perfil do admin logado + estatísticas do sistema
 */
router.get('/profile', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { Admin: true }
    });

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const [totalUsers, activePartners] = await Promise.all([
      prisma.user.count(),
      prisma.partner.count({ where: { isApproved: true } }).catch(() => 0)
    ]);

    const profile = {
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.jobTitle || 'Administrador',
      department: user.department || '',
      employeeId: user.Admin?.id ? 'ADM-' + user.Admin.id.slice(0, 6).toUpperCase() : 'ADM-' + user.id.slice(0, 6).toUpperCase(),
      joinDate: user.createdAt,
      lastLogin: new Date(),
      permissions: user.Admin?.permissions || ['Gerenciar Usuários', 'Configurações do Sistema', 'Relatórios Financeiros'],
      avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name || 'admin'}`,
      stats: {
        totalUsers,
        activePartners,
        uptime: '99.9%',
        adminSince: user.createdAt
      }
    };

    return res.json(profile);
  } catch (error) {
    console.error('[Profile GET Error]', error);
    return res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

/**
 * @route PUT /api/admin/profile
 * Atualiza nome, telefone, departamento, cargo e avatar do admin
 */
router.put('/profile', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone, department, jobTitle, avatar } = req.body;

    // Só atualiza campos que foram enviados
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (department !== undefined) data.department = department;
    if (jobTitle !== undefined) data.jobTitle = jobTitle;
    if (avatar !== undefined) data.avatar = avatar;

    const updated = await prisma.user.update({
      where: { id: userId },
      data
    });

    return res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      department: updated.department,
      jobTitle: updated.jobTitle,
      avatar: updated.avatar
    });
  } catch (error) {
    console.error('[Profile PUT Error]', error);
    return res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

/**
 * @route POST /api/admin/profile/avatar
 * Faz upload de avatar no Supabase Storage e salva URL no banco
 */
router.post('/profile/avatar', authenticate, authorize('ADMIN'), upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const userId = req.user.userId;
    const ext = req.file.mimetype.split('/')[1] || 'png';
    const fileName = `avatars/admin-${userId}-${Date.now()}.${ext}`;

    let avatarUrl: string;

    // Tentar upload via Supabase Storage
    if (supabase) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (uploadError) {
        console.error('[Avatar Upload Error]', uploadError);
        // Fallback: gerar URL com DiceBear baseado no userId
        avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}-${Date.now()}`;
      } else {
        // Obter URL pública do arquivo
        const { data: publicData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        avatarUrl = publicData.publicUrl;
      }
    } else {
      // Supabase não disponível — usar DiceBear como fallback
      avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}-${Date.now()}`;
    }

    // Salvar URL no banco independentemente
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl }
    });

    return res.json({ avatar: avatarUrl, success: true });
  } catch (error) {
    console.error('[Profile Avatar Error]', error);
    return res.status(500).json({ error: 'Erro no upload de avatar' });
  }
});

export default router;
