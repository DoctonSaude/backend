// @ts-nocheck
import prisma from '../lib/prisma.js';

export class ResourceService {
    /**
     * Verifica se uma sala está disponível para um determinado horário
     */
    async isRoomAvailable(roomId: string, dateTime: Date, durationMinutes: number) {
        const endDateTime = new Date(dateTime.getTime() + durationMinutes * 60000);

        // Nota: A lógica de sobreposição completa exige considerar a duração de cada agendamento existente.
        const dayStart = new Date(dateTime);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dateTime);
        dayEnd.setHours(23, 59, 59, 999);

        const dayAppointments = await prisma.appointment.findMany({
            where: {
                roomId,
                status: { notIn: ['CANCELLED', 'NOSHOW'] },
                dateTime: { gte: dayStart, lte: dayEnd }
            }
        });

        for (const appt of dayAppointments) {
            if (!appt.dateTime || !appt.duration)
                continue;
            const apptStart = new Date(appt.dateTime);
            const apptEnd = new Date(apptStart.getTime() + appt.duration * 60000);
            if (dateTime < apptEnd && endDateTime > apptStart) {
                return false; // Conflito detectado
            }
        }
        return true;
    }

    /**
     * Verifica se um equipamento está disponível
     */
    async isEquipmentAvailable(equipmentId: string, dateTime: Date, durationMinutes: number) {
        const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
        if (!equipment || equipment.status !== 'AVAILABLE' || !equipment.isActive)
            return false;

        const endDateTime = new Date(dateTime.getTime() + durationMinutes * 60000);
        const dayStart = new Date(dateTime);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dateTime);
        dayEnd.setHours(23, 59, 59, 999);

        const dayAppointments = await prisma.appointment.findMany({
            where: {
                equipmentId,
                status: { notIn: ['CANCELLED', 'NOSHOW'] },
                dateTime: { gte: dayStart, lte: dayEnd }
            }
        });

        for (const appt of dayAppointments) {
            if (!appt.dateTime || !appt.duration)
                continue;
            const apptStart = new Date(appt.dateTime);
            const apptEnd = new Date(apptStart.getTime() + appt.duration * 60000);
            if (dateTime < apptEnd && endDateTime > apptStart) {
                return false; // Conflito detectado
            }
        }
        return true;
    }

    /**
     * Cria uma nova sala
     */
    async createRoom(params: { partnerId: string, name: string, capacity?: number }) {
        return await prisma.room.create({
            data: {
                partnerId: params.partnerId,
                name: params.name,
                capacity: params.capacity || 1
            }
        });
    }

    /**
     * Cria um novo equipamento
     */
    async createEquipment(params: { partnerId: string, name: string }) {
        return await prisma.equipment.create({
            data: {
                partnerId: params.partnerId,
                name: params.name
            }
        });
    }
}

export const resourceService = new ResourceService();
