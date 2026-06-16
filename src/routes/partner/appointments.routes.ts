// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { storageService } from '../../services/storage.service.js';
import { financeService } from '../../services/finance.service.js';
import { SocketService } from '../../lib/socket.js';
import inAppNotificationService from '../../services/inAppNotification.service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * @route GET /api/partners/appointments
 */
router.get('/appointments', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const { q, status, type, startDate, endDate } = req.query;

    const partner = await prisma.partner.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const where: any = { partnerId: partner.id };

    if (q) {
      const term = String(q).toLowerCase();
      where.Patient = { User: { name: { contains: term, mode: 'insensitive' } } };
    }

    if (status && status !== 'all') where.status = String(status);
    if (type && type !== 'all') where.isOnline = type === 'online';

    // Fix: Melhorar validação de datas para evitar 500 com strings vazias
    if ((startDate && startDate !== '') || (endDate && endDate !== '')) {
      where.dateTime = {};
      if (startDate && startDate !== '') {
        const start = new Date(String(startDate));
        if (!isNaN(start.getTime())) {
          where.dateTime.gte = start;
        }
      }
      if (endDate && endDate !== '') {
        const end = new Date(String(endDate));
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          where.dateTime.lte = end;
        }
      }
      
      // Se o objeto ficou vazio por datas inválidas, removemos
      if (Object.keys(where.dateTime).length === 0) {
        delete where.dateTime;
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: { patient: { include: { User: { select: { name: true, email: true, avatar: true } } } },
        TeamMember: true
      },
      orderBy: { dateTime: 'desc' }
    });

    return res.json(appointments.map(a => ({
      ...a,
      patient: a.Patient,
      professional: a.TeamMember
    })));
  } catch (error) {
    console.error('Erro ao listar consultas:', error);
    return res.status(500).json({ error: 'Erro ao listar consultas', details: error.message });
  }
});

/**
 * @route GET /api/partners/appointments/:id
 */
router.get('/appointments/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId || (req as any).user.id;

    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const appointment = await prisma.appointment.findFirst({
      where: { id, partnerId: partner.id },
      include: { patient: { include: { User: { select: { name: true, email: true, avatar: true } } } } }
    });

    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });
    
    return res.json({
      ...appointment,
      patient: appointment.Patient
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar agendamento', details: error.message });
  }
});

/**
 * @route POST /api/partners/appointments
 */
router.post('/appointments', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const { patientName, patientId, dateTime, duration, isOnline, notes, professionalId, serviceId, roomId, equipmentId } = req.body;

    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    let finalPatientId = patientId;

    if (!finalPatientId && patientName) {
      const existingUser = await prisma.user.findFirst({
        where: { name: { contains: patientName, mode: 'insensitive' }, role: 'PATIENT' },
        include: { patient: true }
      });

      if (existingUser?.Patient) {
        finalPatientId = existingUser.Patient.id;
      } else {
        const newUserId = uuidv4();
        const newUser = await prisma.user.create({
          data: {
            id: newUserId,
            name: patientName,
            email: `temp_${newUserId}@docton.com`,
            password: uuidv4(),
            role: 'PATIENT',
            updatedAt: new Date()
          }
        });

        const newPatient = await prisma.patient.create({
          data: {
            userId: newUser.id,
            cpf: `000.${Math.floor(Math.random() * 999)}.${Math.floor(Math.random() * 999)}-${Math.floor(Math.random() * 99)}`,
            birthDate: new Date('2000-01-01'),
            updatedAt: new Date()
          }
        });
        finalPatientId = newPatient.id;
      }
    }

    if (!finalPatientId) return res.status(400).json({ error: 'Paciente é obrigatório' });

    const appointment = await prisma.appointment.create({
      data: {
        partnerId: partner.id,
        patientId: finalPatientId,
        dateTime: new Date(dateTime),
        duration: duration || 30,
        isOnline: !!isOnline,
        notes: notes || '',
        status: 'SCHEDULED',
        professionalId: professionalId || null,
        roomId: roomId || null,
        equipmentId: equipmentId || null,
        updatedAt: new Date()
      },
      include: { patient: { include: { User: { select: { name: true, email: true, avatar: true } } } },
        TeamMember: true
      }
    });

    return res.status(201).json({
      ...appointment,
      patient: appointment.Patient,
      professional: appointment.TeamMember
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return res.status(500).json({ error: 'Erro ao criar agendamento', details: error.message });
  }
});

/**
 * @route PUT /api/partners/appointments/:id
 */
