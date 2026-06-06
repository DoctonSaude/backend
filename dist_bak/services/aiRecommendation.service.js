"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRecommendationService = void 0;
// @ts-nocheck
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
class AIRecommendationService {
    /**
     * Atualiza as estatísticas de produto de um usuário baseado em um novo pedido.
     * Alimenta o "Motor de IA" Nível 1.
     */
    static async updatePurchaseStats(userId, productName) {
        if (!userId || !productName)
            return; // Guarda de entrada
        try {
            const stats = await prisma_js_1.default.userProductStats.findFirst({
                where: { userId, productName }
            });
            const now = new Date();
            if (!stats) {
                // Primeira compra registrada
                return await prisma_js_1.default.userProductStats.create({
                    data: {
                        userId,
                        productName,
                        lastPurchaseDate: now,
                        purchaseCount: 1,
                        averageIntervalDays: 30, // Estimativa inicial
                        confidenceScore: 0.1
                    }
                });
            }
            // Calcular novo intervalo médio (GUARDA CONTRA NaN E DIVISÃO POR ZERO)
            const lastDate = stats.lastPurchaseDate instanceof Date
                ? stats.lastPurchaseDate
                : (stats.updatedAt instanceof Date ? stats.updatedAt : now);
            const diffTime = Math.abs(now.getTime() - lastDate.getTime());
            const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))); // Mínimo 1 dia
            const currentCount = Math.max(1, stats.purchaseCount || 1); // Nunca zero
            const currentInterval = isFinite(stats.averageIntervalDays) ? (stats.averageIntervalDays || 30) : 30;
            // Média móvel ponderada (segura contra divisão por zero)
            const newInterval = ((currentInterval * (currentCount - 1)) + diffDays) / currentCount;
            const safeInterval = isFinite(newInterval) && newInterval > 0 ? newInterval : 30;
            // Confidence score cresce com o histórico
            const currentConfidence = isFinite(stats.confidenceScore) ? stats.confidenceScore : 0;
            const newConfidence = Math.min(currentConfidence + 0.15, 0.95);
            return await prisma_js_1.default.userProductStats.update({
                where: { id: stats.id },
                data: {
                    lastPurchaseDate: now,
                    averageIntervalDays: safeInterval,
                    purchaseCount: { increment: 1 },
                    isRecurring: currentCount >= 2,
                    confidenceScore: newConfidence
                }
            });
        }
        catch (error) {
            // Falha silenciosa: não deixa a compra do usuário falhar por causa da IA
            const errMsg = error instanceof Error ? error.message : String(error);
            console.warn(`[AI SERVICE] Falha ao atualizar stats (não crítico) para ${userId}: ${errMsg}`);
        }
    }
    /**
     * Analisa prescrições para gerar predições iniciais de compra.
     * Útil quando o usuário ainda não tem histórico de pedidos, mas subiu uma receita.
     */
    static async analyzePrescription(patientId, prescriptionId) {
        if (!patientId || !prescriptionId)
            return; // Guarda de entrada
        try {
            const prescription = await prisma_js_1.default.medicalRecord.findUnique({
                where: { id: prescriptionId },
                include: { patient: { include: { user: true } } }
            });
            if (!prescription || !prescription.patient?.userId)
                return;
            const userId = prescription.patient.userId;
            const existing = await prisma_js_1.default.userProductStats.findFirst({
                where: { userId, productName: 'Medicamento Prescrito' }
            });
            if (existing)
                return; // Já processado
            await prisma_js_1.default.userProductStats.create({
                data: {
                    userId,
                    productName: 'Medicamento Prescrito',
                    averageIntervalDays: 30, // Estimativa padrão para prescrições mensais
                    isRecurring: true,
                    purchaseCount: 0,
                    confidenceScore: 0.4, // Confiança moderada por ser prescrição médica
                    lastPurchaseDate: new Date()
                }
            });
        }
        catch (error) {
            // Falha silenciosa: IA não bloqueia upload de receita
            const errMsg = error instanceof Error ? error.message : String(error);
            console.warn(`[AI SERVICE] Falha ao analisar receita ${prescriptionId} (não crítico): ${errMsg}`);
        }
    }
}
exports.AIRecommendationService = AIRecommendationService;
//# sourceMappingURL=aiRecommendation.service.js.map