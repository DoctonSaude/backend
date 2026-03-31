import { PharmacyData } from '../types/common.js';
export declare const PharmacyCrud: {
    /**
     * Cria uma nova farmácia vinculada a um tenant
     */
    create(data: PharmacyData): Promise<{
        id: string;
        name: string;
        tenantId: string | null;
        address: string | null;
    }>;
    /**
     * Lista farmácias de um inquilino
     */
    listByTenant(tenantId: string): Promise<({
        [x: string]: {
            id: string;
            email: string;
            personId: string | null;
            password: string;
            role: string;
            name: string | null;
            phone: string | null;
            avatar: string | null;
            emailVerified: boolean;
            tenantId: string | null;
            preferredLanguage: string;
            preferredCurrency: string;
            jobTitle: string | null;
            department: string | null;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string | null;
        }[] | ({
            status: string;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            patientId: string;
        } | {
            status: string;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            patientId: string;
        })[] | {
            status: string;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            patientId: string;
        }[] | ({
            id: string;
            email: string;
            personId: string | null;
            password: string;
            role: string;
            name: string | null;
            phone: string | null;
            avatar: string | null;
            emailVerified: boolean;
            tenantId: string | null;
            preferredLanguage: string;
            preferredCurrency: string;
            jobTitle: string | null;
            department: string | null;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string | null;
        } | {
            id: string;
            email: string;
            personId: string | null;
            password: string;
            role: string;
            name: string | null;
            phone: string | null;
            avatar: string | null;
            emailVerified: boolean;
            tenantId: string | null;
            preferredLanguage: string;
            preferredCurrency: string;
            jobTitle: string | null;
            department: string | null;
            createdAt: Date;
            updatedAt: Date;
            pharmacyId: string | null;
        })[];
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        name: string;
        tenantId: string | null;
        address: string | null;
    })[]>;
    /**
     * Atualiza o estoque de um produto em uma farmácia específica
     */
    updateInventory(pharmacyId: string, productId: string, quantity: number, price?: number, userId?: string): Promise<any>;
    /**
     * Busca produtos com estoque baixo em uma farmácia (Reposição Inteligente)
     */
    getLowStock(pharmacyId: string): Promise<any>;
};
//# sourceMappingURL=pharmacy.crud.d.ts.map