import prisma from '../lib/prisma.js';
import { resourceService } from './resource.service.js';
import { paymentService } from './payment.service.js';

export class AppointmentService {
    /**
     * Cria um agendamento com validação 3D (Profissional, Sala, Equipamento)
     * e gera necessidade de micro-depósito.
     */
    async createAppointment(params: {
        patientId: string,
        partnerId: string,
        dateTime: Date,
        duration: number,
        roomId?: string,
        equipmentId?: string,
        requireDeposit?: boolean,
        depositAmount?: number
    }) {
        // 1. Validação de Sala (Se fornecida)
        if (params.roomId) {
            const roomAvail = await resourceService.isRoomAvailable(params.roomId, params.dateTime, params.duration);
            if (!roomAvail)
                throw new Error('A sala selecionada não está disponível para este horário.');
        }

        // 2. Validação de Equipamento (Se fornecido)
        if (params.equipmentId) {
            const equipAvail = await resourceService.isEquipmentAvailable(params.equipmentId, params.dateTime, params.duration);
            if (!equipAvail)
                throw new Error('O equipamento selecionado não está disponível ou está em manutenção.');
        }

        // 3. Validação Básica de Profissional (Simples check de colisão)
        const professionalOverlap = await prisma.appointment.findFirst({
            where: {
                partnerId: params.partnerId,
                status: { notIn: ['CANCELLED', 'NOSHOW'] },
                dateTime: params.dateTime // Simplified check
            }
        });

        if (professionalOverlap)
            throw new Error('O profissional já possui um agendamento neste horário.');

        // 4. Criar o agendamento (Pendente de pagamento se necessário)
        const appointment = await prisma.appointment.create({
            data: {
                patientId: params.patientId,
                partnerId: params.partnerId,
                dateTime: params.dateTime,
                duration: params.duration,
                roomId: params.roomId,
                equipmentId: params.equipmentId,
                status: params.requireDeposit ? 'PENDING_PAYMENT' : 'SCHEDULED'
            }
        });

        // 5. Gerar Depósito Pix se solicitado
        let pixDeposit = null;
        if (params.requireDeposit && params.depositAmount) {
            pixDeposit = await paymentService.generatePixDeposit(appointment.id, params.depositAmount);
        }

        return {
            appointment,
            pixDeposit
        };
    }

    /**
     * Reagendamento inteligente (Prepara terreno para IA)
     */
    async reschedule(appointmentId: string, newDateTime: Date) {
        const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
        if (!appointment)
            throw new Error('Agendamento não encontrado');

        // Validações similares às do createAppointment...
        // ...

        return await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                dateTime: newDateTime,
                status: 'SCHEDULED' // Reseta status
            }
        });
    }
}

export const appointmentService = new AppointmentService();
