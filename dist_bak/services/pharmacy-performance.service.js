"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmacyPerformanceService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const pedomed_config_js_1 = require("../config/pedomed.config.js");
class PharmacyPerformanceService {
    /**
     * Calcula o score de performance de uma farmácia
     */
    async calculatePharmacyScore(pharmacyId, patientLocation) {
        const pharmacy = await prisma_js_1.default.pharmacy.findUnique({
            where: { id: pharmacyId },
            include: {
                users: {
                    include: {
                        partner: {
                            include: {
                                subscription: {
                                    include: { plan: true }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!pharmacy) {
            throw new Error('Farmácia não encontrada');
        }
        // 1. Score de Tempo de Resposta (25%)
        const responseTimeScore = this.calculateResponseTimeScore(pharmacy.averageResponseTimeMinutes || 0);
        // 2. Score de Taxa de Resposta (25%)
        const responseRateScore = this.calculateResponseRateScore(pharmacy.totalQuotesReceived || 0, pharmacy.totalQuotesResponded || 0);
        // 3. Score de Competitividade de Preço (20%)
        const priceCompetitivenessScore = this.calculatePriceCompetitivenessScore(pharmacy.averagePriceVsMarket || 1);
        // 4. Score de Distância (15%)
        const distanceScore = patientLocation ?
            this.calculateDistanceScore(pharmacy, patientLocation) :
            pharmacy.distanceScore || 0.5;
        // 5. Score de Plano (15%)
        const planScore = this.calculatePlanScore(pharmacy.users[0]?.partner?.subscription?.plan?.name);
        // Calcular score geral (média ponderada)
        const overallScore = responseTimeScore * pedomed_config_js_1.PEDOMED_CONFIG.PERFORMANCE_SCORE.WEIGHTS.RESPONSE_TIME +
            responseRateScore * pedomed_config_js_1.PEDOMED_CONFIG.PERFORMANCE_SCORE.WEIGHTS.RESPONSE_RATE +
            priceCompetitivenessScore * pedomed_config_js_1.PEDOMED_CONFIG.PERFORMANCE_SCORE.WEIGHTS.PRICE_COMPETITIVENESS +
            distanceScore * pedomed_config_js_1.PEDOMED_CONFIG.PERFORMANCE_SCORE.WEIGHTS.DISTANCE +
            planScore * pedomed_config_js_1.PEDOMED_CONFIG.PERFORMANCE_SCORE.WEIGHTS.PLAN_TYPE;
        return {
            responseTimeScore,
            responseRateScore,
            priceCompetitivenessScore,
            distanceScore,
            planScore,
            overallScore: Math.max(pedomed_config_js_1.PEDOMED_CONFIG.PERFORMANCE_SCORE.MIN_SCORE, Math.min(pedomed_config_js_1.PEDOMED_CONFIG.PERFORMANCE_SCORE.MAX_SCORE, overallScore))
        };
    }
    /**
     * Atualiza o score de uma farmácia no banco
     */
    async updatePharmacyScore(pharmacyId, patientLocation) {
        const scores = await this.calculatePharmacyScore(pharmacyId, patientLocation);
        await prisma_js_1.default.pharmacy.update({
            where: { id: pharmacyId },
            data: {
                responseTimeScore: scores.responseTimeScore,
                responseRateScore: scores.responseRateScore,
                priceCompetitivenessScore: scores.priceCompetitivenessScore,
                distanceScore: scores.distanceScore,
                planScore: scores.planScore,
                performanceScore: scores.overallScore,
                scoreUpdatedAt: new Date()
            }
        });
        console.log(`[PharmacyPerformance] Updated score for pharmacy ${pharmacyId}: ${scores.overallScore.toFixed(3)}`);
    }
    /**
     * Atualiza métricas de performance após uma resposta
     */
    async updateMetricsAfterResponse(pharmacyId, responseTimeMinutes, price) {
        const pharmacy = await prisma_js_1.default.pharmacy.findUnique({
            where: { id: pharmacyId }
        });
        if (!pharmacy)
            return;
        // Calcular médias atualizadas
        const newTotalResponded = (pharmacy.totalQuotesResponded || 0) + 1;
        const newAverageResponseTime = (((pharmacy.averageResponseTimeMinutes || 0) * (pharmacy.totalQuotesResponded || 0) + responseTimeMinutes) /
            newTotalResponded);
        // Atualizar preço vs mercado (simplificado - poderia usar média regional)
        const marketAveragePrice = await this.getMarketAveragePriceForSimilarProducts();
        const newPriceVsMarket = marketAveragePrice > 0 ? price / marketAveragePrice : 1.0;
        const newAveragePriceVsMarket = (((pharmacy.averagePriceVsMarket || 1) * (pharmacy.totalQuotesResponded || 0) + newPriceVsMarket) /
            newTotalResponded);
        await prisma_js_1.default.pharmacy.update({
            where: { id: pharmacyId },
            data: {
                totalQuotesResponded: newTotalResponded,
                averageResponseTimeMinutes: newAverageResponseTime,
                averagePriceVsMarket: newAveragePriceVsMarket
            }
        });
    }
    /**
     * Cria snapshot diário de performance
     */
    async createPerformanceSnapshot(pharmacyId) {
        const pharmacy = await prisma_js_1.default.pharmacy.findUnique({
            where: { id: pharmacyId }
        });
        if (!pharmacy)
            return;
        const marketData = await this.getMarketDataForPharmacy(pharmacyId);
        await prisma_js_1.default.pharmacyPerformanceSnapshot.create({
            data: {
                pharmacyId,
                responseTimeScore: pharmacy.responseTimeScore,
                responseRateScore: pharmacy.responseRateScore,
                priceCompetitivenessScore: pharmacy.priceCompetitivenessScore,
                distanceScore: pharmacy.distanceScore,
                planScore: pharmacy.planScore,
                overallScore: pharmacy.performanceScore,
                totalQuotesReceived: pharmacy.totalQuotesReceived,
                totalQuotesResponded: pharmacy.totalQuotesResponded,
                averageResponseTimeMinutes: pharmacy.averageResponseTimeMinutes,
                averagePriceVsMarket: pharmacy.averagePriceVsMarket,
                regionalAveragePrice: marketData.averagePrice,
                competitorCount: marketData.competitorCount,
                marketShare: marketData.marketShare
            }
        });
    }
    async getRankedPharmacies(params) {
        const { lat, lng, radiusKm, limit, patientLocation } = params;
        // Buscar farmácias próximas
        const pharmacies = await prisma_js_1.default.pharmacy.findMany({
            where: { isActive: true },
            take: limit || 100
        });
        const rankedPharmacies = [];
        for (const pharmacy of pharmacies) {
            const scores = await this.calculatePharmacyScore(pharmacy.id, patientLocation);
            rankedPharmacies.push({
                pharmacy: {
                    ...pharmacy,
                    responseTimeScore: scores.responseTimeScore,
                    responseRateScore: scores.responseRateScore,
                    priceCompetitivenessScore: scores.priceCompetitivenessScore,
                    distanceScore: scores.distanceScore,
                    planScore: scores.planScore,
                    performanceScore: scores.overallScore
                },
                score: scores.overallScore,
                distance: pharmacy.distance_km
            });
        }
        // Ordenar por score (maior primeiro) e depois por distância (menor primeiro)
        return rankedPharmacies.sort((a, b) => {
            if (Math.abs(a.score - b.score) > 0.01) {
                return b.score - a.score; // Maior score primeiro
            }
            return a.distance - b.distance; // Menor distância primeiro
        });
    }
    // Métodos privados de cálculo
    calculateResponseTimeScore(averageMinutes) {
        const { RESPONSE_TIME_TARGET_MINUTES: TARGET_MINUTES, RESPONSE_TIME_MAX_MINUTES: MAX_MINUTES } = pedomed_config_js_1.PEDOMED_CONFIG.PERFORMANCE_SCORE;
        if (averageMinutes <= TARGET_MINUTES)
            return 1.0;
        if (averageMinutes >= MAX_MINUTES)
            return 0.1;
        // Linear interpolation entre 1.0 e 0.1
        const ratio = (averageMinutes - TARGET_MINUTES) / (MAX_MINUTES - TARGET_MINUTES);
        return 1.0 - (ratio * 0.9);
    }
    calculateResponseRateScore(received, responded) {
        if (received === 0)
            return pedomed_config_js_1.PEDOMED_CONFIG.PERFORMANCE_SCORE.DEFAULT_NEW_PHARMACY_SCORE;
        const rate = responded / received;
        const { RESPONSE_RATE_MINIMUM: MINIMUM, RESPONSE_RATE_EXCELLENT: EXCELLENT } = pedomed_config_js_1.PEDOMED_CONFIG.PERFORMANCE_SCORE;
        if (rate >= EXCELLENT)
            return 1.0;
        if (rate <= MINIMUM)
            return 0.1;
        // Linear interpolation
        const ratio = (rate - MINIMUM) / (EXCELLENT - MINIMUM);
        return 0.1 + (ratio * 0.9);
    }
    calculatePriceCompetitivenessScore(priceVsMarket) {
        const { PRICE_COMPETITIVE_THRESHOLD: COMPETITIVE_THRESHOLD, PRICE_EXPENSIVE_THRESHOLD: EXPENSIVE_THRESHOLD } = pedomed_config_js_1.PEDOMED_CONFIG.PERFORMANCE_SCORE;
        if (priceVsMarket <= COMPETITIVE_THRESHOLD)
            return 1.0;
        if (priceVsMarket >= EXPENSIVE_THRESHOLD)
            return 0.1;
        // Linear interpolation
        const ratio = (priceVsMarket - COMPETITIVE_THRESHOLD) / (EXPENSIVE_THRESHOLD - COMPETITIVE_THRESHOLD);
        return 1.0 - (ratio * 0.9);
    }
    calculateDistanceScore(pharmacy, patientLocation) {
        // Usar fórmula Haversine (já implementada no worker)
        const R = 6371; // Earth radius in km
        const dLat = (pharmacy.lat - patientLocation.lat) * Math.PI / 180;
        const dLng = (pharmacy.lng - patientLocation.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(pharmacy.lat * Math.PI / 180) * Math.cos(patientLocation.lat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        // Score baseado na distância (quanto mais perto, melhor)
        if (distance <= 1)
            return 1.0;
        if (distance >= 20)
            return 0.1;
        return Math.max(0.1, 1.0 - (distance / 20) * 0.9);
    }
    calculatePlanScore(plan) {
        const { PLAN_SCORES } = pedomed_config_js_1.PEDOMED_CONFIG.PERFORMANCE_SCORE;
        switch (plan?.toUpperCase()) {
            case 'PREMIUM': return PLAN_SCORES.PREMIUM;
            case 'PRO': return PLAN_SCORES.PRO;
            case 'BASIC':
            case 'FREE':
            default: return PLAN_SCORES.BASIC;
        }
    }
    async getMarketAveragePriceForSimilarProducts() {
        // Simplificado - poderia calcular média real por região/produto
        return 50.0; // Valor médio de referência
    }
    async getMarketDataForPharmacy(pharmacyId) {
        // Simplificado - implementação real faria análise de mercado
        return {
            averagePrice: 50.0,
            competitorCount: 10,
            marketShare: 0.1
        };
    }
}
exports.PharmacyPerformanceService = PharmacyPerformanceService;
//# sourceMappingURL=pharmacy-performance.service.js.map