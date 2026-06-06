"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
class RevenueService {
    /**
     * Gera insights de receita baseados na ocupação e histórico
     */
    static async getInsights(partnerId) {
        try {
            // 1. Calcular ocupação atual
            const appointmentsCount = await prisma_js_1.default.appointment.count({
                where: {
                    partnerId,
                    dateTime: { gte: new Date() }
                }
            });
            const roomsCount = await prisma_js_1.default.room.count({ where: { partnerId } });
            const totalCapacity = roomsCount * 8; // Assumindo 8 slots/dia por sala
            const occupancyRate = totalCapacity > 0 ? (appointmentsCount / totalCapacity) * 100 : 0;
            const insights = [];
            // Insight de Ocupação Baixa
            if (occupancyRate < 30) {
                insights.push({
                    type: 'INFO',
                    title: 'Ocupação Atual',
                    message: `Sua ocupação atual é de ${occupancyRate.toFixed(1)}%.`,
                    action: 'Ver Agenda',
                    impact: 'Otimização'
                });
            }
            // Insight de Serviços
            const services = await prisma_js_1.default.partnerService.findMany({
                where: { partnerId, isActive: true },
                take: 2
            });
            if (services.length >= 2) {
                insights.push({
                    type: 'OPPORTUNITY',
                    title: 'Gestão de Serviços',
                    message: `Você tem ${services.length} serviços ativos. Mantenha seus preços atualizados para atrair mais pacientes.`,
                    action: 'Meus Serviços',
                    impact: 'Receita'
                });
            }
            return {
                occupancyRate,
                insights,
                revenuePotential: appointmentsCount * 150, // Estimativa simplificada
            };
        }
        catch (error) {
            console.error('[RevenueService] Erro ao gerar insights:', error);
            return {
                occupancyRate: 0,
                insights: [],
                revenuePotential: 0
            };
        }
    }
    /**
     * Calcula o preço dinâmico (Stub: HappyHourConfig removido do schema)
     */
    static async calculateDynamicPrice(partnerId, servicePrice, date) {
        // Funcionalidade de Happy Hour desabilitada devido à ausência do campo happyHourConfig no banco
        return servicePrice;
    }
}
exports.RevenueService = RevenueService;
//# sourceMappingURL=revenue.service.js.map