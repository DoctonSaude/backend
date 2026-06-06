import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { telemedicineService } from '../services/telemedicine.service';
import prisma from '../lib/prisma';
import { SocketService } from '../lib/socket.js';
import { logger } from '../lib/logger.js';
import { v4 as uuidv4 } from 'uuid';

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

    const isPatient = appointment.patient?.userId === userId;
    const isPartner = appointment.partner?.userId === userId;

    if (!isPatient && !isPartner && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Você não tem permissão para acessar esta consulta' });
    }

    // 2. Garantir que a sala existe no Daily
    let session = await telemedicineService.getSessionByAppointment(appointmentId);
    if (!session) {
      session = await telemedicineService.createRoom(appointmentId);
    }

    // 4. Se o usuário for um PARCEIRO e a chamada não tiver parceiro ainda, assumir a chamada
    if (userRole === 'PARTNER' && !appointment.partnerId) {
      // Buscar o ID do parceiro vinculado ao usuário
      const partner = await prisma.partner.findUnique({
        where: { userId }
      });

      if (partner) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { 
            partnerId: partner.id,
            status: 'CONFIRMED'
          }
        });
        logger.info(`Parceiro ${partner.id} assumiu a teleconsulta ${appointmentId}`);
      }
    }

    // 3. Gerar token de acesso
    const isPatientParticipant = appointment.patient?.userId === userId;
    const isPartnerParticipant = appointment.partner?.userId === userId || (userRole === 'PARTNER');
    
    const userName = isPatientParticipant ? appointment.patient.user.name : (appointment.partner?.user?.name || 'Profissional');
    const isOwner = userRole === 'PARTNER' || userRole === 'ADMIN'; 

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
    logger.error('Erro ao ingressar na telemedicina:', error);
    return res.status(500).json({ error: 'Erro interno ao iniciar teleconsulta', details: error.message });
  }
});

/**
 * Solicita uma teleconsulta instantânea (Fila de Espera)
 */
router.post('/request-instant', authenticate, async (req: any, res) => {
  const userId = req.user.userId || req.user.id;
  const { symptoms, urgency } = req.body;

  try {
    // 1. Garantir que o paciente existe
    let patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      // Buscar personId do usuário
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      patient = await prisma.patient.create({
        data: {
          id: uuidv4(),
          userId,
          personId: user?.personId || null,
          archetype: 'GENERAL',
          updatedAt: new Date()
        }
      });
    }

    // 2. Criar o agendamento na fila (sem partnerId inicialmente)
    const appointment = await prisma.appointment.create({
      data: {
        id: uuidv4(),
        patientId: patient.id,
        status: 'WAITING',
        isOnline: true,
        notes: symptoms || 'Solicitação via Triagem IA',
        updatedAt: new Date(),
        dateTime: new Date()
      },
      include: {
        // @ts-ignore - TODO: Schema drift fix
        patient: {
          include: { user: { select: { name: true, avatar: true } } }
        }
      }
    });

    // 3. Notificar parceiros via Socket
    // @ts-ignore - TODO: Schema drift fix
    if (appointment.patient?.user) {
      SocketService.sendToPartners('telemedicine_requested', {
        appointmentId: appointment.id,
        // @ts-ignore - TODO: Schema drift fix
        patientName: appointment.patient.user.name,
        // @ts-ignore - TODO: Schema drift fix
        patientAvatar: appointment.patient.user.avatar,
        symptoms: symptoms,
        timestamp: new Date()
      });
      // @ts-ignore - TODO: Schema drift fix
      logger.info(`Nova solicitação de telemedicina: ${appointment.id} para o paciente ${appointment.patient.user.name}`);
    }

    return res.json({ 
      success: true, 
      appointmentId: appointment.id 
    });

  } catch (error: any) {
    logger.error('Erro ao solicitar teleconsulta instantânea:', error);
    return res.status(500).json({ error: 'Falha ao processar solicitação', details: error.message });
  }
});

router.get('/connectivity-test', async (_req, res) => {
  return res.json({ ok: true, timestamp: new Date().toISOString() });
});

export default router;
