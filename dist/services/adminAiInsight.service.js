"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAiInsightService = exports.AdminAiInsightService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
class AdminAiInsightService {
    async getGlobalInsights() {
        const insights = await prisma_1.default.aiInsight.findMany({
            include: {
                user: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return insights.map(i => ({
            ...i,
            patientName: i.user?.name || 'Sistema'
        }));
    }
    async getAiModels() {
        // Mapeamos PredictiveModel para o formato esperado pelo frontend
        const models = await prisma_1.default.predictiveModel.findMany();
        return models.map(m => ({
            id: m.id,
            name: m.name,
            type: 'Preditivo',
            status: 'active',
            accuracy: m.accuracy * 100,
            lastTrained: m.lastTrained
        }));
    }
    async generateGlobalInsights() {
        // Aqui seria a lógica para disparar uma análise em toda a base
        // Para fins de demonstração e integração, vamos simular a criação de um insight global
        const newInsight = await prisma_1.default.aiInsight.create({
            data: {
                type: 'trend',
                title: 'Aumento na adesão vacinal',
                description: 'Observamos um aumento de 15% na busca por vacinas preventivas na última semana.',
                confidence: 94,
                impact: 'Positivo',
                category: 'preventive',
                actionable: true,
                priority: 2
            }
        });
        return newInsight;
    }
    async trainModel(id) {
        return prisma_1.default.predictiveModel.update({
            where: { id },
            data: {
                lastTrained: new Date(),
                accuracy: 0.95 // Simulando melhora na precisão após treino
            }
        });
    }
}
exports.AdminAiInsightService = AdminAiInsightService;
exports.adminAiInsightService = new AdminAiInsightService();
//# sourceMappingURL=adminAiInsight.service.js.map