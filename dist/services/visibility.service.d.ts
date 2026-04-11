export declare class VisibilityService {
    /**
     * Calcula o ranking dinâmico de todos os parceiros ativos.
     * Lógica simplificada: Apenas baseada no Rating, pois outros campos foram removidos.
     */
    updatePartnerRanking(partnerId: string): Promise<{
        success: boolean;
    }>;
    /**
     * Ativa um boost para um parceiro.
     * Stub: PartnerBoost não existe no schema atual.
     */
    activateBoost(partnerId: string, type: string, price: number, config?: any, durationDays?: number): Promise<{
        success: boolean;
        error: string;
    }>;
    /**
     * Retorna estatísticas de visibilidade para o dashboard do parceiro.
     */
    getGrowthStats(partnerId: string): Promise<{
        rankingScore: string;
        rankingPosition: number;
        totalImpressions: number;
        totalClicks: number;
        estimatedLoss: number;
        specialty: string;
        totalAppointments: number;
        activeBoosts: any[];
        boostHistory: any[];
        conversionRate: string;
    }>;
    /**
     * Registra uma impressão (visualização na busca)
     * Stub: totalImpressions removido do Partner.
     */
    recordImpression(partnerId: string): Promise<{
        success: boolean;
    }>;
    /**
     * Registra um clique (acesso ao perfil)
     * Stub: totalClicks removido do Partner.
     */
    recordClick(partnerId: string): Promise<{
        success: boolean;
    }>;
}
export declare const visibilityService: VisibilityService;
//# sourceMappingURL=visibility.service.d.ts.map