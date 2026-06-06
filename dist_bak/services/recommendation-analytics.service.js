"use strict";
/**
 * PROJETO CÉREBRO - ANALYTICS E MÉTRICAS
 * Sistema de tracking e análise de performance das recomendações
 * Métricas de sucesso para validar efetividade da personalização
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationAnalyticsService = void 0;
class RecommendationAnalyticsService {
    /**
     * Registra interação do usuário com recomendação
     */
    async logInteraction(data) {
        const event = {
            id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...data
        };
        // Salvar no banco de dados
        await this.saveInteractionEvent(event);
        // Processar em tempo real para métricas críticas
        await this.processRealTimeMetrics(event);
        console.log(`📊 Interaction logged: ${event.interaction_type} on ${event.content_id} by ${event.user_id}`);
    }
    /**
     * Calcula métricas de performance das recomendações
     */
    async calculateMetrics(startDate, endDate, filters) {
        const interactions = await this.getInteractions(startDate, endDate, filters);
        // Agrupar por tipo de interação
        const views = interactions.filter(i => i.interaction_type === 'view');
        const clicks = interactions.filter(i => i.interaction_type === 'click');
        const completions = interactions.filter(i => i.interaction_type === 'complete');
        // Calcular métricas principais
        const uniqueUsers = new Set(interactions.map(i => i.user_id)).size;
        const usersWhoClicked = new Set(clicks.map(i => i.user_id)).size;
        const usersWhoCompleted = new Set(completions.map(i => i.user_id)).size;
        const metrics = {
            // KPIs principais
            adoption_rate: uniqueUsers > 0 ? (usersWhoClicked / uniqueUsers) * 100 : 0,
            conversion_rate: clicks.length > 0 ? (completions.length / clicks.length) * 100 : 0,
            retention_impact: await this.calculateRetentionImpact(startDate, endDate, filters),
            // Performance
            click_through_rate: views.length > 0 ? (clicks.length / views.length) * 100 : 0,
            completion_rate: clicks.length > 0 ? (completions.length / clicks.length) * 100 : 0,
            avg_position_clicked: this.calculateAveragePosition(clicks),
            // Qualidade
            user_satisfaction: await this.calculateUserSatisfaction(completions),
            diversity_score: this.calculateDiversityScore(interactions),
            novelty_score: await this.calculateNoveltyScore(interactions),
            // Negócio
            engagement_lift: await this.calculateEngagementLift(startDate, endDate, filters),
            session_duration_impact: await this.calculateSessionImpact(startDate, endDate, filters),
            feature_adoption: await this.calculateFeatureAdoption(startDate, endDate, filters)
        };
        return metrics;
    }
    /**
     * Executa teste A/B entre diferentes estratégias de recomendação
     */
    async runABTest(testConfig) {
        const testId = `ab_test_${Date.now()}`;
        const startDate = new Date().toISOString();
        const endDate = new Date(Date.now() + testConfig.duration_days * 24 * 60 * 60 * 1000).toISOString();
        const abTest = {
            test_id: testId,
            name: testConfig.name,
            description: testConfig.description,
            start_date: startDate,
            end_date: endDate,
            status: 'running',
            control_strategy: testConfig.control_strategy,
            treatment_strategy: testConfig.treatment_strategy,
            traffic_split: testConfig.traffic_split,
            success_metric: testConfig.success_metric,
            minimum_effect_size: testConfig.minimum_effect_size
        };
        await this.saveABTest(abTest);
        console.log(`🧪 A/B Test started: ${testConfig.name} (${testId})`);
        return testId;
    }
    /**
     * Analisa resultados de teste A/B
     */
    async analyzeABTest(testId) {
        const test = await this.getABTest(testId);
        if (!test) {
            throw new Error(`A/B Test ${testId} not found`);
        }
        // Buscar métricas para cada variante
        const controlMetrics = await this.calculateMetrics(test.start_date, test.end_date, { engine_version: test.control_strategy });
        const treatmentMetrics = await this.calculateMetrics(test.start_date, test.end_date, { engine_version: test.treatment_strategy });
        // Calcular significância estatística
        const { significance, confidence, winner } = this.calculateStatisticalSignificance(controlMetrics, treatmentMetrics, test.success_metric, test.minimum_effect_size);
        const result = {
            test_id: testId,
            name: test.name,
            description: test.description,
            start_date: test.start_date,
            end_date: test.end_date,
            status: test.status,
            variants: {
                control: {
                    name: 'Controle',
                    description: test.control_strategy,
                    users: await this.countTestUsers(testId, 'control'),
                    metrics: controlMetrics
                },
                treatment: {
                    name: 'Tratamento',
                    description: test.treatment_strategy,
                    users: await this.countTestUsers(testId, 'treatment'),
                    metrics: treatmentMetrics
                }
            },
            statistical_significance: significance,
            winner,
            confidence_level: confidence
        };
        return result;
    }
    /**
     * Gera relatório de performance das recomendações
     */
    async generatePerformanceReport(startDate, endDate) {
        const overallMetrics = await this.calculateMetrics(startDate, endDate);
        // Métricas por contexto
        const contexts = ['home', 'post_challenge', 'discover'];
        const byContext = {};
        for (const context of contexts) {
            byContext[context] = await this.calculateMetrics(startDate, endDate, { context });
        }
        // Métricas por segmento de usuário
        const segments = await this.getUserSegments();
        const byUserSegment = {};
        for (const segment of segments) {
            byUserSegment[segment] = await this.calculateMetrics(startDate, endDate, { user_segment: segment });
        }
        // Performance das regras
        const topRules = await this.getTopPerformingRules(startDate, endDate);
        // Insights de conteúdo
        const contentInsights = await this.getContentInsights(startDate, endDate);
        // Gerar recomendações de melhoria
        const recommendations = this.generateRecommendations(overallMetrics, byContext, byUserSegment);
        return {
            period: `${startDate} to ${endDate}`,
            overall_metrics: overallMetrics,
            by_context: byContext,
            by_user_segment: byUserSegment,
            top_performing_rules: topRules,
            content_insights: contentInsights,
            recommendations
        };
    }
    /**
     * Monitora métricas em tempo real
     */
    async getRealtimeMetrics() {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const recentInteractions = await this.getInteractions(oneHourAgo.toISOString(), now.toISOString());
        const views = recentInteractions.filter(i => i.interaction_type === 'view');
        const clicks = recentInteractions.filter(i => i.interaction_type === 'click');
        return {
            active_users: new Set(recentInteractions.map(i => i.user_id)).size,
            recommendations_served: views.length,
            current_ctr: views.length > 0 ? (clicks.length / views.length) * 100 : 0,
            avg_response_time: await this.getAverageResponseTime(),
            error_rate: await this.getErrorRate(),
            top_content: this.getTopContent(recentInteractions)
        };
    }
    // MÉTODOS AUXILIARES
    calculateAveragePosition(clicks) {
        if (clicks.length === 0)
            return 0;
        const totalPosition = clicks.reduce((sum, click) => sum + click.position, 0);
        return totalPosition / clicks.length;
    }
    calculateDiversityScore(interactions) {
        const contentTypes = new Set(interactions.map(i => i.content_type)).size;
        const totalInteractions = interactions.length;
        // Score baseado na diversidade de tipos de conteúdo
        return totalInteractions > 0 ? (contentTypes / Math.min(totalInteractions, 10)) * 100 : 0;
    }
    async calculateNoveltyScore(interactions) {
        // Mock - implementar cálculo real baseado no histórico do usuário
        return 75; // 75% de conteúdo novo
    }
    async calculateRetentionImpact(startDate, endDate, filters) {
        // Mock - implementar cálculo real de impacto na retenção
        return {
            day_7: 85.2,
            day_30: 72.8,
            day_90: 64.5
        };
    }
    async calculateUserSatisfaction(completions) {
        // Mock - implementar cálculo baseado em ratings/feedback
        return 4.3; // Rating médio de 1-5
    }
    async calculateEngagementLift(startDate, endDate, filters) {
        // Mock - implementar comparação com baseline
        return 23.5; // 23.5% de aumento no engajamento
    }
    async calculateSessionImpact(startDate, endDate, filters) {
        // Mock - implementar cálculo de impacto na duração da sessão
        return 18.2; // 18.2% de aumento na duração
    }
    async calculateFeatureAdoption(startDate, endDate, filters) {
        // Mock - implementar cálculo de adoção de funcionalidades
        return 34.7; // 34.7% dos usuários adotam funcionalidades recomendadas
    }
    calculateStatisticalSignificance(controlMetrics, treatmentMetrics, successMetric, minimumEffectSize) {
        const controlValue = controlMetrics[successMetric];
        const treatmentValue = treatmentMetrics[successMetric];
        const effectSize = ((treatmentValue - controlValue) / controlValue) * 100;
        // Mock - implementar teste estatístico real (t-test, chi-square, etc.)
        const significance = Math.abs(effectSize) > minimumEffectSize ? 0.95 : 0.6;
        let winner = 'inconclusive';
        if (significance >= 0.95) {
            winner = treatmentValue > controlValue ? 'treatment' : 'control';
        }
        return {
            significance,
            confidence: significance * 100,
            winner
        };
    }
    generateRecommendations(overall, byContext, bySegment) {
        const recommendations = [];
        // Análise de CTR
        if (overall.click_through_rate < 25) {
            recommendations.push('CTR baixo (<25%): Revisar relevância das recomendações e posicionamento visual');
        }
        // Análise de conversão
        if (overall.conversion_rate < 60) {
            recommendations.push('Taxa de conversão baixa (<60%): Melhorar qualidade do conteúdo recomendado');
        }
        // Análise de posição
        if (overall.avg_position_clicked > 3) {
            recommendations.push('Posição média de clique alta (>3): Melhorar algoritmo de ranking');
        }
        // Análise por contexto
        const homeMetrics = byContext['home'];
        if (homeMetrics && homeMetrics.click_through_rate < byContext['post_challenge']?.click_through_rate) {
            recommendations.push('CTR da home inferior ao pós-desafio: Otimizar recomendações da página inicial');
        }
        // Análise de diversidade
        if (overall.diversity_score < 50) {
            recommendations.push('Baixa diversidade (<50%): Implementar lógica anti-monotonia mais agressiva');
        }
        return recommendations;
    }
    getTopContent(interactions) {
        const contentCounts = interactions
            .filter(i => i.interaction_type === 'view')
            .reduce((acc, interaction) => {
            acc[interaction.content_id] = (acc[interaction.content_id] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(contentCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([content_id, views]) => ({ content_id, views }));
    }
    // MÉTODOS DE DADOS (Mock - implementar com banco real)
    async saveInteractionEvent(event) {
        console.log(`💾 Saving interaction event: ${event.id}`);
        // Implementar salvamento no banco
    }
    async processRealTimeMetrics(event) {
        // Implementar processamento em tempo real (Redis, etc.)
    }
    async getInteractions(startDate, endDate, filters) {
        // Mock data - implementar busca real no banco
        return [];
    }
    async getUserSegments() {
        return ['Iniciante Motivado', 'Intermediário Consistente', 'Avançado Explorador', 'Casual Esporádico'];
    }
    async getTopPerformingRules(startDate, endDate) {
        return [
            { rule_id: 'rule_1', rule_name: 'Perda de Peso - Cardio + Nutrição', interactions: 890, ctr: 45.2, conversion_rate: 68.3 },
            { rule_id: 'rule_2', rule_name: 'Usuários Inativos - Conteúdo Motivacional', interactions: 654, ctr: 38.7, conversion_rate: 72.1 }
        ];
    }
    async getContentInsights(startDate, endDate) {
        return {
            most_recommended: [
                { content_id: 'challenge_1', title: 'Desafio Caminhada Matinal', recommendations: 1250, ctr: 32.4 },
                { content_id: 'article_1', title: 'Guia de Hidratação Diária', recommendations: 890, ctr: 28.7 }
            ],
            highest_engagement: [
                { content_id: 'challenge_2', title: 'Yoga para Iniciantes', completion_rate: 78.5, avg_rating: 4.6 },
                { content_id: 'recipe_1', title: 'Smoothie Proteico', completion_rate: 82.1, avg_rating: 4.4 }
            ]
        };
    }
    async saveABTest(test) {
        console.log(`💾 Saving A/B test: ${test.test_id}`);
    }
    async getABTest(testId) {
        // Mock - implementar busca real
        return null;
    }
    async countTestUsers(testId, variant) {
        // Mock - implementar contagem real
        return Math.floor(Math.random() * 1000) + 500;
    }
    async getAverageResponseTime() {
        return 120; // ms
    }
    async getErrorRate() {
        return 0.5; // %
    }
}
exports.RecommendationAnalyticsService = RecommendationAnalyticsService;
exports.default = RecommendationAnalyticsService;
//# sourceMappingURL=recommendation-analytics.service.js.map