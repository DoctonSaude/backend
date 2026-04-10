import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import multer from 'multer';
import { storageService } from '../../services/storage.service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * @route POST /api/partners/public-profile/photo
 */
router.post('/public-profile/photo', authenticate, authorize('PARTNER'), upload.single('photo'), async (req: any, res) => {
  try {
    res.setHeader('X-Backend-Version', '2026.04.09.v6-modular');
    const userId = req.user.userId || req.user.id;
    
    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let mimeType = '';

    if (req.file) {
      fileBuffer = req.file.buffer;
      fileName = req.file.originalname;
      mimeType = req.file.mimetype;
    } else if (req.body.photo && typeof req.body.photo === 'string' && req.body.photo.includes('base64')) {
      const base64Data = req.body.photo.split(';base64,').pop()!;
      fileBuffer = Buffer.from(base64Data, 'base64');
      fileName = `profile_${userId}_${Date.now()}.png`;
      mimeType = 'image/png';
    }

    if (!fileBuffer) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const publicUrl = await storageService.uploadAvatar(fileBuffer, fileName, mimeType);

    await Promise.allSettled([
      prisma.user.update({ where: { id: userId }, data: { avatar: publicUrl } }),
      prisma.partner.upsert({
        where: { userId },
        update: { photo: publicUrl },
        create: { userId, photo: publicUrl, tenantId: req.user.tenantId || null }
      })
    ]);

    return res.json({ photo: publicUrl, success: true });
  } catch (error: any) {
    console.error('[PhotoUpload Modular] Error:', error);
    return res.status(500).json({ error: 'Erro no upload', details: error.message });
  }
});

/**
 * @route GET /api/partners/profile
 */
router.get('/profile', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({
      where: { userId },
      include: { user: true }
    });

    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    // FASE 6 (Modular): Resposta completa para evitar erros no frontend
    res.json({
      id: partner.id,
      user: partner.user ? {
        id: partner.user.id,
        name: partner.user.name || '',
        email: partner.user.email || '',
        avatar: partner.user.avatar || '',
      } : { id: '', name: '', email: '', avatar: '' },
      name: partner.name || partner.user?.name || '',
      specialty: partner.specialty || '',
      specialties: (partner as any).specialties || [],
      crm: partner.crm || '',
      cnpj: (partner as any).cnpj || '',
      phone: (partner as any).phone || '',
      description: (partner as any).description || (partner as any).about || '',
      address: (partner as any).address || '',
      city: (partner as any).city || '',
      state: (partner as any).state || '',
      zipCode: (partner as any).zipCode || '',
      consultationPrice: partner.consultationPrice || 0,
      experienceYears: (partner as any).experienceYears || 0,
      foundationYear: (partner as any).foundationYear || 0,
      education: (partner as any).education || [],
      workingHours: (partner as any).workingHours || [],
      languages: (partner as any).languages || [],
      facilities: (partner as any).facilities || [],
      insurances: (partner as any).insurances || [],
      rating: partner.rating || 5.0,
      totalReviews: partner.totalReviews || 0,
      photo: partner.photo || partner.user?.avatar || '',
    });
  } catch (error) {
    console.error('[ProfileRoutes] Error:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

/**
 * @route GET /api/partners/my-public-profile
 * @desc Endpoint unificado para a página de Perfil do parceiro
 */
router.get('/my-public-profile', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        team: true,
        services: { where: { isActive: true } }
      }
    });

    if (!partner) {
      return res.status(404).json({ error: 'Perfil de parceiro não localizado' });
    }

    // FASE 6 (Modular): Resposta blindada para evitar erros de "null reading avatar"
    const userFallback = partner.user || { id: '', name: '', email: '', avatar: '' };
    
    return res.json({
      id: partner.id,
      userId: userId,
      user: {
        id: userFallback.id,
        name: userFallback.name || partner.name || '',
        email: userFallback.email || '',
        avatar: userFallback.avatar || '',
      },
      name: partner.name || userFallback.name || '',
      specialty: partner.specialty || '',
      specialties: (partner as any).specialties || [],
      photo: userFallback.avatar || partner.photo || '',
      description: (partner as any).description || (partner as any).about || '',
      city: (partner as any).city || '',
      state: (partner as any).state || '',
      crm: partner.crm || '',
      rating: partner.rating || 5.0,
      totalReviews: partner.totalReviews || 0,
      professionals: (partner as any).team || [],
      services: (partner as any).services || [],
      education: (partner as any).education || [],
      workingHours: (partner as any).workingHours || [],
      languages: (partner as any).languages || [],
      facilities: (partner as any).facilities || [],
      insurances: (partner as any).insurances || []
    });
  } catch (error) {
    console.error('[ProfileRoutes/Public] Error:', error);
    res.status(500).json({ error: 'Erro ao processar perfil público modular' });
  }
});

export default router;