router.put('/appointments/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId || (req as any).user.id;
    const { dateTime, duration, isOnline, notes, status, professionalId, serviceId, roomId, equipmentId } = req.body;

    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const appointment = await prisma.appointment.update({
      where: { id, partnerId: partner.id },
      data: {
        dateTime: dateTime ? new Date(dateTime) : undefined,
        duration: duration ? Number(duration) : undefined,
        isOnline: isOnline !== undefined ? !!isOnline : undefined,
        notes: notes !== undefined ? notes : undefined,
        status: status || undefined,
        professionalId: professionalId !== undefined ? (professionalId || null) : undefined,
        serviceId: serviceId !== undefined ? (serviceId || null) : undefined,
        roomId: roomId !== undefined ? (roomId || null) : undefined,
        equipmentId: equipmentId !== undefined ? (equipmentId || null) : undefined
      },
      include: { patient: { include: { User: { select: { name: true, email: true, avatar: true } } } },
        TeamMember: true
      }
    });

    if (status === 'COMPLETED') {
      if (appointment.equipmentId) {
        try {
          await (prisma as any).equipment.update({
            where: { id: appointment.equipmentId },
            data: { useCount: { increment: 1 } }
          });
        } catch (e) { console.error('Erro Logística:', e); }
      }
      try {
        await financeService.processAppointmentCompletion(appointment.id);
      } catch (e) { console.error('Erro Financeiro:', e); }
    }

    SocketService.sendToUser(appointment.patientId, 'timelineUpdate', { type: 'appointment', id: appointment.id, status: appointment.status });
    
    return res.json({
      ...appointment,
      patient: appointment.Patient,
      professional: appointment.TeamMember
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar agendamento', details: error.message });
  }
});

/**
 * @route DELETE /api/partners/appointments/:id
 */
router.delete('/appointments/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    await prisma.appointment.delete({ where: { id, partnerId: partner.id } });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir agendamento' });
  }
});

/**
 * @route POST /api/partners/appointments/validate-code
 */
router.post('/appointments/validate-code', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { code, appointmentId } = req.body;
    const userId = (req as any).user.userId || (req as any).user.id;

    if (!code) return res.status(400).json({ error: 'Código é obrigatório' });

    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true, name: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const searchCode = code.trim().toLowerCase();
    let appointment = null;

    if (appointmentId) {
      appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, partnerId: partner.id },
        include: { patient: { include: { User: { select: { name: true } } } } }
      });
      if (appointment) {
        if (appointment.status === 'COMPLETED') return res.json({ valid: false, message: 'Já validado.' });
        const idLower = appointment.id.toLowerCase();
        if (!idLower.endsWith(searchCode) && idLower !== searchCode) appointment = null;
      }
    }

    if (!appointment) {
      appointment = await prisma.appointment.findFirst({
        where: {
          partnerId: partner.id,
          status: { in: ['SCHEDULED', 'CONFIRMED', 'active'] },
          id: { endsWith: searchCode, mode: 'insensitive' }
        },
        include: { patient: { include: { User: { select: { name: true } } } } }
      });
    }

    if (appointment) {
      await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'COMPLETED' } });

      if (appointment.equipmentId) {
        try { await (prisma as any).equipment.update({ where: { id: appointment.equipmentId }, data: { useCount: { increment: 1 } } }); } catch (e) {}
      }
      
      try { await financeService.processAppointmentCompletion(appointment.id); } catch (e) {}

      SocketService.sendToUser(appointment.Patient.userId, 'timelineUpdate', { type: 'appointment', id: appointment.id, status: 'COMPLETED' });
      
      try {
        await inAppNotificationService.createNotification({
          userId: appointment.Patient.userId,
          type: 'SYSTEM',
          title: 'Consulta Concluída',
          message: `Sua consulta com ${partner.name} foi concluída.`,
          priority: 'medium',
          link: '/patient/agendamentos'
        });
      } catch (e) {}

      try {
        await prisma.validationCodeLog.create({
          data: { 
            code, 
            status: 'valid', 
            partnerId: partner.id, 
            patientId: appointment.patientId, 
            appointmentId: appointment.id, 
            partnerName: partner.name, 
            patientName: appointment.Patient.User.name 
          }
        });
      } catch (e) { console.error('Erro ao registrar log de validação:', e); }

      return res.json({ valid: true, patientName: appointment.Patient.User.name, appointmentId: appointment.id });
    }

    return res.json({ valid: false, message: 'Código inválido ou já concluído.' });
  } catch (error) {
    console.error('Erro Validação:', error);
    return res.status(500).json({ error: 'Erro ao validar código', details: error.message });
  }
});

/**
 * @route GET /api/partners/medical-records/:appointmentId
 */
