import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();

/**
 * @route GET /api/partners/rooms
 */
router.get('/rooms', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const rooms = await prisma.room.findMany({
      where: { partnerId: partner.id, isActive: true }
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar salas' });
  }
});

/**
 * @route GET /api/partners/equipment
 */
router.get('/equipment', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const equipment = await prisma.equipment.findMany({
      where: { partnerId: partner.id, isActive: true }
    });
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar equipamentos' });
  }
});

/**
 * @route GET /api/partners/patients
 */
router.get('/patients', authenticate, authorize('PARTNER'), async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const appointments = await prisma.appointment.findMany({
      where: { partnerId: partner.id },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true, phone: true, avatar: true } }
          }
        }
      },
      orderBy: { dateTime: 'desc' }
    });

    const patientMap = new Map();
    appointments.forEach(app => {
      if (!app.patient) return;
      if (!patientMap.has(app.patientId)) {
        patientMap.set(app.patientId, {
          id: app.patient.id,
          name: app.patient.user.name,
          email: app.patient.user.email,
          phone: app.patient.user.phone,
          avatar: app.patient.user.avatar,
          lastAppointment: app.dateTime,
          totalAppointments: 1
        });
      } else {
        const p = patientMap.get(app.patientId);
        p.totalAppointments++;
      }
    });

    res.json(Array.from(patientMap.values()));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

export default router;
