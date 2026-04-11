"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reputationService = exports.ReputationService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
class ReputationService {
    /**
     * Calcula o NPS (Net Promoter Score) e estatísticas de avaliação do parceiro.
     */
    async getReputationStats(partnerId) {
        const reviews = await prisma_js_1.default.review.findMany({
            where: { partnerId }
        });
        if (reviews.length === 0) {
            return {
                averageRating: 0,
                totalReviews: 0,
                nps: 0,
                distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            };
        }
        const total = reviews.length;
        let sum = 0;
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let promoters = 0; // 9-10 (no nosso caso 5)
        let detractors = 0; // 0-6 (no nosso caso 1-3)
        reviews.forEach(r => {
            sum += r.rating;
            dist[r.rating]++;
            if (r.rating === 5)
                promoters++;
            if (r.rating <= 3)
                detractors++;
        });
        const averageRating = sum / total;
        const nps = ((promoters - detractors) / total) * 100;
        return {
            averageRating: parseFloat(averageRating.toFixed(1)),
            totalReviews: total,
            nps: Math.round(nps),
            distribution: dist
        };
    }
    /**
     * Busca todas as avaliações com detalhes do paciente e agendamento.
     */
    async getPartnerReviews(partnerId) {
        return await prisma_js_1.default.review.findMany({
            where: { partnerId },
            include: {
                patient: {
                    include: {
                        user: {
                            select: { name: true, avatar: true }
                        }
                    }
                },
                appointment: {
                    select: { dateTime: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    /**
     * Responde a uma avaliação de paciente.
     */
    async replyToReview(reviewId, partnerId, reply) {
        const review = await prisma_js_1.default.review.findFirst({
            where: { id: reviewId, partnerId }
        });
        if (!review) {
            throw new Error('Avaliação não encontrada ou não pertence a este parceiro.');
        }
        return await prisma_js_1.default.review.update({
            where: { id: reviewId },
            data: {
                reply,
                replyDate: new Date()
            }
        });
    }
}
exports.ReputationService = ReputationService;
exports.reputationService = new ReputationService();
//# sourceMappingURL=reputation.service.js.map