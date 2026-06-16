import prisma from '../lib/prisma.js';
import { PEDOMED_CONFIG } from '../config/pedomed.config.js';

export class PharmacyPerformanceService {
    /**
     * Calcula o score de performance de uma farmácia
     */
    async calculatePharmacyScore(pharmacyId: string, patientLocation?: any) {
        const pharmacy = await (prisma as any).pharmacy.findUnique({
            where: { id: pharmacyId },
            include: {
                User: {
                    include: { partner: {
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
        const responseTimeScore = this.calculateResponseTimeScore((pharmacy as any).averageResponseTimeMinutes || 0);
        // 2. Score de Taxa de Resposta (25%)
        const responseRateScore = this.calculateResponseRateScore((pharmacy as any).totalQuotesReceived || 0, (pharmacy as any).totalQuotesResponded || 0);
        // 3. Score de Competitividade de Preço (20%)
        const priceCompetitivenessScore = this.calculatePriceCompetitivenessScore((pharmacy as any).averagePriceVsMarket || 1);
        // 4. Score de Distância (15%)
        const distanceScore = patientLocation ?
            this.calculateDistanceScore(pharmacy, patientLocation) :
            (pharmacy as any).distanceScore || 0.5;
        // 5. Score de Plano (15%)
        const planScore = this.calculatePlanScore(pharmacy.User?.[0]?.Partner?.subscription?.plan?.name);
        // Calcular score geral (média ponderada)
        const overallScore = responseTimeScore * (PEDOMED_CONFIG.PERFORMANCE_SCORE.WEIGHTS as any).RESPONSE_TIME +
            responseRateScore * (PEDOMED_CONFIG.PERFORMANCE_SCORE.WEIGHTS as any).RESPONSE_RATE +
            priceCompetitivenessScore * (PEDOMED_CONFIG.PERFORMANCE_SCORE.WEIGHTS as any).PRICE_COMPETITIVENESS +
            distanceScore * (PEDOMED_CONFIG.PERFORMANCE_SCORE.WEIGHTS as any).DISTANCE +
            planScore * (PEDOMED_CONFIG.PERFORMANCE_SCORE.WEIGHTS as any).PLAN_TYPE;
        return {
            responseTimeScore,
            responseRateScore,
            priceCompetitivenessScore,
            distanceScore,
            planScore,
            overallScore: Math.max(PEDOMED_CONFIG.PERFORMANCE_SCORE.MIN_SCORE, Math.min(PEDOMED_CONFIG.PERFORMANCE_SCORE.MAX_SCORE, overallScore))
        };
    }
    /**
     * Atualiza o score de uma farmácia no banco
     */
    async updatePharmacyScore(pharmacyId: string, patientLocation?: any) {
        const scores = await this.calculatePharmacyScore(pharmacyId, patientLocation);
        await (prisma as any).pharmacy.update({
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
    async updateMetricsAfterResponse(pharmacyId: string, responseTimeMinutes: number, price: number) {
        const pharmacy = await (prisma as any).pharmacy.findUnique({
            where: { id: pharmacyId }
        });
        if (!pharmacy)
            return;
        // Calcular médias atualizadas
        const newTotalResponded = ((pharmacy as any).totalQuotesResponded || 0) + 1;
        const newAverageResponseTime = ((((pharmacy as any).averageResponseTimeMinutes || 0) * ((pharmacy as any).totalQuotesResponded || 0) + responseTimeMinutes) /
            newTotalResponded);
        // Atualizar preço vs mercado (simplificado - poderia usar média regional)
        const marketAveragePrice = await this.getMarketAveragePriceForSimilarProducts();
        const newPriceVsMarket = marketAveragePrice > 0 ? price / marketAveragePrice : 1.0;
        const newAveragePriceVsMarket = ((((pharmacy as any).averagePriceVsMarket || 1) * ((pharmacy as any).totalQuotesResponded || 0) + newPriceVsMarket) /
            newTotalResponded);
        await (prisma as any).pharmacy.update({
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
    async createPerformanceSnapshot(pharmacyId: string) {
        const pharmacy = await (prisma as any).pharmacy.findUnique({
            where: { id: pharmacyId }
        });
        if (!pharmacy)
            return;
        const marketData = await this.getMarketDataForPharmacy(pharmacyId);
        await (prisma as any).pharmacyPerformanceSnapshot.create({
            data: {
                pharmacyId,
                responseTimeScore: (pharmacy as any).responseTimeScore,
                responseRateScore: (pharmacy as any).responseRateScore,
                priceCompetitivenessScore: (pharmacy as any).priceCompetitivenessScore,
                distanceScore: (pharmacy as any).distanceScore,
                planScore: (pharmacy as any).planScore,
                overallScore: (pharmacy as any).performanceScore,
                totalQuotesReceived: (pharmacy as any).totalQuotesReceived,
                totalQuotesResponded: (pharmacy as any).totalQuotesResponded,
                averageResponseTimeMinutes: (pharmacy as any).averageResponseTimeMinutes,
                averagePriceVsMarket: (pharmacy as any).averagePriceVsMarket,
                regionalAveragePrice: marketData.averagePrice,
                competitorCount: marketData.competitorCount,
                marketShare: marketData.marketShare
            }
        });
    }

    async getRankedPharmacies(params: any) {
        const { lat, lng, radiusKm, limit, patientLocation } = params;
        // Buscar farmácias próximas
        const pharmacies: any[] = await (prisma as any).pharmacy.findMany({
            where: { isActive: true },
            take: limit || 100
        });

        const rankedPharmacies: any[] = [];
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
    calculateResponseTimeScore(averageMinutes: number) {
        const { RESPONSE_TIME_TARGET_MINUTES: TARGET_MINUTES, RESPONSE_TIME_MAX_MINUTES: MAX_MINUTES } = (PEDOMED_CONFIG.PERFORMANCE_SCORE as any);
        if (averageMinutes <= TARGET_MINUTES)
            return 1.0;
        if (averageMinutes >= MAX_MINUTES)
            return 0.1;
        // Linear interpolation entre 1.0 e 0.1
        const ratio = (averageMinutes - TARGET_MINUTES) / (MAX_MINUTES - TARGET_MINUTES);
        return 1.0 - (ratio * 0.9);
    }
    calculateResponseRateScore(received: number, responded: number) {
        if (received === 0)
            return (PEDOMED_CONFIG.PERFORMANCE_SCORE as any).DEFAULT_NEW_PHARMACY_SCORE;
        const rate = responded / received;
        const { RESPONSE_RATE_MINIMUM: MINIMUM, RESPONSE_RATE_EXCELLENT: EXCELLENT } = (PEDOMED_CONFIG.PERFORMANCE_SCORE as any);
        if (rate >= EXCELLENT)
            return 1.0;
        if (rate <= MINIMUM)
            return 0.1;
        // Linear interpolation
        const ratio = (rate - MINIMUM) / (EXCELLENT - MINIMUM);
        return 0.1 + (ratio * 0.9);
    }
    calculatePriceCompetitivenessScore(priceVsMarket: number) {
        const { PRICE_COMPETITIVE_THRESHOLD: COMPETITIVE_THRESHOLD, PRICE_EXPENSIVE_THRESHOLD: EXPENSIVE_THRESHOLD } = (PEDOMED_CONFIG.PERFORMANCE_SCORE as any);
        if (priceVsMarket <= COMPETITIVE_THRESHOLD)
            return 1.0;
        if (priceVsMarket >= EXPENSIVE_THRESHOLD)
            return 0.1;
        // Linear interpolation
        const ratio = (priceVsMarket - COMPETITIVE_THRESHOLD) / (EXPENSIVE_THRESHOLD - COMPETITIVE_THRESHOLD);
        return 1.0 - (ratio * 0.9);
    }
    calculateDistanceScore(pharmacy: any, patientLocation: any) {
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
    calculatePlanScore(plan?: string) {
        const { PLAN_SCORES } = (PEDOMED_CONFIG.PERFORMANCE_SCORE as any);
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
    async getMarketDataForPharmacy(pharmacyId: string) {
        // Simplificado - implementação real faria análise de mercado
        return {
            averagePrice: 50.0,
            competitorCount: 10,
            marketShare: 0.1
        };
    }
}
