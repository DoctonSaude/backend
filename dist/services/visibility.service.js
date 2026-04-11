"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.visibilityService = exports.VisibilityService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
class VisibilityService {
    /**
     * Calcula o ranking dinâmico de todos os parceiros ativos.
     * Lógica simplificada: Apenas baseada no Rating, pois outros campos foram removidos.
     */
    async updatePartnerRanking(partnerId) {
        // rankingScore foi removido do modelo Partner. Esta função agora é um stub
        // para evitar quebras em outros serviços até que o schema seja restaurado.
        return { success: true };
    }
    /**
     * Ativa um boost para um parceiro.
     * Stub: PartnerBoost não existe no schema atual.
     */
    async activateBoost(partnerId, type, price, config = {}, durationDays = 30) {
        console.warn(`[VisibilityService] Tentativa de ativar boost para ${partnerId} ignorada. Modelo PartnerBoost ausente.`);
        return { success: false, error: 'Funcionalidade temporariamente indisponível' };
    }
    /**
     * Retorna estatísticas de visibilidade para o dashboard do parceiro.
     */
    async getGrowthStats(partnerId) {
        const partner = await prisma_js_1.default.partner.findFirst({
            where: { id: partnerId }
        });
        if (!partner)
            throw new Error('Parceiro não encontrado');
        // Contagem de agendamentos
        const totalAppointments = await prisma_js_1.default.appointment.count({
            where: { partnerId }
        }).catch(() => 0);
        return {
            rankingScore: "5.0",
            rankingPosition: 1,
            totalImpressions: 0,
            totalClicks: 0,
            estimatedLoss: 0,
            specialty: partner.specialty || 'Clínica Geral',
            totalAppointments,
            activeBoosts: [],
            boostHistory: [],
            conversionRate: '0.0'
        };
    }
    /**
     * Registra uma impressão (visualização na busca)
     * Stub: totalImpressions removido do Partner.
     */
    async recordImpression(partnerId) {
        return { success: true };
    }
    /**
     * Registra um clique (acesso ao perfil)
     * Stub: totalClicks removido do Partner.
     */
    async recordClick(partnerId) {
        return { success: true };
    }
}
exports.VisibilityService = VisibilityService;
exports.visibilityService = new VisibilityService();
//# sourceMappingURL=visibility.service.js.map