"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHealthJourneyJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const health_journey_service_js_1 = require("../services/health-journey.service.js");
/**
 * Job para processar o avanço das jornadas de saúde
 * Roda diariamente às 08:00 AM
 */
const startHealthJourneyJob = () => {
    // Configuração do Cron: 0 8 * * * (Todos os dias às 08h)
    node_cron_1.default.schedule('0 8 * * *', async () => {
        console.log('🔄 [Job] Iniciando processamento de jornadas de saúde...');
        try {
            await processActiveJourneys();
            console.log('✅ [Job] Processamento de jornadas concluído.');
        }
        catch (error) {
            console.error('❌ [Job] Erro ao processar jornadas:', error);
        }
    });
    console.log('⏰ Health Journey Job agendado para as 08:00 AM');
};
exports.startHealthJourneyJob = startHealthJourneyJob;
/**
 * Lógica central para avançar jornadas que completaram 24h desde a última atualização
 */
async function processActiveJourneys() {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    // Busca jornadas ativas que não foram atualizadas nas últimas 24h
    // e que ainda têm steps pendentes
    const journeysToAdvance = await prisma_js_1.default.healthJourney.findMany({
        where: {
            status: 'ACTIVE',
            updatedAt: {
                lt: yesterday
            }
        }
    });
    console.log(`📌 [Job] Encontradas ${journeysToAdvance.length} jornadas para avançar.`);
    for (const journey of journeysToAdvance) {
        try {
            if (journey.stepsCurrent < journey.stepsTotal) {
                await health_journey_service_js_1.healthJourneyService.advanceJourneyStep(journey.id);
                console.log(`🚀 [Job] Jornada ${journey.id} (Paciente: ${journey.patientId}) avançada para o step ${journey.stepsCurrent + 1}`);
            }
        }
        catch (err) {
            console.error(`❌ [Job] Erro ao avançar jornada ${journey.id}:`, err);
        }
    }
}
//# sourceMappingURL=health-journey.job.js.map