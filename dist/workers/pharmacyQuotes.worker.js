"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPharmacyQuotesWorker = void 0;
const bullmq_1 = require("bullmq");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const redis_js_1 = require("../lib/redis.js");
const pharmacyQuotes_queue_js_1 = require("../queues/pharmacyQuotes.queue.js");
const pharmacyQuotes_queue_js_2 = require("../queues/pharmacyQuotes.queue.js");
const notifications_service_js_1 = require("../services/notifications.service.js");
const pedomed_config_js_1 = require("../config/pedomed.config.js");
const pharmacy_performance_service_js_1 = require("../services/pharmacy-performance.service.js");
function deg2rad(deg) {
    return (deg * Math.PI) / 180;
}
async function selectPharmaciesInRadius(params) {
    const { lat, lng, radiusKm, excludeIds, take } = params;
    const performanceService = new pharmacy_performance_service_js_1.PharmacyPerformanceService();
    const rankedPharmacies = await performanceService.getRankedPharmacies({
        lat,
        lng,
        radiusKm,
        limit: take || 50
    });
    const filteredPharmacies = rankedPharmacies.filter((rp) => !excludeIds.includes(rp.pharmacy.id));
    // Retornar apenas IDs das farmácias rankeadas
    const selectedPharmacies = filteredPharmacies.slice(0, take || filteredPharmacies.length);
    console.log(`[Worker] Selected ${selectedPharmacies.length} pharmacies by score for location (${lat}, ${lng})`);
    return selectedPharmacies.map((rp) => ({
        id: rp.pharmacy.id,
        distance: rp.distance,
        score: rp.score,
        pharmacy: rp.pharmacy
    }));
}
async function dispatchWave(payload) {
    const quote = await prisma_js_1.default.pharmacyQuote.findUnique({
        where: { id: payload.quoteId },
        include: {
            recipients: true
        }
    });
    const alreadyRecipientIds = (quote.recipients || []).map((r) => r.pharmacyId);
    const waveNumber = payload.waveNumber;
    // Usar configurações centralizadas
    const waveConfig = (0, pedomed_config_js_1.getWaveConfig)(waveNumber);
    const take = waveNumber === 3 ? undefined :
        (waveNumber === 1 ? waveConfig.PHARMACY_COUNT : waveConfig.ADDITIONAL_PHARMACIES);
    // Calcular raio baseado na wave
    let radiusKm = quote.radiusKm;
    if (waveNumber === 2) {
        const additionalRadius = 'ADDITIONAL_RADIUS_KM' in waveConfig ? waveConfig.ADDITIONAL_RADIUS_KM : 0;
        radiusKm += additionalRadius;
    }
    else if (waveNumber === 3) {
        radiusKm = pedomed_config_js_1.PEDOMED_CONFIG.GEOLOCATION.MAX_RADIUS_KM;
    }
    const pharmacyIds = await selectPharmaciesInRadius({
        lat: quote.lat,
        lng: quote.lng,
        radiusKm,
        tenantId: null,
        excludeIds: alreadyRecipientIds,
        take,
    });
    if (!pharmacyIds.length)
        return;
    const now = new Date();
    const timeoutSeconds = (0, pedomed_config_js_1.getWaveTimeout)(waveNumber);
    const deadlineAt = new Date(now.getTime() + timeoutSeconds * 1000);
    await prisma_js_1.default.pharmacyQuoteWave.upsert({
        where: { quoteId_waveNumber: { quoteId: quote.id, waveNumber } },
        update: { deadlineAt },
        create: {
            quoteId: quote.id,
            waveNumber,
            deadlineAt,
        },
    });
    await prisma_js_1.default.pharmacyQuoteRecipient.createMany({
        data: pharmacyIds.map((pharmacyData) => ({
            quoteId: quote.id,
            pharmacyId: pharmacyData.id,
            waveNumber,
            status: 'SENT',
            sentAt: now,
        })),
    });
    // Notificar farmácias via WebSocket
    for (const pharmacyData of pharmacyIds) {
        await (0, notifications_service_js_1.notifyPharmacyQuote)(pharmacyData.id, quote.id, waveNumber);
    }
    // Se não for a última wave, agendar a próxima
    if (waveNumber < 3) {
        await pharmacyQuotes_queue_js_2.pharmacyQuotesQueue.add(`wave-${waveNumber + 1}`, { quoteId: quote.id, waveNumber: waveNumber + 1 }, { delay: timeoutSeconds * 1000 });
    }
    return {
        quoteId: quote.id,
        waveNumber,
        pharmaciesNotified: pharmacyIds.length
    };
}
const startPharmacyQuotesWorker = () => {
    const connection = (0, redis_js_1.getBullMQConnection)();
    if (!connection) {
        console.log('[Worker] Redis not configured, Pharmacy Quotes Worker disabled');
        return null;
    }
    const worker = new bullmq_1.Worker(pharmacyQuotes_queue_js_1.PHARMACY_QUOTES_QUEUE_NAME, async (job) => {
        console.log(`[Worker] Processing job ${job.id} for wave ${job.data.waveNumber}`);
        await dispatchWave(job.data);
    }, { connection: connection });
    worker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job?.id} failed:`, err);
    });
    return worker;
};
exports.startPharmacyQuotesWorker = startPharmacyQuotesWorker;
//# sourceMappingURL=pharmacyQuotes.worker.js.map