import { Worker } from 'bullmq';
import prisma from '../lib/prisma.js';
import { getBullMQConnection } from '../lib/redis.js';
import { PHARMACY_QUOTES_QUEUE_NAME } from '../queues/pharmacyQuotes.queue.js';
import { pharmacyQuotesQueue } from '../queues/pharmacyQuotes.queue.js';
import { notifyPharmacyQuote } from '../services/notifications.service.js';
import { PEDOMED_CONFIG, getWaveConfig, getWaveTimeout } from '../config/pedomed.config.js';
import { PharmacyPerformanceService } from '../services/pharmacy-performance.service.js';

function deg2rad(deg: number) {
    return (deg * Math.PI) / 180;
}

async function selectPharmaciesInRadius(params: any) {
    const { lat, lng, radiusKm, excludeIds, take } = params;
    const performanceService = new PharmacyPerformanceService();
    const rankedPharmacies = await performanceService.getRankedPharmacies({
        lat,
        lng,
        radiusKm,
        limit: take || 50
    });

    const filteredPharmacies = rankedPharmacies.filter((rp: any) => !excludeIds.includes(rp.pharmacy.id));
    // Retornar apenas IDs das farmácias rankeadas
    const selectedPharmacies = filteredPharmacies.slice(0, take || filteredPharmacies.length);
    console.log(`[Worker] Selected ${selectedPharmacies.length} pharmacies by score for location (${lat}, ${lng})`);
    return selectedPharmacies.map((rp: any) => ({
        id: rp.pharmacy.id,
        distance: rp.distance,
        score: rp.score,
        pharmacy: rp.pharmacy
    }));
}

async function dispatchWave(payload: any) {
    const quote = await (prisma as any).pharmacyQuote.findUnique({
        where: { id: payload.quoteId },
        include: {
            recipients: true
        }
    });

    const alreadyRecipientIds = (quote.recipients || []).map((r: any) => r.pharmacyId);
    const waveNumber = payload.waveNumber;
    // Usar configurações centralizadas
    const waveConfig = getWaveConfig(waveNumber);
    const take = waveNumber === 3 ? undefined :
        (waveNumber === 1 ? (waveConfig as any).PHARMACY_COUNT : (waveConfig as any).ADDITIONAL_PHARMACIES);
    // Calcular raio baseado na wave
    let radiusKm = quote.radiusKm;
    if (waveNumber === 2) {
        const additionalRadius = 'ADDITIONAL_RADIUS_KM' in (waveConfig as any) ? (waveConfig as any).ADDITIONAL_RADIUS_KM : 0;
        radiusKm += additionalRadius;
    }
    else if (waveNumber === 3) {
        radiusKm = PEDOMED_CONFIG.GEOLOCATION.MAX_RADIUS_KM;
    }
    const pharmacyIds = await selectPharmaciesInRadius({
        lat: quote.lat,
        lng: quote.lng,
        radiusKm,
        economicGroupId: null,
        excludeIds: alreadyRecipientIds,
        take,
    });
    if (!pharmacyIds.length)
        return;
    const now = new Date();
    const timeoutSeconds = getWaveTimeout(waveNumber);
    const deadlineAt = new Date(now.getTime() + timeoutSeconds * 1000);
    await (prisma as any).pharmacyQuoteWave.upsert({
        where: { quoteId_waveNumber: { quoteId: quote.id, waveNumber } },
        update: { deadlineAt },
        create: {
            quoteId: quote.id,
            waveNumber,
            deadlineAt,
        },
    });
    await (prisma as any).pharmacyQuoteRecipient.createMany({
        data: pharmacyIds.map((pharmacyData: any) => ({
            quoteId: quote.id,
            pharmacyId: pharmacyData.id,
            waveNumber,
            status: 'SENT',
            sentAt: now,
        })),
    });
    // Notificar farmácias via WebSocket
    for (const pharmacyData of pharmacyIds) {
        await notifyPharmacyQuote(pharmacyData.id, quote.id, waveNumber);
    }
    // Se não for a última wave, agendar a próxima
    if (waveNumber < 3) {
        await pharmacyQuotesQueue.add(`wave-${waveNumber + 1}`, { quoteId: quote.id, waveNumber: waveNumber + 1 }, { delay: timeoutSeconds * 1000 });
    }
    return {
        quoteId: quote.id,
        waveNumber,
        pharmaciesNotified: pharmacyIds.length
    };
}

export const startPharmacyQuotesWorker = () => {
    const connection = getBullMQConnection();
    if (!connection) {
        console.log('[Worker] Redis not configured, Pharmacy Quotes Worker disabled');
        return null;
    }
    
    const worker = new Worker(PHARMACY_QUOTES_QUEUE_NAME, async (job) => {
        console.log(`[Worker] Processing job ${job.id} for wave ${job.data.waveNumber}`);
        await dispatchWave(job.data);
    }, { connection: connection as any });
    worker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job?.id} failed:`, err);
    });
    return worker;
};
