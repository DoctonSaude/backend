"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceService = exports.ResourceService = void 0;
// @ts-nocheck
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
class ResourceService {
    /**
     * Verifica se uma sala está disponível para um determinado horário
     */
    async isRoomAvailable(roomId, dateTime, durationMinutes) {
        const endDateTime = new Date(dateTime.getTime() + durationMinutes * 60000);
        // Nota: A lógica de sobreposição completa exige considerar a duração de cada agendamento existente.
        const dayStart = new Date(dateTime);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dateTime);
        dayEnd.setHours(23, 59, 59, 999);
        const dayAppointments = await prisma_js_1.default.appointment.findMany({
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
    async isEquipmentAvailable(equipmentId, dateTime, durationMinutes) {
        const equipment = await prisma_js_1.default.equipment.findUnique({ where: { id: equipmentId } });
        if (!equipment || equipment.status !== 'AVAILABLE' || !equipment.isActive)
            return false;
        const endDateTime = new Date(dateTime.getTime() + durationMinutes * 60000);
        const dayStart = new Date(dateTime);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dateTime);
        dayEnd.setHours(23, 59, 59, 999);
        const dayAppointments = await prisma_js_1.default.appointment.findMany({
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
    async createRoom(params) {
        return await prisma_js_1.default.room.create({
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
    async createEquipment(params) {
        return await prisma_js_1.default.equipment.create({
            data: {
                partnerId: params.partnerId,
                name: params.name
            }
        });
    }
}
exports.ResourceService = ResourceService;
exports.resourceService = new ResourceService();
//# sourceMappingURL=resource.service.js.map