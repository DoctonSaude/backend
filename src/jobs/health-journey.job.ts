import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { healthJourneyService } from '../services/health-journey.service.js';

/**
 * Job para processar o avanço das jornadas de saúde
 * Roda diariamente às 08:00 AM
 */
export const startHealthJourneyJob = () => {
    // Configuração do Cron: 0 8 * * * (Todos os dias às 08h)
    cron.schedule('0 8 * * *', async () => {
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

/**
 * Lógica central para avançar jornadas que completaram 24h desde a última atualização
 */
async function processActiveJourneys() {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    // Busca jornadas ativas que não foram atualizadas nas últimas 24h
    // e que ainda têm steps pendentes
    const journeysToAdvance = await (prisma as any).healthJourney.findMany({
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
                await healthJourneyService.advanceJourneyStep(journey.id);
                console.log(`🚀 [Job] Jornada ${journey.id} (Paciente: ${journey.patientId}) avançada para o step ${journey.stepsCurrent + 1}`);
            }
        }
        catch (err) {
            console.error(`❌ [Job] Erro ao avançar jornada ${journey.id}:`, err);
        }
    }
}
