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
        id: string;
        name: string;
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
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        isActive: boolean;
        partnerId: string;
        useCount: number;
    }>;
}
export declare const resourceService: ResourceService;
//# sourceMappingURL=resource.service.d.ts.map