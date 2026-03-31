import prisma from '../lib/prisma.js';
import { engagementService } from './engagement.service.js';
import { healthJourneyService } from './health-journey.service.js';
import openaiService from './ai/openai.service.js';

export class HealthIntentService {
    /**
     * Tenta classificar a intenção via IA (LLM)
     */
    async classifyWithAI(term: string) {
        if (!process.env.OPENAI_API_KEY)
            return null;

        try {
            const prompt = `Classifique o termo de busca de saúde: "${term}"
            Retorne APENAS um JSON no formato:
            {
                "intent": "tratamento_agudo" | "tratamento_continuo" | "diagnostico" | "consulta" | "prevencao",
                "confidence": 0.0 a 1.0,
                "suggestedServices": ["pharmacy", "telemedicine", "exams", "partner", "wellness"]
            }
            
            Regras de Intenção:
            - tratamento_agudo: sintomas súbitos (dor, febre, gripe).
            - tratamento_continuo: doenças crônicas ou uso recorrente de remédios.
            - diagnostico: busca por exames ou laboratórios.
            - consulta: busca por médicos ou especialistas.
            - prevencao: check-ups ou bem-estar.`;

            const response = await (openaiService as any).createChatCompletion([
                { role: 'system', content: 'Você é um assistente médico inteligente da Docton Saúde.' },
                { role: 'user', content: prompt }
            ], { temperature: 0.3 });

            const result = JSON.parse(response);
            return {
                intent: result.intent,
                confidence: result.confidence,
                context: {
                    term,
                    suggestedServices: result.suggestedServices
                }
            };
        }
        catch (error) {
            console.error('Erro na classificação por IA:', error);
            return null;
        }
    }

    /**
     * Classifica uma intenção baseada em um termo de busca ou ação
     * Implementação inicial baseada em regras (Rule-based)
     */
    classifyIntent(term: string) {
        const lowTerm = term.toLowerCase();

        const acuteKeywords = ['dor', 'febre', 'gripe', 'tosse', 'vômito'];
        if (acuteKeywords.some((k: string) => lowTerm.includes(k))) {
            return {
                intent: 'tratamento_agudo',
                confidence: 0.98,
                context: {
                    term,
                    suggestedServices: ['pharmacy', 'telemedicine']
                }
            };
        }

        const diagKeywords = ['exame', 'laboratório', 'sangue', 'checkup'];
        if (diagKeywords.some((k: string) => lowTerm.includes(k))) {
            return {
                intent: 'diagnostico',
                confidence: 0.92,
                context: {
                    term,
                    suggestedServices: ['exams', 'partner']
                }
            };
        }

        const consultKeywords = ['médico', 'especialista', 'consulta', 'pediatra'];
        if (consultKeywords.some((k: string) => lowTerm.includes(k))) {
            return {
                intent: 'consulta',
                confidence: 0.90,
                context: {
                    term,
                    suggestedServices: ['partner', 'telemedicine']
                }
            };
        }

        // Fallback: PREVENÇÃO / BEM-ESTAR
        return {
            intent: 'prevencao',
            confidence: 0.5,
            context: {
                term,
                suggestedServices: ['wellness', 'checkup']
            }
        };
    }

    /**
     * Processa a intenção e orquestra as ações (salva no banco + gatilhos)
     */
    async processIntent(patientId: string, term: string, eventId?: string) {
        // Prioridade para regras se houver termo agudo óbvio
        let classification = this.classifyIntent(term);

        // Se as regras não tiverem certeza (fallback para prevencao), tenta IA
        if (classification.intent === 'prevencao') {
            const aiClassification = await this.classifyWithAI(term);
            if (aiClassification && aiClassification.confidence > 0.6) {
                classification = aiClassification;
            }
        }

        // 1. Salvar intenção detectada
        const intent = await (prisma as any).healthIntent.create({
            data: {
                patientId,
                eventId,
                intent: classification.intent,
                confidence: classification.confidence,
                context: classification.context as any
            }
        });

        // 2. Disparar lógica de jornada
        if (classification.intent === 'tratamento_agudo') {
            await (healthJourneyService as any).startAcuteJourney(patientId, term);

            const patient = await (prisma as any).patient.findUnique({
                where: { id: patientId },
                select: { personId: true }
            });

            if (patient?.personId) {
                await (engagementService as any).createNotification({
                    personId: patient.personId,
                    title: 'Cuidado Docton',
                    message: `Vimos que você buscou por "${term}". Deseja falar com um médico agora por telemedicina?`,
                    type: 'HEALTH_JOURNEY_ACUTE',
                    priority: 'high'
                });
            }
        }

        return intent;
    }
}

export const healthIntentService = new HealthIntentService();
