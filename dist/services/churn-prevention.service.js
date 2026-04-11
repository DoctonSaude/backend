"use strict";
/**
 * SERVIÇO DE PREVENÇÃO DE CHURN - ESTRATÉGIA IMUNOLOGIA DO CLIENTE
 * Implementa as 3 fases: Diagnóstico, Prevenção e Tratamento
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChurnPreventionService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const logger_1 = require("../lib/logger");
class ChurnPreventionService {
    // FASE 1: DIAGNÓSTICO
    /**
     * Salva dados do Exit Survey quando usuário cancela
     */
    async saveExitSurvey(data) {
        try {
            // Salvar no banco de dados
            logger_1.logger.info('📊 Exit Survey Saved:', {
                userId: data.userId,
                primaryReason: data.primaryReason,
                likelihood: data.likelihood,
                timestamp: data.timestamp
            });
            // Enviar para analytics
            await this.sendToAnalytics('exit_survey_completed', data);
            // Notificar equipe se motivo crítico
            if (['technical_issues', 'competitor'].includes(data.primaryReason)) {
                await this.notifyProductTeam(data);
            }
            // Agendar follow-up se likelihood > 3
            if (data.likelihood > 3) {
                await this.scheduleWinBackCampaign(data.userId, data.likelihood);
            }
        }
        catch (error) {
            logger_1.logger.error('Erro ao salvar Exit Survey:', error);
            throw error;
        }
    }
    /**
     * Analisa comportamento pré-churn dos últimos 30 dias
     */
    async analyzePreChurnBehavior(userId) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return {
            loginFrequency: await this.getLoginFrequency(userId, thirtyDaysAgo),
            challengeParticipation: await this.getChallengeParticipation(userId, thirtyDaysAgo),
            featureUsage: await this.getFeatureUsage(userId, thirtyDaysAgo),
            supportTickets: await this.getSupportTickets(userId, thirtyDaysAgo),
            lastActiveDate: await this.getLastActiveDate(userId),
            warningSignals: await this.identifyWarningSignals(userId)
        };
    }
    // FASE 2: PREVENÇÃO
    /**
     * Calcula Health Score do usuário (0-100)
     */
    async calculateHealthScore(userId) {
        const factors = {
            loginFrequency: await this.calculateLoginFrequency(userId),
            challengeParticipation: await this.calculateChallengeParticipation(userId),
            featureUsage: await this.calculateFeatureUsage(userId),
            socialEngagement: await this.calculateSocialEngagement(userId),
            goalProgress: await this.calculateGoalProgress(userId)
        };
        // Peso dos fatores
        const weights = {
            loginFrequency: 0.25,
            challengeParticipation: 0.30,
            featureUsage: 0.20,
            socialEngagement: 0.15,
            goalProgress: 0.10
        };
        const score = Math.round(factors.loginFrequency * weights.loginFrequency +
            factors.challengeParticipation * weights.challengeParticipation +
            factors.featureUsage * weights.featureUsage +
            factors.socialEngagement * weights.socialEngagement +
            factors.goalProgress * weights.goalProgress);
        const riskLevel = this.determineRiskLevel(score);
        const recommendations = await this.generateRecommendations(factors, riskLevel);
        return {
            userId,
            score,
            factors,
            riskLevel,
            lastCalculated: new Date().toISOString(),
            recommendations
        };
    }
    /**
     * Identifica usuários em risco de churn
     */
    async identifyAtRiskUsers() {
        const users = await this.getAllActiveUsers();
        const atRiskUsers = [];
        for (const user of users) {
            const healthScore = await this.calculateHealthScore(user.id);
            if (healthScore.riskLevel === 'HIGH' || healthScore.riskLevel === 'CRITICAL') {
                const daysSinceLastLogin = await this.getDaysSinceLastLogin(user.id);
                const interventionsSent = await this.getInterventionCount(user.id);
                atRiskUsers.push({
                    userId: user.id,
                    userName: user.name,
                    email: user.email,
                    planName: user.planName || 'Básico',
                    healthScore: healthScore.score,
                    riskLevel: healthScore.riskLevel,
                    daysSinceLastLogin,
                    interventionsSent,
                    lastInterventionDate: await this.getLastInterventionDate(user.id),
                    predictedChurnDate: this.predictChurnDate(healthScore.score, daysSinceLastLogin)
                });
            }
        }
        return atRiskUsers.sort((a, b) => a.healthScore - b.healthScore);
    }
    /**
     * Executa campanhas de reativação para usuários inativos
     */
    async executeReactivationCampaigns() {
        const inactiveUsers = await this.getInactiveUsers(21); // 21+ dias inativos
        for (const user of inactiveUsers) {
            const healthScore = await this.calculateHealthScore(user.id);
            const personalizedMessage = await this.generatePersonalizedMessage(user, healthScore);
            await this.sendReactivationEmail(user.email, personalizedMessage);
            await this.sendPushNotification(user.id, personalizedMessage.push);
            // Log da intervenção
            await this.logIntervention(user.id, 'reactivation_campaign', personalizedMessage);
        }
    }
    // FASE 3: TRATAMENTO
    /**
     * Processo de resgate no momento do cancelamento
     */
    async executeRetentionFlow(userId, reason) {
        const user = await this.getUserById(userId);
        const healthScore = await this.calculateHealthScore(userId);
        // Estratégia baseada no motivo e perfil do usuário
        const retentionOffer = await this.generateRetentionOffer(user, reason, healthScore);
        return {
            userId,
            offers: retentionOffer,
            alternatives: [
                {
                    type: 'discount',
                    description: 'Desconto de 50% por 3 meses',
                    value: retentionOffer.discount
                },
                {
                    type: 'pause',
                    description: 'Pausar assinatura por até 3 meses',
                    value: 'pause_3_months'
                },
                {
                    type: 'downgrade',
                    description: 'Mudar para plano Básico (gratuito)',
                    value: 'downgrade_basic'
                }
            ],
            personalizedMessage: await this.generateRetentionMessage(user, reason)
        };
    }
    /**
     * Executa intervenções proativas baseadas no Health Score
     */
    async executeProactiveInterventions() {
        const atRiskUsers = await this.identifyAtRiskUsers();
        for (const user of atRiskUsers) {
            // Evitar spam - máximo 1 intervenção por semana
            if (user.interventionsSent > 0 &&
                user.lastInterventionDate &&
                this.daysSince(user.lastInterventionDate) < 7) {
                continue;
            }
            const intervention = await this.selectIntervention(user);
            await this.executeIntervention(user, intervention);
        }
    }
    // MÉTODOS AUXILIARES
    // TODO: Substituir mocks por implementações reais consultando o banco de dados.
    // Tabelas sugeridas: PointsHistory (para logins/ações), PatientChallenge (para desafios), Patient (para lastActiveDate).
    async calculateLoginFrequency(userId) {
        // Mock: Calcular frequência de login dos últimos 30 dias
        // TODO: Implementar consulta real: COUNT(PointsHistory) onde action='LOGIN' e date > 30d
        const logins = await this.getLoginCount(userId, 30);
        return Math.min(100, (logins / 20) * 100); // 20 logins = 100%
    }
    async calculateChallengeParticipation(userId) {
        // Mock: Participação em desafios
        // TODO: Implementar consulta real na tabela PatientChallenge
        const participation = await this.getChallengeParticipationRate(userId);
        return participation * 100;
    }
    async calculateFeatureUsage(userId) {
        // Mock: Uso de funcionalidades principais
        const featuresUsed = await this.getUniqueFeatureUsage(userId);
        const totalFeatures = 10; // Total de features principais
        return (featuresUsed / totalFeatures) * 100;
    }
    async calculateSocialEngagement(userId) {
        // Mock: Engajamento social (compartilhamentos, grupos, etc.)
        const socialActions = await this.getSocialActionCount(userId);
        return Math.min(100, socialActions * 10);
    }
    async calculateGoalProgress(userId) {
        // Mock: Progresso em metas definidas
        const goalCompletion = await this.getGoalCompletionRate(userId);
        return goalCompletion * 100;
    }
    determineRiskLevel(score) {
        if (score >= 80)
            return 'LOW';
        if (score >= 60)
            return 'MEDIUM';
        if (score >= 40)
            return 'HIGH';
        return 'CRITICAL';
    }
    async generateRecommendations(factors, riskLevel) {
        const recommendations = [];
        if (factors.loginFrequency < 50) {
            recommendations.push('Enviar lembretes de login personalizados');
        }
        if (factors.challengeParticipation < 40) {
            recommendations.push('Sugerir desafios baseados no perfil do usuário');
        }
        if (factors.featureUsage < 30) {
            recommendations.push('Criar tutorial das funcionalidades não utilizadas');
        }
        if (riskLevel === 'CRITICAL') {
            recommendations.push('Intervenção imediata - ligação do Customer Success');
        }
        return recommendations;
    }
    predictChurnDate(healthScore, daysSinceLastLogin) {
        // Algoritmo simples de predição
        let daysUntilChurn = 30;
        if (healthScore < 20)
            daysUntilChurn = 7;
        else if (healthScore < 40)
            daysUntilChurn = 14;
        else if (healthScore < 60)
            daysUntilChurn = 21;
        // Ajustar baseado na inatividade
        daysUntilChurn = Math.max(1, daysUntilChurn - daysSinceLastLogin);
        const predictedDate = new Date(Date.now() + daysUntilChurn * 24 * 60 * 60 * 1000);
        return predictedDate.toISOString();
    }
    async generatePersonalizedMessage(user, healthScore) {
        // Personalizar mensagem baseada no perfil e comportamento
        const challenges = await this.getRecommendedChallenges(user.id);
        return {
            email: {
                subject: `${user.name}, temos um novo desafio perfeito para você! 🎯`,
                body: `Olá ${user.name}! Notamos que você não tem acessado a Gestão Saúde. Que tal voltar com este desafio de ${challenges[0]?.name}? É perfeito para seu perfil!`
            },
            push: {
                title: 'Novo desafio disponível!',
                body: `${challenges[0]?.name} - Perfeito para você!`
            }
        };
    }
    async generateRetentionOffer(user, reason, healthScore) {
        let discount = 0;
        let duration = 0;
        // Personalizar oferta baseada no motivo
        switch (reason) {
            case 'price':
                discount = 50;
                duration = 3;
                break;
            case 'lack_of_use':
                discount = 30;
                duration = 2;
                break;
            case 'technical_issues':
                discount = 25;
                duration = 1;
                break;
            default:
                discount = 20;
                duration = 1;
        }
        // Ajustar baseado no Health Score
        if (healthScore.score > 60) {
            discount += 10; // Usuário engajado merece oferta melhor
        }
        return {
            discount: Math.min(70, discount),
            duration,
            personalizedReason: this.getPersonalizedRetentionReason(reason)
        };
    }
    getPersonalizedRetentionReason(reason) {
        const messages = {
            price: 'Entendemos que o preço é importante. Que tal um desconto especial?',
            lack_of_use: 'Vamos te ajudar a criar o hábito! Aceite este desconto e vamos juntos.',
            technical_issues: 'Desculpe pelos problemas! Vamos resolver e dar um desconto.',
            goal_achieved: 'Parabéns pelo objetivo! Que tal definir uma nova meta conosco?',
            competitor: 'Antes de ir, veja o que preparamos especialmente para você.',
            life_change: 'Entendemos que a vida muda. Que tal pausar ao invés de cancelar?'
        };
        const key = reason in messages ? reason : 'price';
        return messages[key] || 'Não queremos te perder! Vamos encontrar uma solução juntos.';
    }
    /**
     * Gera uma mensagem de retenção amigável para exibição no fluxo de cancelamento
     */
    async generateRetentionMessage(user, reason) {
        const base = this.getPersonalizedRetentionReason(reason);
        return `Olá ${user.name || 'cliente'}, ${base}`;
    }
    // Mock methods para simular dados
    async getLoginCount(userId, days) {
        return Math.floor(Math.random() * 25) + 5; // 5-30 logins
    }
    async getChallengeParticipationRate(userId) {
        return Math.random() * 0.8 + 0.1; // 10-90%
    }
    async getUniqueFeatureUsage(userId) {
        return Math.floor(Math.random() * 8) + 2; // 2-10 features
    }
    async getSocialActionCount(userId) {
        return Math.floor(Math.random() * 10); // 0-10 ações sociais
    }
    async getGoalCompletionRate(userId) {
        return Math.random() * 0.7 + 0.2; // 20-90%
    }
    /**
     * Métodos auxiliares usados pela análise de comportamento pré-churn
     * (implementações mockadas para evitar erros de build)
     */
    async getLoginFrequency(userId, since) {
        void userId;
        void since;
        return Math.floor(Math.random() * 100);
    }
    async getChallengeParticipation(userId, since) {
        void userId;
        void since;
        return Math.floor(Math.random() * 100);
    }
    async getFeatureUsage(userId, since) {
        void userId;
        void since;
        return Math.floor(Math.random() * 100);
    }
    async getSupportTickets(userId, since) {
        void userId;
        void since;
        return Math.floor(Math.random() * 5);
    }
    async getLastActiveDate(userId) {
        void userId;
        const daysAgo = Math.floor(Math.random() * 30);
        return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    }
    async identifyWarningSignals(userId) {
        void userId;
        const signals = [
            'low_login_frequency',
            'no_challenge_participation',
            'low_feature_usage',
            'recent_support_ticket'
        ];
        return signals.filter(() => Math.random() > 0.5);
    }
    async getAllActiveUsers() {
        const users = await prisma_1.default.user.findMany({
            where: {
                OR: [
                    { role: 'PATIENT' },
                    { role: 'PARTNER' } // Incluir parceiros se relevante para churn
                ],
                // Considerar "Ativo" quem tem login recente ou assinatura ativa?
                // Por simplicidade, todos os usuários não deletados.
            },
            include: {
                patient: {
                    include: {
                        subscriptions: {
                            where: { status: 'ACTIVE' },
                            include: { plan: true }
                        }
                    }
                }
            }
        });
        return users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            planName: u.patient?.subscriptions?.[0]?.plan?.name || 'Básico'
        }));
    }
    async getDaysSinceLastLogin(userId) {
        return Math.floor(Math.random() * 30); // 0-30 dias
    }
    async getInterventionCount(userId) {
        return Math.floor(Math.random() * 3); // 0-3 intervenções
    }
    async getLastInterventionDate(userId) {
        const random = Math.random();
        if (random > 0.5) {
            const date = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000);
            return date.toISOString();
        }
        return undefined;
    }
    daysSince(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        return Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
    }
    async sendToAnalytics(event, data) {
        logger_1.logger.info(`📊 Analytics Event: ${event}`, data);
    }
    async notifyProductTeam(data) {
        logger_1.logger.warn('🚨 Product Team Notification:', data.primaryReason);
    }
    async scheduleWinBackCampaign(userId, likelihood) {
        logger_1.logger.info(`📧 Win-back campaign scheduled for user ${userId} (likelihood: ${likelihood})`);
    }
    async getUserById(userId) {
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            include: {
                patient: {
                    include: {
                        subscriptions: {
                            include: { plan: true },
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });
        if (!user)
            throw new Error('User not found');
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            planName: user.patient?.subscriptions?.[0]?.plan?.name || 'Básico'
        };
    }
    async getInactiveUsers(days) {
        return [
            { id: '1', name: 'Usuário Inativo 1', email: 'inativo1@email.com' },
            { id: '2', name: 'Usuário Inativo 2', email: 'inativo2@email.com' }
        ];
    }
    async sendReactivationEmail(email, message) {
        logger_1.logger.info(`📧 Reactivation email sent to ${email}`);
    }
    async sendPushNotification(userId, message) {
        logger_1.logger.info(`📱 Push notification sent to user ${userId}`);
    }
    async logIntervention(userId, type, data) {
        logger_1.logger.info(`📝 Intervention logged: ${type} for user ${userId}`);
    }
    async selectIntervention(user) {
        if (user.riskLevel === 'CRITICAL')
            return 'personal_call';
        if (user.riskLevel === 'HIGH')
            return 'personal_email';
        return 'automated_campaign';
    }
    async executeIntervention(user, intervention) {
        logger_1.logger.info(`🎯 Executing ${intervention} for user ${user.userName}`);
    }
    async getRecommendedChallenges(userId) {
        return [
            { name: 'Hidratação Diária', type: 'health' },
            { name: '10 Mil Passos', type: 'fitness' }
        ];
    }
}
exports.ChurnPreventionService = ChurnPreventionService;
exports.default = ChurnPreventionService;
//# sourceMappingURL=churn-prevention.service.js.map