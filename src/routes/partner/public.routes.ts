// @ts-nocheck
import { Router } from 'express';
import prisma from '../../lib/prisma.js';

const router = Router();

// Calcula a distância em KM entre duas coordenadas geográficas (Fórmula de Haversine)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Raio da terra em km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distância em km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// Helper para mapear dados do parceiro para o frontend
export const mapPartnerData = (p: any, userLat?: number, userLng?: number) => {
  let finalPrice = p.consultationPrice || 0;
  // Ajuste para usar PartnerService se vier com esse nome do Prisma e fallback para services
  const activeServices = (p.PartnerService || p.services)?.filter((s: any) => s.isActive) || [];

  const consulService = activeServices.find((s: any) =>
    (s.category && s.category.toLowerCase().includes('consulta')) ||
    (s.name && s.name.toLowerCase().includes('consulta'))
  ) || activeServices[0];

  if (consulService) {
    if (typeof consulService.partnerPayout === 'number' && typeof consulService.doctonFeePercent === 'number') {
      finalPrice = consulService.partnerPayout * (1 + (consulService.doctonFeePercent / 100));
    } else if (typeof consulService.basePrice === 'number') {
      finalPrice = consulService.basePrice;
    } else if (typeof consulService.price === 'number') {
      finalPrice = consulService.price;
    }
  }

  if (!finalPrice || finalPrice === 0) finalPrice = 150.00;
  const specialty = p.specialty || (p.specialties && p.specialties.length > 0 ? p.specialties.join(', ') : 'Clínica Geral');

  let distanceKm = undefined;
  if (userLat != null && userLng != null && p.lat != null && p.lng != null) {
    distanceKm = getDistanceFromLatLonInKm(userLat, userLng, p.lat, p.lng);
  }

  return {
    id: p.id,
    user: {
      name: p.User?.name || p.name || 'Profissional',
      email: p.User?.email || '',
      avatar: p.User?.avatar || undefined
    },
    type: p.type || 'CLINIC',
    specialty,
    crm: p.crm || undefined,
    description: p.description || '',
    address: p.address || '',
    city: p.city || '',
    state: p.state || '',
    zipCode: p.zipCode || '',
    lat: p.lat,
    lng: p.lng,
    distanceKm,
    consultationPrice: finalPrice,
    planType: p.planType || 'basic',
    acceptsOnline: p.acceptsOnline,
    hasOnlineScheduling: p.acceptsOnline,
    isApproved: p.isApproved,
    rating: p.rating || 0,
    totalReviews: p.totalReviews || 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
};

/**
 * @route GET /api/partners
 */
router.get('/', async (req, res) => {
  try {
    const { specialty, isOnline, limit, lat, lng, sort, type } = req.query;
    
    const userLat = lat ? parseFloat(lat as string) : undefined;
    const userLng = lng ? parseFloat(lng as string) : undefined;

    const where: any = { isApproved: true };

    if (type) {
      where.type = type;
    }

    // Filtro por especialidade (case-insensitive)
    if (specialty && specialty !== 'GENERAL') {
      const specialtyMap: Record<string, string[]> = {
        PSYCHOLOGY: ['Psicologia', 'Psicólogo', 'Psiquiatria'],
        DERMATOLOGY: ['Dermatologia', 'Dermatologista'],
        DENTISTRY: ['Odontologia', 'Dentista', 'Odontológico'],
        OPHTHALMOLOGY: ['Oftalmologia', 'Oftalmologista'],
        ORTHOPEDICS: ['Ortopedia', 'Ortopedista', 'Fisioterapia'],
        CARDIOLOGY: ['Cardiologia', 'Cardiologista'],
        GASTROENTEROLOGY: ['Gastroenterologia', 'Gastroenterologista'],
        ENDOCRINOLOGY: ['Endocrinologia', 'Endocrinologista'],
        NEUROLOGY: ['Neurologia', 'Neurologista'],
      };
      const terms = specialtyMap[specialty as string] || [specialty as string];
      where.OR = terms.map(term => ({ specialty: { contains: term, mode: 'insensitive' } }));
    }

    if (isOnline === 'true') {
      where.acceptsOnline = true;
    }

    let partners = await prisma.partner.findMany({
      where,
      select: {
        id: true, name: true, type: true, specialty: true, specialties: true,
        crm: true, description: true, address: true, city: true, state: true,
        zipCode: true, lat: true, lng: true, consultationPrice: true, acceptsOnline: true, planType: true,
        isApproved: true, rating: true, totalReviews: true, createdAt: true, updatedAt: true,
        User: { select: { name: true, email: true, avatar: true } },
        PartnerService: { where: { isActive: true } }
      },
      take: limit ? parseInt(limit as string) : undefined
    });
    
    let mappedPartners = partners.map(p => mapPartnerData(p, userLat, userLng));
    
    if (sort === 'distance' && userLat != null && userLng != null) {
      mappedPartners.sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else {
      mappedPartners.sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return res.json(mappedPartners);
  } catch (error) {
    console.error('Erro /api/partners:', error);
    return res.status(500).json({ error: 'Erro ao listar parceiros' });
  }
});


/**
 * @route GET /api/partners/search
 */
router.get('/search', async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const { lat, lng, sort } = req.query;
  if (!q) return res.json([]);
  
  const userLat = lat ? parseFloat(lat as string) : undefined;
  const userLng = lng ? parseFloat(lng as string) : undefined;

  try {
    const whereClause = {
      OR: [
        { specialty: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { User: { name: { contains: q, mode: 'insensitive' } } }
      ]
    };
    const partners = await prisma.partner.findMany({
      where: whereClause,
      select: {
        id: true, name: true, type: true, specialty: true, specialties: true,
        crm: true, description: true, address: true, city: true, state: true,
        zipCode: true, lat: true, lng: true, consultationPrice: true, acceptsOnline: true, planType: true,
        isApproved: true, rating: true, totalReviews: true, createdAt: true, updatedAt: true,
        User: { select: { name: true, email: true, avatar: true } },
        PartnerService: { where: { isActive: true } }
      }
    });
    
    let mappedPartners = partners.map(p => mapPartnerData(p, userLat, userLng));
    
    if (sort === 'distance' && userLat != null && userLng != null) {
      mappedPartners.sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return res.json(mappedPartners);
  } catch (error) {
    return res.status(500).json({ error: 'Erro na busca' });
  }
});

/**
 * @route GET /api/partners/public-profile
 */
router.get('/public-profile', async (req, res) => {
  try {
    const { partnerId } = req.query as any;
    if (!partnerId) return res.status(400).json({ error: 'ID não fornecido' });

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        User: { select: { name: true, avatar: true, email: true } },
        TeamMember: true,
        PartnerService: { where: { isActive: true }, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const totalPatients = await prisma.appointment.count({ where: { partnerId: partner.id } });
    return res.json({
      ...mapPartnerData({
        ...partner,
        services: partner.services
      }),
      professionals: partner.TeamMember,
      totalPatients
    });
  } catch (error) {
    console.error('Erro /api/partners/public-profile:', error);
    return res.status(500).json({ error: 'Erro ao buscar perfil público' });
  }
});

export default router;
