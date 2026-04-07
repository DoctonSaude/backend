import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { telemedicineService } from '../services/telemedicine.service';
import prisma from '../lib/prisma';

const router = Router();

/**
 * Retorna URL e Token para entrar na teleconsulta
 */
router.get('/join/:appointmentId', authenticate, async (req: any, res) => {
  const { appointmentId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // 1. Verificar se o agendamento existe e o usuário participa dele
    const appointment = await (prisma as any).appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        partner: { include: { user: true } }
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    if (!appointment.isOnline) {
      return res.status(400).json({ error: 'Este agendamento não é online' });
    }

    const isPatient = appointment.patient.userId === userId;
    const isPartner = appointment.partner?.userId === userId;

    if (!isPatient && !isPartner && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Você não tem permissão para acessar esta consulta' });
    }

    // 2. Garantir que a sala existe no Daily
    let session = await telemedicineService.getSessionByAppointment(appointmentId);
    if (!session) {
      session = await telemedicineService.createRoom(appointmentId);
    }

    // 3. Gerar token de acesso
    const userName = isPatient ? appointment.patient.user.name : appointment.partner?.user?.name || 'Profissional';
    const isOwner = isPartner; // O parceiro (médico) é o dono da sala para gravar

    const token = await telemedicineService.generateToken(
      session.roomName,
      userId,
      userName,
      isOwner
    );

    return res.json({
      roomUrl: session.roomUrl,
      token,
      roomName: session.roomName
    });

  } catch (error: any) {
    console.error('Erro ao ingressar na telemedicina:', error);
    return res.status(500).json({ error: 'Erro interno ao iniciar teleconsulta' });
  }
});

router.get('/connectivity-test', async (_req, res) => {
  return res.json({ ok: true, timestamp: new Date().toISOString() });
});

export default router;