router.get('/medical-records/:appointmentId', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findFirst({ where: { userId }, select: { id: true } });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const record = await prisma.medicalRecord.findUnique({
      where: { appointmentId },
      include: { patient: { include: { User: { select: { name: true, avatar: true } } } }, 
        Appointment: true 
      }
    });

    if (!record) return res.status(404).json({ error: 'Prontuário não encontrado' });
    if (record.partnerId !== partner.id) return res.status(403).json({ error: 'Acesso negado' });

    return res.json({
      ...record,
      patient: record.Patient,
      appointment: record.Appointment
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar prontuário', details: error.message });
  }
});

/**
 * @route PUT /api/partners/medical-records/:id
 */
router.put('/medical-records/:id', authenticate, authorize('PARTNER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, symptoms, treatment, observations, attachments } = req.body;
    const userId = (req as any).user.userId || (req as any).user.id;
    const partner = await prisma.partner.findFirst({
      where: { userId },
      select: { id: true, specialty: true, User: { select: { name: true } } },
    });
    if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' });

    const updateData: Record<string, unknown> = {
      diagnosis,
      treatment,
      observations,
      attachments,
      updatedAt: new Date(),
    };
    if (Array.isArray(symptoms)) {
      updateData.symptomsArray = symptoms;
      updateData.symptoms = symptoms.join(', ');
    } else if (symptoms != null) {
      updateData.symptoms = String(symptoms);
    }

    const record = await prisma.medicalRecord.update({
      where: { id, partnerId: partner.id },
      data: updateData,
    });

    const patient = await prisma.patient.findUnique({
      where: { id: record.patientId },
      select: { userId: true },
    });

    // Sincroniza anamnese clínica (somente o profissional registra; paciente só visualiza)
    const symptomsList = Array.isArray(symptoms)
      ? symptoms
      : symptoms
        ? String(symptoms).split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    const chiefComplaint =
      symptomsList[0] ||
      (diagnosis ? String(diagnosis).slice(0, 200) : 'Consulta');
    const currentIllness =
      observations ||
      diagnosis ||
      'Registro gerado a partir do prontuário da consulta.';
    const doctorName = partner.User?.name || 'Profissional';
    const specialty = partner.specialty || 'Medicina Geral';

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const existingAnamnesis = await prisma.anamnesis.findFirst({
      where: {
        patientId: record.patientId,
        doctorName,
        date: { gte: startOfDay },
      },
      orderBy: { createdAt: 'desc' },
    });

    const anamnesisPayload = {
      chiefComplaint: String(chiefComplaint).slice(0, 500),
      currentIllness: String(currentIllness).slice(0, 5000),
      assessment: diagnosis ? String(diagnosis) : null,
      plan: treatment ? String(treatment) : null,
      doctorName,
      updatedAt: new Date(),
    };

    const anamnesis = existingAnamnesis
      ? await prisma.anamnesis.update({
          where: { id: existingAnamnesis.id },
          data: anamnesisPayload,
        })
      : await prisma.anamnesis.create({
          data: {
            ...anamnesisPayload,
            patientId: record.patientId,
            date: new Date(),
          },
        });

    const historyDescription =
      diagnosis ||
      observations ||
      (symptomsList.length ? `Sintomas: ${symptomsList.join(', ')}` : 'Consulta registrada');
    const attachmentList = Array.isArray(attachments)
      ? attachments
      : typeof attachments === 'string' && attachments
        ? [attachments]
        : [];

    const existingHistory = await prisma.medicalHistory.findFirst({
      where: {
        patientId: record.patientId,
        doctor: doctorName,
        date: { gte: startOfDay },
      },
      orderBy: { createdAt: 'desc' },
    });

    const historyPayload = {
      type: 'Consulta',
      doctor: doctorName,
      specialty,
      description: String(historyDescription).slice(0, 2000),
      diagnosis: diagnosis ? String(diagnosis) : null,
      treatment: treatment ? String(treatment) : null,
      status: 'Concluído',
      attachments: attachmentList,
      updatedAt: new Date(),
    };

    const medicalHistory = existingHistory
      ? await prisma.medicalHistory.update({
          where: { id: existingHistory.id },
          data: historyPayload,
        })
      : await prisma.medicalHistory.create({
          data: {
            ...historyPayload,
            patientId: record.patientId,
            date: new Date(),
          },
        });

    if (patient?.userId) {
      SocketService.sendToUser(patient.userId, 'medicalHistoryUpdate', medicalHistory);
      SocketService.sendToUser(patient.userId, 'anamnesisUpdate', anamnesis);
      SocketService.sendToUser(patient.userId, 'timelineUpdate', {
        type: 'medicalHistory',
        id: medicalHistory.id,
      });
    }

    return res.json({ ...record, anamnesis, medicalHistory });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar prontuário', details: error.message });
  }
});

export default router;
