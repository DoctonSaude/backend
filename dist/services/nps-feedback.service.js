"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NPSFeedbackService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
class NPSFeedbackService {
    TAGS = {
        // Problemas
        BUG: 'Bug',
        USABILITY: 'Usabilidade-Confusa',
        PERFORMANCE: 'Performance-Lenta',
        SUPPORT: 'Suporte-Lento',
        PRICE: 'Preço-Caro',
        LOGIN_ISSUES: 'Problemas-Login',
        SYNC_ISSUES: 'Sincronização-Falha',
        // Sugestões
        FEATURE_DASHBOARD: 'Sugestão-Feature-Dashboard',
        FEATURE_CHALLENGES: 'Sugestão-Feature-Desafios',
        FEATURE_SOCIAL: 'Sugestão-Feature-Social',
        FEATURE_INTEGRATION: 'Sugestão-Integração',
        FEATURE_MOBILE: 'Sugestão-Mobile',
        FEATURE_ANALYTICS: 'Sugestão-Analytics',
        // Elogios
        PRAISE_CHALLENGES: 'Elogio-Desafios',
        PRAISE_GAMIFICATION: 'Elogio-Gamificação',
        PRAISE_UI: 'Elogio-Interface',
        PRAISE_SUPPORT: 'Elogio-Suporte',
        PRAISE_CONTENT: 'Elogio-Conteúdo',
        PRAISE_RESULTS: 'Elogio-Resultados'
    };
    /**
     * FASE 1: COLETA INTELIGENTE
     * Verifica se usuário é elegível para pesquisa NPS
     */
    async isEligibleForNPS(userId) {
        try {
            // Verificar se usuário tem mais de 30 dias
            const user = await this.getUserById(userId);
            const daysSinceSignup = this.getDaysSinceSignup(user.createdAt);
            if (daysSinceSignup < 30) {
                console.log(`❌ User ${userId} not eligible: only ${daysSinceSignup} days since signup`);
                return false;
            }
            // Verificar se já respondeu nos últimos 90 dias
            const lastResponse = await this.getLastNPSResponse(userId);
            if (lastResponse) {
                const daysSinceLastResponse = this.getDaysSince(lastResponse.timestamp);
                if (daysSinceLastResponse < 90) {
                    console.log(`❌ User ${userId} not eligible: responded ${daysSinceLastResponse} days ago`);
                    return false;
                }
            }
            console.log(`✅ User ${userId} eligible for NPS survey`);
            return true;
        }
        catch (error) {
            console.error('Erro ao verificar elegibilidade NPS:', error);
            return false;
        }
    }
    /**
     * Salva resposta NPS com análise automática
     */
    async saveNPSResponse(data) {
        try {
            const responsePartial = {
                userId: data.userId,
                userName: data.userName,
                userEmail: data.userEmail,
                planType: data.planType || 'Básico',
                daysSinceSignup: data.daysSinceSignup || 0,
                score: data.score,
                category: this.categorizeScore(data.score),
                qualitativeFeedback: data.qualitativeFeedback || '',
                tags: await this.autoTagFeedback(data.qualitativeFeedback || ''),
                triggerContext: data.triggerContext || 'manual',
                timestamp: new Date().toISOString(),
                processed: false
            };
            // Salvar no banco de dados via Prisma
            const saved = await prisma_1.default.nPSResponse.create({
                data: {
                    userId: responsePartial.userId,
                    userName: responsePartial.userName,
                    userEmail: responsePartial.userEmail,
                    planType: responsePartial.planType,
                    daysSinceSignup: responsePartial.daysSinceSignup,
                    score: responsePartial.score,
                    category: responsePartial.category,
                    qualitativeFeedback: responsePartial.qualitativeFeedback,
                    tags: responsePartial.tags,
                    triggerContext: responsePartial.triggerContext,
                    processed: responsePartial.processed,
                    timestamp: new Date(responsePartial.timestamp)
                }
            });
            // Mapear para interface NPSResponse (que tem string id e string timestamp na interface original, mas Prisma devolve Date e string)
            // Ajustando para retornar compatível
            const response = {
                ...responsePartial,
                id: saved.id,
                timestamp: saved.timestamp.toISOString()
            };
            // Notificar equipe se for detrator crítico
            if (response.category === 'DETRACTOR' && response.score <= 3) {
                await this.notifyTeamCriticalDetractor(response);
            }
            // Agendar análise se for cliente premium
            if (['Premium', 'Família'].includes(response.planType) && response.category === 'DETRACTOR') {
                await this.schedulePersonalOutreach(response);
            }
            console.log('📊 NPS Response saved:', {
                id: response.id,
                score: response.score,
                category: response.category,
                tags: response.tags
            });
            return response;
        }
        catch (error) {
            console.error('Erro ao salvar resposta NPS:', error);
            throw error;
        }
    }
    /**
     * FASE 2: ANÁLISE E SÍNTESE
     * Gera relatório quinzenal "Voz do Cliente"
     */
    async generateVoiceOfCustomerReport(days = 15) {
        try {
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const responses = await this.getNPSResponsesSince(startDate);
            const analytics = await this.calculateNPSAnalytics(responses);
            const insights = await this.extractKeyInsights(responses);
            const actions = await this.generateRecommendedActions(insights);
            const report = {
                reportId: `voc_${Date.now()}`,
                period: `${days} dias`,
                generatedAt: new Date().toISOString(),
                npsScore: analytics.npsScore,
                trend: analytics.trend > 0 ? 'Melhorando' : analytics.trend < 0 ? 'Piorando' : 'Estável',
                keyInsights: insights,
                recommendedActions: actions,
                roadmapInfluence: {
                    newItems: actions.filter(a => a.action.includes('Criar')).length,
                    priorityChanges: actions.filter(a => a.action.includes('Priorizar')).length,
                    bugFixes: actions.filter(a => a.action.includes('Corrigir')).length
                }
            };
            // Salvar relatório
            await this.saveReport(report);
            // Notificar equipe de liderança
            await this.notifyLeadershipTeam(report);
            console.log('📈 Voice of Customer report generated:', report.reportId);
            return report;
        }
        catch (error) {
            console.error('Erro ao gerar relatório Voz do Cliente:', error);
            throw error;
        }
    }
    /**
     * FASE 3: AÇÃO E INTEGRAÇÃO ROADMAP
     * Cria tarefas baseadas no feedback
     */
    async createRoadmapItems(report) {
        try {
            for (const action of report.recommendedActions) {
                if (action.priority === 'URGENT' || action.priority === 'HIGH') {
                    await this.createProjectTask({
                        title: action.action,
                        description: `Ação baseada na Voz do Cliente - Relatório ${report.reportId}`,
                        priority: action.priority,
                        assignee: action.owner,
                        labels: ['voice-of-customer', 'nps-driven'],
                        dueDate: this.calculateDueDate(action.priority),
                        source: 'NPS Feedback'
                    });
                }
            }
            console.log(`✅ ${report.recommendedActions.length} itens criados no roadmap`);
        }
        catch (error) {
            console.error('Erro ao criar itens do roadmap:', error);
            throw error;
        }
    }
    /**
     * FASE 4: FECHAMENTO DO LOOP
     * Comunica melhorias implementadas
     */
    async generateImprovementCommunication(implementedFeatures) {
        const communication = `
# 🎉 Vocês Pediram, Nós Fizemos!

Baseado no feedback valioso de vocês, implementamos as seguintes melhorias:

${implementedFeatures.map(feature => `✅ **${feature}**`).join('\n')}

📢 **Continuem enviando feedback!** Cada sugestão é analisada e pode virar realidade.

📊 **Seu NPS importa:** Suas avaliações nos ajudam a priorizar o que realmente importa para vocês.

---
*Equipe Gestão Saúde - Construindo juntos o futuro da saúde digital*
    `;
        return communication.trim();
    }
    // MÉTODOS AUXILIARES
    categorizeScore(score) {
        if (score >= 9)
            return 'PROMOTER';
        if (score >= 7)
            return 'NEUTRAL';
        return 'DETRACTOR';
    }
    async autoTagFeedback(feedback) {
        const tags = [];
        const text = feedback.toLowerCase();
        // Análise de sentimento e palavras-chave
        if (text.includes('bug') || text.includes('erro') || text.includes('problema')) {
            tags.push(this.TAGS.BUG);
        }
        if (text.includes('lento') || text.includes('demora') || text.includes('travando')) {
            tags.push(this.TAGS.PERFORMANCE);
        }
        if (text.includes('confuso') || text.includes('difícil') || text.includes('complicado')) {
            tags.push(this.TAGS.USABILITY);
        }
        if (text.includes('caro') || text.includes('preço') || text.includes('valor')) {
            tags.push(this.TAGS.PRICE);
        }
        if (text.includes('suporte') || text.includes('atendimento') || text.includes('ajuda')) {
            tags.push(this.TAGS.SUPPORT);
        }
        if (text.includes('dashboard') || text.includes('painel')) {
            tags.push(this.TAGS.FEATURE_DASHBOARD);
        }
        if (text.includes('desafio') || text.includes('gamificação')) {
            if (text.includes('gosto') || text.includes('amo') || text.includes('ótimo')) {
                tags.push(this.TAGS.PRAISE_CHALLENGES);
            }
            else {
                tags.push(this.TAGS.FEATURE_CHALLENGES);
            }
        }
        return tags;
    }
    async extractKeyInsights(responses) {
        const detractors = responses.filter(r => r.category === 'DETRACTOR');
        const promoters = responses.filter(r => r.category === 'PROMOTER');
        // Análise de temas mais frequentes
        const detractorThemes = this.getTopThemes(detractors);
        const promoterThemes = this.getTopThemes(promoters);
        // Identificar issues urgentes (score <= 3)
        const urgentIssues = detractors
            .filter(r => r.score <= 3)
            .map(r => r.tags)
            .flat()
            .reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {});
        const neutrals = responses.filter(r => r.category === 'NEUTRAL');
        return {
            topDetractorThemes: detractorThemes.slice(0, 3),
            topPromoterThemes: promoterThemes.slice(0, 3),
            urgentIssues: Object.keys(urgentIssues).slice(0, 3),
            featureRequests: this.extractFeatureRequests(responses).slice(0, 2),
            detractorCount: detractors.length,
            promoterCount: promoters.length,
            neutralCount: neutrals.length
        };
    }
    getTopThemes(responses) {
        const themes = responses.map(r => r.tags).flat();
        const counts = themes.reduce((acc, theme) => {
            acc[theme] = (acc[theme] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([theme]) => theme);
    }
    extractFeatureRequests(responses) {
        const requests = responses
            .map(r => r.tags)
            .flat()
            .filter(tag => tag.startsWith('Sugestão-'));
        const counts = requests.reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([tag]) => tag);
    }
    async generateRecommendedActions(insights) {
        const actions = [];
        // Ações baseadas em temas de detratores
        for (const theme of insights.topDetractorThemes) {
            if (theme.includes('Bug')) {
                actions.push({
                    priority: 'URGENT',
                    action: `Corrigir bugs relacionados a: ${theme}`,
                    owner: 'Head de Engenharia',
                    estimatedImpact: 'Alto - Redução de detratores'
                });
            }
            if (theme.includes('Usabilidade')) {
                actions.push({
                    priority: 'HIGH',
                    action: `Melhorar UX: ${theme}`,
                    owner: 'Head de Produto',
                    estimatedImpact: 'Médio - Melhoria experiência'
                });
            }
        }
        // Ações baseadas em feature requests
        for (const request of insights.featureRequests) {
            actions.push({
                priority: 'MEDIUM',
                action: `Analisar viabilidade: ${request}`,
                owner: 'Head de Produto',
                estimatedImpact: 'Médio - Satisfação usuários'
            });
        }
        return actions;
    }
    // MÉTODOS ATUALIZADOS PARA USAR PRISMA
    async getUserById(userId) {
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId }
        });
        if (!user)
            throw new Error('Usuário não encontrado');
        return {
            id: user.id,
            createdAt: user.createdAt,
            name: user.name,
            email: user.email,
            planType: user.role || 'Básico',
        };
    }
    getDaysSinceSignup(createdAt) {
        return Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
    }
    getDaysSince(timestamp) {
        return Math.floor((Date.now() - new Date(timestamp).getTime()) / (24 * 60 * 60 * 1000));
    }
    async getLastNPSResponse(userId) {
        const last = await prisma_1.default.nPSResponse.findFirst({
            where: { userId },
            orderBy: { timestamp: 'desc' }
        });
        if (!last)
            return null;
        return {
            ...last,
            tags: last.tags,
            category: last.category,
            qualitativeFeedback: last.qualitativeFeedback || '',
            timestamp: last.timestamp.toISOString(),
            actionTaken: last.actionTaken || undefined
        };
    }
    async saveToDatabase(response) {
        // Deprecated method called by deprecated flow, but replaced by saveNPSResponse specific logic.
        // Keeping empty or just logging
        console.log('Legacy saveToDatabase called (noop in Prisma version)');
    }
    async notifyTeamCriticalDetractor(response) {
        console.log('🚨 Critical detractor alert:', response.userName, response.score);
        // Implementar notificação real (Slack, email, etc.)
    }
    async schedulePersonalOutreach(response) {
        console.log('📞 Personal outreach scheduled for:', response.userName);
        // Implementar agendamento real
    }
    async getNPSResponsesSince(date) {
        const data = await prisma_1.default.nPSResponse.findMany({
            where: {
                timestamp: {
                    gte: date
                }
            },
            orderBy: { timestamp: 'desc' }
        });
        return data.map((d) => ({
            ...d,
            tags: d.tags,
            category: d.category,
            qualitativeFeedback: d.qualitativeFeedback || '',
            timestamp: d.timestamp.toISOString(),
            actionTaken: d.actionTaken || undefined
        }));
    }
    async calculateNPSAnalytics(responses) {
        const promoters = responses.filter(r => r.category === 'PROMOTER').length;
        const detractors = responses.filter(r => r.category === 'DETRACTOR').length;
        const total = responses.length;
        const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
        return {
            period: '15 dias',
            totalResponses: total,
            npsScore,
            trend: 5, // Mock
            distribution: {
                promoters,
                neutrals: responses.filter(r => r.category === 'NEUTRAL').length,
                detractors
            },
            topDetractorThemes: [],
            topPromoterThemes: [],
            topFeatureRequests: [],
            responseRate: 23.5 // Mock
        };
    }
    async saveReport(report) {
        console.log('📊 Voice of Customer report saved:', report.reportId);
        // Can allow saving report to DB if I add Report model or reuse existing Report model
    }
    async notifyLeadershipTeam(report) {
        console.log('📧 Leadership team notified about new VoC report');
    }
    async createProjectTask(task) {
        console.log('📋 Project task created:', task.title);
    }
    calculateDueDate(priority) {
        const days = priority === 'URGENT' ? 7 : priority === 'HIGH' ? 14 : 30;
        return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }
}
exports.NPSFeedbackService = NPSFeedbackService;
exports.default = NPSFeedbackService;
//# sourceMappingURL=nps-feedback.service.js.map