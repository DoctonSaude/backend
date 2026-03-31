"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chronobiologyService = exports.ChronobiologyService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
class ChronobiologyService {
    /**
     * Determina a faixa horária de um registro
     */
    getTimeRange(date) {
        const hour = date.getHours(); // Assumes server time (UTC) aligned or offset handled. For MVP using raw hour.
        // Considerando fuso horário -3 (BRT) se os dados vierem em UTC, ou assumindo que logDate já está ajustado.
        // Dado que logDate costuma ser salvo com timezone ou UTC, vamos extrair a hora UTC se o servidor for UTC.
        // Para simplificar MVP: getHours() local do servidor.
        if (hour >= 5 && hour < 12)
            return 'MORNING';
        if (hour >= 12 && hour < 18)
            return 'AFTERNOON';
        if (hour >= 18 && hour < 22)
            return 'EVENING';
        return 'NIGHT';
    }
    /**
     * Analisa qual o melhor horário para o paciente baseado em Humor e Energia passados
     * @param patientId ID interno do paciente (para filtrar logs)
     */
    async analyzePeakPerformance(patientId) {
        try {
            // Buscar logs dos últimos 30 dias com alto valor de engajamento/humor
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const positiveLogs = await prisma_1.default.healthLog.findMany({
                where: {
                    patientId: patientId,
                    logDate: { gte: thirtyDaysAgo },
                    OR: [
                        { type: 'MOOD', value: { in: ['Ótimo', 'Bem', '3', '4', '5'] } },
                        { type: 'STEPS', value: { gt: '5000' } }, // High activity steps
                        { type: 'EXERCISE' }
                    ]
                }
            });
            if (positiveLogs.length < 5)
                return null; // Poucos dados
            const scores = { MORNING: 0, AFTERNOON: 0, EVENING: 0, NIGHT: 0 };
            const counts = { MORNING: 0, AFTERNOON: 0, EVENING: 0, NIGHT: 0 };
            positiveLogs.forEach(log => {
                const range = this.getTimeRange(new Date(log.logDate));
                counts[range]++;
                // Peso simples: Humor vale 2, Atividade vale 1
                const weight = log.type === 'MOOD' ? 2 : 1;
                scores[range] += weight;
            });
            // Encontrar vencedor
            let bestRange = 'MORNING';
            let maxScore = -1;
            Object.keys(scores).forEach(key => {
                if (scores[key] > maxScore) {
                    maxScore = scores[key];
                    bestRange = key;
                }
            });
            const descriptions = {
                MORNING: 'Você é um "Early Bird"! Seus dados mostram que seu humor e energia são mais altos nas primeiras horas do dia.',
                AFTERNOON: 'Seu pico é à tarde. Você tende a ser mais ativo e positivo após o almoço.',
                EVENING: 'Você rende mais à noite. Suas melhores atividades acontecem no final do dia.',
                NIGHT: 'Você é um "Night Owl". Sua energia criativa desperta quando o mundo dorme.'
            };
            const recommendations = {
                MORNING: ['Agendar treinos às 07:00', 'Medicamento matinal', 'Meditação ao acordar'],
                AFTERNOON: ['Caminhada pós-almoço', 'Tarefas de foco intenso'],
                EVENING: ['Treino noturno', 'Leitura leve', 'Log de gratidão'],
                NIGHT: ['Planejamento do dia seguinte', 'Desconexão digital gradual']
            };
            return {
                timeOfDay: bestRange,
                bestActivity: maxScore > 10 ? 'Alta Performance' : 'Estável',
                peakEnergyScore: Math.min(100, maxScore * 5), // Normalizar score arbitrário
                description: descriptions[bestRange],
                recommendedActions: recommendations[bestRange]
            };
        }
        catch (error) {
            console.error('Erro na análise de cronobiologia:', error);
            return null;
        }
    }
}
exports.ChronobiologyService = ChronobiologyService;
exports.chronobiologyService = new ChronobiologyService();
//# sourceMappingURL=chronobiology.service.js.map