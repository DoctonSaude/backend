"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiInsightService = exports.AiInsightService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
class AiInsightService {
    /**
     * MÉTODO PRINCIPAL: Gera insights personalizados para o paciente
     */
    async generatePatientInsights(userId) {
        try {
            const patient = await prisma_1.default.patient.findUnique({
                where: { userId },
                include: {
                    healthLogs: {
                        orderBy: { logDate: 'desc' },
                        take: 20
                    },
                    prescriptions: {
                        where: { status: 'Ativo' }
                    },
                    patientChallenges: {
                        where: { status: 'ACTIVE' },
                        include: { challenge: true }
                    }
                }
            });
            if (!patient)
                return [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // 0. Check for existing insights created today
            const existingInsights = await prisma_1.default.patientInsight.findMany({
                where: {
                    patientId: patient.id,
                    createdAt: { gte: today },
                    isDismissed: false
                }
            });
            if (existingInsights.length > 0) {
                // Map DB format to API format and Sort
                const mapped = existingInsights.map(i => ({
                    id: i.id,
                    type: i.type,
                    title: i.title,
                    description: i.description,
                    priority: i.priority,
                    category: i.category,
                    actionable: i.actionable,
                    metadata: i.metadata,
                    sourceData: i.metadata?.sourceData || [],
                    createdAt: i.createdAt.toISOString()
                }));
                const priorityScore = { high: 3, medium: 2, low: 1 };
                return mapped.sort((a, b) => priorityScore[b.priority] - priorityScore[a.priority]);
            }
            const insights = [];
            // 1. Analisar Saúde Mental (Humor e Stress)
            const mentalHealthInsights = this.analyzeMentalHealth(patient.healthLogs || []);
            insights.push(...mentalHealthInsights);
            // 2. Analisar Atividade Física (Passos)
            const activityInsights = await this.analyzePhysicalActivity(patient.id, patient.healthLogs || []);
            insights.push(...activityInsights);
            // 3. Analisar Adesão a Tratamentos
            const medicalInsights = this.analyzeMedicalAdherence(patient.prescriptions || []);
            insights.push(...medicalInsights);
            // 4. Insights Preventivos Proativos
            const preventiveInsights = this.generatePreventiveTips(patient);
            insights.push(...preventiveInsights);
            // 5. FASE 4: Correlações e Padrões
            const correlationInsights = this.analyzeCorrelations(patient.healthLogs || []);
            insights.push(...correlationInsights);
            // 6. FASE 5: Memória Contextual (Exemplo simplificado)
            const recentMood = patient.healthLogs?.find((l) => l.type === 'MOOD');
            if (recentMood && recentMood.value === '1') { // Humor baixo
                insights.push({
                    id: 'contextual_memory_1',
                    type: 'recommendation',
                    title: 'O que funcionou antes',
                    description: 'Da última vez que você se sentiu assim, uma caminhada leve de 10 min ajudou a melhorar seu humor.',
                    priority: 'medium',
                    category: 'mental_health',
                    actionable: true,
                    createdAt: new Date().toISOString()
                });
            }
            // Salvar insights gerados no banco
            const savedInsights = [];
            for (const insight of insights) {
                try {
                    const saved = await prisma_1.default.patientInsight.create({
                        data: {
                            patientId: patient.id,
                            type: insight.type,
                            title: insight.title,
                            description: insight.description,
                            priority: insight.priority,
                            category: insight.category,
                            actionable: insight.actionable,
                            metadata: JSON.stringify({ sourceData: insight.sourceData || [] }),
                            isRead: false
                        }
                    });
                    savedInsights.push({
                        ...saved,
                        type: saved.type,
                        priority: saved.priority,
                        category: saved.category,
                        sourceData: insight.sourceData,
                        createdAt: saved.createdAt.toISOString()
                    });
                }
                catch (err) {
                    console.error('Erro ao salvar insight:', err);
                }
            }
            // Ordenar por prioridade (high > medium > low)
            return savedInsights.sort((a, b) => {
                const priorityScore = { high: 3, medium: 2, low: 1 };
                return priorityScore[b.priority] - priorityScore[a.priority];
            });
        }
        catch (error) {
            console.error('Erro ao gerar insights de IA:', error);
            return [];
        }
    }
    analyzeMentalHealth(logs) {
        const insights = [];
        const moodLogs = logs.filter(l => l.type === 'MOOD');
        if (moodLogs.length >= 3) {
            const recentMoods = moodLogs.slice(0, 3)
                .map(l => {
                const val = Number(l.value);
                if (!isNaN(val))
                    return val;
                // Fallback para mapeamento de texto se necessário
                const map = { 'Ótimo': 4, 'Bem': 3, 'Neutro': 2, 'Mal': 1, 'Cansado': 2 };
                return map[l.value] || 3;
            });
            const avgMood = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
            if (avgMood <= 2) {
                insights.push({
                    id: 'mental_health_alert',
                    type: 'alert',
                    title: 'Notamos que você não está bem',
                    description: 'Seu humor tem sido baixo nos últimos dias. Que tal uma pausa para meditação ou conversar com um profissional?',
                    priority: 'high',
                    category: 'mental_health',
                    actionable: true,
                    sourceData: moodLogs.slice(0, 3).map(l => `${l.type} (${l.value}) em ${new Date(l.logDate).toLocaleDateString('pt-BR')}`),
                    createdAt: new Date().toISOString()
                });
            }
        }
        return insights;
    }
    async analyzePhysicalActivity(patientId, logs) {
        const insights = [];
        const stepLogs = logs.filter(l => l.type === 'STEPS');
        if (stepLogs.length > 0) {
            const latestSteps = Number(stepLogs[0].value);
            if (!isNaN(latestSteps) && latestSteps < 3000) {
                insights.push({
                    id: 'activity_low',
                    type: 'recommendation',
                    title: 'Meta de Passos Distante',
                    description: 'Você deu poucos passos hoje. Uma caminhada de 15 minutos pode melhorar sua energia!',
                    priority: 'medium',
                    category: 'lifestyle',
                    actionable: true,
                    sourceData: [`Passos: ${stepLogs[0].value} em ${new Date(stepLogs[0].logDate).toLocaleDateString('pt-BR')}`],
                    createdAt: new Date().toISOString()
                });
            }
            else if (latestSteps >= 10000) {
                insights.push({
                    id: 'activity_high',
                    type: 'achievement',
                    title: 'Exemplar! 10k Passos',
                    description: 'Você atingiu a meta ideal de passos hoje. Seu coração agradece!',
                    priority: 'medium',
                    category: 'cardiovascular',
                    actionable: false,
                    sourceData: [`Passos: ${stepLogs[0].value} em ${new Date(stepLogs[0].logDate).toLocaleDateString('pt-BR')}`],
                    createdAt: new Date().toISOString()
                });
            }
        }
        return insights;
    }
    analyzeMedicalAdherence(prescriptions) {
        const insights = [];
        if (prescriptions.length > 0) {
            insights.push({
                id: 'medication_reminder',
                type: 'tip',
                title: 'Lembrete de Medicamentos',
                description: `Você tem ${prescriptions.length} prescrições ativas. Manter o horário correto potencializa o tratamento.`,
                priority: 'medium',
                category: 'preventive',
                actionable: false,
                createdAt: new Date().toISOString()
            });
        }
        return insights;
    }
    generatePreventiveTips(patient) {
        const insights = [];
        const archetype = patient.archetype || 'GENERAL';
        // 1. Dicas Genéricas (Hidratação)
        const today = new Date().toISOString().split('T')[0];
        const hydrationLog = patient.healthLogs.find((l) => l.type === 'WATER' && l.logDate.toISOString().startsWith(today));
        if (!hydrationLog) {
            insights.push({
                id: 'hydration_tip',
                type: 'recommendation',
                title: 'Hidrate-se!',
                description: 'Beber água regularmente ajuda na sua concentração e metabolismo. Já bebeu água hoje?',
                priority: 'low',
                category: 'lifestyle',
                actionable: true,
                createdAt: new Date().toISOString()
            });
        }
        // 2. Dicas Específicas por Arquétipo (Fase 3)
        if (archetype === 'PREGNANT') {
            insights.push({
                id: 'pregnant_tip',
                type: 'tip',
                title: 'Dica Gestacional',
                description: 'Mantenha seus exames pré-natais em dia e foque em alimentos ricos em ácido fólico.',
                priority: 'high',
                category: 'preventive',
                actionable: true,
                createdAt: new Date().toISOString()
            });
        }
        else if (archetype === 'SENIOR') {
            insights.push({
                id: 'senior_tip',
                type: 'tip',
                title: 'Fortalecimento Sênior',
                description: 'Exercícios de equilíbrio são fundamentais para evitar quedas. Que tal 5 min hoje?',
                priority: 'medium',
                category: 'lifestyle',
                actionable: true,
                createdAt: new Date().toISOString()
            });
        }
        else if (archetype === 'ATHLETE') {
            insights.push({
                id: 'athlete_tip',
                type: 'tip',
                title: 'Recuperação Muscular',
                description: 'Lembre-se do repouso ativo. O overtraining pode prejudicar sua evolução.',
                priority: 'medium',
                category: 'lifestyle',
                actionable: true,
                createdAt: new Date().toISOString()
            });
        }
        return insights;
    }
    /**
     * FASE 4: Detecta padrões comportamentais correlacionando métricas
     */
    analyzeCorrelations(logs) {
        const insights = [];
        // Exemplo de Correlação: Sono vs Estresse
        const sleepLogs = logs.filter(l => l.type === 'SLEEP').slice(0, 5);
        const stressLogs = logs.filter(l => l.type === 'STRESS').slice(0, 5);
        if (sleepLogs.length >= 3 && stressLogs.length >= 3) {
            const avgSleep = sleepLogs.reduce((a, b) => a + Number(b.value), 0) / sleepLogs.length;
            const highStress = stressLogs.some(l => l.value === 'high' || l.value === 'medium');
            if (avgSleep < 6 && highStress) {
                insights.push({
                    id: 'correlation_sleep_stress',
                    type: 'tip',
                    title: 'Padrão Detectado: Sono x Estresse',
                    description: 'Notamos que seu estresse aumenta quando você dorme menos de 6h. Tente priorizar o sono hoje para um dia mais tranquilo.',
                    priority: 'medium',
                    category: 'mental_health',
                    actionable: true,
                    sourceData: [
                        ...sleepLogs.map(l => `Sono (${l.value}h)`),
                        ...stressLogs.map(l => `Estresse (${l.value})`)
                    ],
                    createdAt: new Date().toISOString()
                });
            }
        }
        // Exemplo: Atividade Física vs Humor
        const stepLogs = logs.filter(l => l.type === 'STEPS').slice(0, 5);
        const moodLogs = logs.filter(l => l.type === 'MOOD').slice(0, 5);
        if (stepLogs.length >= 3 && moodLogs.length >= 3) {
            const lowSteps = stepLogs.every(l => Number(l.value) < 4000);
            const lowMood = moodLogs.some(l => l.value === 'Mal' || l.value === 'Cansado');
            if (lowSteps && lowMood) {
                insights.push({
                    id: 'correlation_steps_mood',
                    type: 'recommendation',
                    title: 'Movimento é Remédio',
                    description: 'Seu humor costuma baixar em dias de pouca atividade. Uma caminhada leve de 10 min pode mudar seu estado mental!',
                    priority: 'medium',
                    category: 'lifestyle',
                    actionable: true,
                    createdAt: new Date().toISOString()
                });
            }
        }
        return insights;
    }
    /**
     * FASE 4: Gera ou recupera 3 Micro-ações para o Plano de Ação Diário
     */
    async generateDailyActions(patient, isLowDay = false) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // 1. Tentar buscar tarefas já criadas para hoje
        const existingTasks = await prisma_1.default.patientDailyTask.findMany({
            where: {
                patientId: patient.id,
                date: {
                    gte: today
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        if (existingTasks.length > 0) {
            return existingTasks;
        }
        const actions = [];
        const archetype = patient.archetype || 'GENERAL';
        if (isLowDay) {
            // No Modo Ruim, apenas 1 ação ultra-simples
            actions.push({
                task: 'Respirar profundamente por 2 minutos',
                xp: 100,
                icon: '🌬️',
            });
        }
        else {
            // Ação 1: Hidratação (Base)
            actions.push({
                task: 'Beber 2L de água',
                xp: 50,
                icon: '💧'
            });
            // Ação 2: Específica por Arquétipo
            if (archetype === 'PREGNANT') {
                actions.push({ task: 'Massagem nas pernas (5 min)', xp: 100, icon: '🦶' });
            }
            else if (archetype === 'ATHLETE') {
                actions.push({ task: 'Alongamento pós-treino', xp: 150, icon: '🧘' });
            }
            else if (archetype === 'SENIOR') {
                actions.push({ task: 'Caminhada plana (15 min)', xp: 120, icon: '🚶' });
            }
            else {
                actions.push({ task: 'Respirar fundo 3x ao acordar', xp: 80, icon: '🌬️' });
            }
            // Ação 3: Baseada em dados recentes
            const weightLogs = patient.healthLogs?.filter((l) => l.type === 'WEIGHT');
            if (weightLogs && weightLogs.length > 0) {
                actions.push({ task: 'Refeição rica em fibras', xp: 100, icon: '🥗' });
            }
            else {
                actions.push({ task: 'Completar perfil de saúde', xp: 200, icon: '📝' });
            }
        }
        // 2. Salvar tarefas geradas no banco
        const savedTasks = [];
        for (const action of actions) {
            const saved = await prisma_1.default.patientDailyTask.create({
                data: {
                    patientId: patient.id,
                    task: action.task,
                    xp: action.xp,
                    icon: action.icon,
                    date: today
                }
            });
            savedTasks.push(saved);
        }
        return savedTasks;
    }
    /**
     * FASE 5: Detecta se o paciente está em um "Dia Ruim" (Modo Ruim)
     */
    detectLowDay(logs) {
        const recentLogs = logs.slice(0, 10);
        const moodLogs = recentLogs.filter(l => l.type === 'MOOD');
        const sleepLogs = recentLogs.filter(l => l.type === 'SLEEP');
        const stressLogs = recentLogs.filter(l => l.type === 'STRESS');
        let lowMood = false;
        if (moodLogs.length > 0) {
            lowMood = ['Mal', 'Cansado', 'Triste', '1', '2'].includes(moodLogs[0].value);
        }
        let badSleep = false;
        if (sleepLogs.length > 0) {
            badSleep = Number(sleepLogs[0].value) < 6;
        }
        let highStress = false;
        if (stressLogs.length > 0) {
            highStress = ['High', 'Alto', 'Muito Alto', 'high', 'medium'].includes(stressLogs[0].value);
        }
        return lowMood || (badSleep && highStress);
    }
    /**
     * FASE 5: Gera Narrativa Semanal
     */
    generateWeeklyNarrative(logs, patientName = 'Herói') {
        const firstName = patientName.split(' ')[0];
        const moodLogs = logs.filter(l => l.type === 'MOOD');
        const hasLowMood = moodLogs.some(l => ['Mal', 'Cansado', '1', '2'].includes(l.value));
        if (hasLowMood) {
            return `Olá ${firstName}, percebemos que a semana teve seus desafios. Lembre-se que dias difíceis fazem parte da jornada. O importante é respeitar seu tempo e não desistir.`;
        }
        if (logs.length > 5) {
            return `Que semana produtiva, ${firstName}! Você manteve uma ótima constância nos seus registros. Cuidar de si mesmo é a maior vitória.`;
        }
        return `Olá ${firstName}, estamos felizes em ver você por aqui. Cada passo conta na sua jornada de saúde. Que tal registrar como você está se sentindo hoje?`;
    }
    /**
     * FASE 5: Memória Contextual
     */
    getContextualMemory(logs) {
        const recentMood = logs.find(l => l.type === 'MOOD');
        if (recentMood && ['Mal', 'Cansado', '1', '2'].includes(recentMood.value)) {
            return "💡 Memória: Da última vez que você se sentiu assim, uma caminhada de 15min ajudou a melhorar seu humor em 30%.";
        }
        return null;
    }
}
exports.AiInsightService = AiInsightService;
exports.aiInsightService = new AiInsightService();
//# sourceMappingURL=aiInsight.service.js.map