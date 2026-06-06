// @ts-nocheck
import request from 'supertest';
import app from '../src/server.js';
import prisma from '../src/lib/prisma.js';
import { generateTestToken } from './helpers/e2e-setup.js';

// Mock do prisma para não deletar dados reais se rodar em dev
jest.mock('../src/lib/prisma.js', () => ({
  __esModule: true,
  default: {
    partner: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    patient: {
      create: jest.fn(),
    },
    appointment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    partnerFinancialData: {
      findUnique: jest.fn(),
    },
    equipment: {
      update: jest.fn(),
    },
    validationCodeLog: {
      create: jest.fn(),
    }
  },
}));

describe('Fluxo E2E: Agendamento e Conclusão', () => {
  const partnerUserId = 'partner-123';
  const partnerId = 'p-123';
  const patientId = 'patient-456';
  const appointmentId = 'appt-789';
  const token = generateTestToken(partnerUserId, 'PARTNER');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar um agendamento com sucesso via API', async () => {
    // Setup Mocks
    prisma.user.findUnique.mockResolvedValue({ id: partnerUserId, role: 'PARTNER' });
    prisma.partner.findFirst.mockResolvedValue({ id: partnerId, name: 'Dr. Teste' });
    prisma.user.findFirst.mockResolvedValue({ id: 'u-456', patient: { id: patientId } });
    prisma.appointment.create.mockResolvedValue({
      id: appointmentId,
      status: 'SCHEDULED',
      dateTime: new Date().toISOString(),
      patientId
    });

    const response = await request(app)
      .post('/api/partners/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientName: 'Paciente Teste',
        dateTime: new Date().toISOString(),
        duration: 60,
        isOnline: true
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(appointmentId);
    expect(prisma.appointment.create).toHaveBeenCalled();
  });

  it('deve validar o código e concluir a consulta com repasse financeiro', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: partnerUserId, role: 'PARTNER' });
    prisma.partner.findFirst.mockResolvedValue({ id: partnerId, name: 'Dr. Teste' });
    
    // Simula agendamento encontrado
    prisma.appointment.findFirst.mockResolvedValue({
      id: appointmentId,
      status: 'SCHEDULED',
      patientId,
      patient: { userId: 'patient-u-id', id: patientId, user: { name: 'Paciente Teste' } }
    });
    
    prisma.appointment.update.mockResolvedValue({ id: appointmentId, status: 'COMPLETED' });

    const response = await request(app)
      .post('/api/partners/appointments/validate-code')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: appointmentId.slice(-4), // Código geralmente é o final do ID
        appointmentId: appointmentId
      });

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(true);
    // Verifica se a atualização de status ocorreu
    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: appointmentId },
      data: { status: 'COMPLETED' }
    });
  });
});
