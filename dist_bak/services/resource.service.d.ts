export declare class ResourceService {
    /**
     * Verifica se uma sala está disponível para um determinado horário
     */
    isRoomAvailable(roomId: string, dateTime: Date, durationMinutes: number): Promise<boolean>;
    /**
     * Verifica se um equipamento está disponível
     */
    isEquipmentAvailable(equipmentId: string, dateTime: Date, durationMinutes: number): Promise<boolean>;
    /**
     * Cria uma nova sala
     */
    createRoom(params: {
        partnerId: string;
        name: string;
        capacity?: number;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        partnerId: string;
        capacity: number;
    }>;
    /**
     * Cria um novo equipamento
     */
    createEquipment(params: {
        partnerId: string;
        name: string;
    }): Promise<{
        status: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        partnerId: string;
    }>;
}
export declare const resourceService: ResourceService;
//# sourceMappingURL=resource.service.d.ts.map