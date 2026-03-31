"use strict";
/**
 * JOBS NPS - ANÁLISE AUTOMÁTICA E RELATÓRIOS
 * Automatização da análise de feedback e geração de insights
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NPSAnalysisJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const nps_feedback_service_1 = require("../services/nps-feedback.service");
class NPSAnalysisJobs {
    static npsService = new nps_feedback_service_1.NPSFeedbackService();
    static jobs = new Map();
    /**
     * Inicia todos os jobs de análise NPS
     */
    static startAllJobs() {
        console.log('🚀 Starting NPS Analysis Jobs...');
        this.startVoiceOfCustomerReportJob();
        this.startDailyNPSAnalysisJob();
        this.startDetractorAlertJob();
        this.startWeeklyTrendAnalysisJob();
        this.startMonthlyExecutiveReportJob();
        console.log('✅ All NPS Analysis Jobs started successfully');
    }
    /**
     * Para todos os jobs
     */
    static stopAllJobs() {
        console.log('🛑 Stopping NPS Analysis Jobs...');
        this.jobs.forEach((job, name) => {
            job.stop();
            console.log(`❌ Stopped job: ${name}`);
        });
        this.jobs.clear();
        console.log('✅ All NPS Analysis Jobs stopped');
    }
    /**
     * JOB 1: Relatório "Voz do Cliente" (Quinzenal - Segundas 08:00)
     */
    static startVoiceOfCustomerReportJob() {
        const job = node_cron_1.default.schedule('0 8 * * 1', async () => {
            try {
                console.log('📊 Generating Voice of Customer Report...');
                const report = await this.npsService.generateVoiceOfCustomerReport(15);
                // Criar itens no roadmap para ações urgentes/altas
                await this.npsService.createRoadmapItems(report);
                // Notificar equipe de liderança
                await this.notifyLeadershipTeam(report);
                console.log(`✅ Voice of Customer Report generated: ${report.reportId}`);
            }
            catch (error) {
                console.error('❌ Error generating Voice of Customer Report:', error);
            }
        }, {
            timezone: 'America/Sao_Paulo'
        });
        job.start();
        this.jobs.set('voice-of-customer-report', job);
        console.log('⏰ Voice of Customer Report job scheduled (Mondays at 08:00)');
    }
    /**
     * JOB 2: Análise diária de NPS (Diário - 07:00)
     */
    static startDailyNPSAnalysisJob() {
        const job = node_cron_1.default.schedule('0 7 * * *', async () => {
            try {
                console.log('📈 Running daily NPS analysis...');
                // Calcular métricas do dia anterior
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const dailyMetrics = await this.calculateDailyMetrics(yesterday);
                // Verificar alertas
                await this.checkNPSAlerts(dailyMetrics);
                // Salvar métricas históricas
                await this.saveDailyMetrics(dailyMetrics);
                console.log('✅ Daily NPS analysis completed');
            }
            catch (error) {
                console.error('❌ Error in daily NPS analysis:', error);
            }
        }, {
            timezone: 'America/Sao_Paulo'
        });
        job.start();
        this.jobs.set('daily-nps-analysis', job);
        console.log('⏰ Daily NPS analysis job scheduled (daily at 07:00)');
    }
    /**
     * JOB 3: Alerta de detratores críticos (A cada 2 horas durante horário comercial)
     */
    static startDetractorAlertJob() {
        const job = node_cron_1.default.schedule('0 8-18/2 * * 1-5', async () => {
            try {
                console.log('🚨 Checking for critical detractors...');
                // Buscar detratores críticos (score <= 3) das últimas 2 horas
                const criticalDetractors = await this.getCriticalDetractors(2);
                if (criticalDetractors.length > 0) {
                    await this.alertCriticalDetractors(criticalDetractors);
                    console.log(`🚨 ${criticalDetractors.length} critical detractors found and alerted`);
                }
                else {
                    console.log('✅ No critical detractors found');
                }
            }
            catch (error) {
                console.error('❌ Error checking critical detractors:', error);
            }
        }, {
            timezone: 'America/Sao_Paulo'
        });
        job.start();
        this.jobs.set('detractor-alert', job);
        console.log('⏰ Detractor alert job scheduled (every 2h, 8-18h, Mon-Fri)');
    }
    /**
     * JOB 4: Análise de tendências semanais (Domingos - 20:00)
     */
    static startWeeklyTrendAnalysisJob() {
        const job = node_cron_1.default.schedule('0 20 * * 0', async () => {
            try {
                console.log('📊 Running weekly trend analysis...');
                const weeklyTrends = await this.analyzeWeeklyTrends();
                // Gerar insights automáticos
                const insights = await this.generateTrendInsights(weeklyTrends);
                // Notificar equipe de produto
                await this.notifyProductTeam(insights);
                console.log('✅ Weekly trend analysis completed');
            }
            catch (error) {
                console.error('❌ Error in weekly trend analysis:', error);
            }
        }, {
            timezone: 'America/Sao_Paulo'
        });
        job.start();
        this.jobs.set('weekly-trend-analysis', job);
        console.log('⏰ Weekly trend analysis job scheduled (Sundays at 20:00)');
    }
    /**
     * JOB 5: Relatório executivo mensal (Primeiro dia do mês - 09:00)
     */
    static startMonthlyExecutiveReportJob() {
        const job = node_cron_1.default.schedule('0 9 1 * *', async () => {
            try {
                console.log('📋 Generating monthly executive report...');
                const executiveReport = await this.generateExecutiveReport();
                // Enviar para liderança
                await this.sendExecutiveReport(executiveReport);
                console.log('✅ Monthly executive report sent');
            }
            catch (error) {
                console.error('❌ Error generating executive report:', error);
            }
        }, {
            timezone: 'America/Sao_Paulo'
        });
        job.start();
        this.jobs.set('monthly-executive-report', job);
        console.log('⏰ Monthly executive report job scheduled (1st day of month at 09:00)');
    }
    // MÉTODOS AUXILIARES
    static async calculateDailyMetrics(date) {
        // Mock - implementar cálculo real
        return {
            date: date.toISOString().split('T')[0],
            npsScore: 42,
            totalResponses: 23,
            promoters: 8,
            neutrals: 11,
            detractors: 4,
            responseRate: 18.5,
            topIssues: ['Performance-Lenta', 'Bug'],
            topPraises: ['Elogio-Desafios', 'Elogio-Interface']
        };
    }
    static async checkNPSAlerts(metrics) {
        // Alerta: NPS caiu mais de 10 pontos
        if (metrics.npsScore < 30) {
            await this.sendAlert({
                type: 'NPS_LOW',
                message: `NPS Score crítico: ${metrics.npsScore}`,
                severity: 'HIGH',
                recipients: ['head-produto', 'ceo']
            });
        }
        // Alerta: Muitos detratores em um dia
        if (metrics.detractors > 10) {
            await this.sendAlert({
                type: 'HIGH_DETRACTORS',
                message: `${metrics.detractors} detratores hoje`,
                severity: 'MEDIUM',
                recipients: ['head-produto', 'head-cs']
            });
        }
    }
    static async saveDailyMetrics(metrics) {
        console.log('💾 Saving daily metrics:', metrics.date);
        // Implementar salvamento no banco de dados
    }
    static async getCriticalDetractors(hours) {
        // Mock - implementar busca real
        return [
            {
                userId: '123',
                userName: 'João Silva',
                score: 2,
                feedback: 'App travando constantemente',
                planType: 'Premium',
                timestamp: new Date().toISOString()
            }
        ];
    }
    static async alertCriticalDetractors(detractors) {
        for (const detractor of detractors) {
            await this.sendAlert({
                type: 'CRITICAL_DETRACTOR',
                message: `Detrator crítico: ${detractor.userName} (Score: ${detractor.score})`,
                severity: 'URGENT',
                recipients: ['head-cs', 'head-produto'],
                metadata: detractor
            });
        }
    }
    static async analyzeWeeklyTrends() {
        // Mock - implementar análise real
        return {
            npsEvolution: [38, 40, 42, 41, 43, 42, 44],
            responseRateEvolution: [15.2, 16.8, 18.1, 17.9, 19.3, 18.7, 20.1],
            topGrowingIssues: ['Performance-Lenta', 'Usabilidade-Confusa'],
            topGrowingPraises: ['Elogio-Gamificação', 'Elogio-Suporte'],
            segmentTrends: {
                'Premium': { nps: 52, trend: +3 },
                'Família': { nps: 48, trend: +1 },
                'Básico': { nps: 35, trend: -2 }
            }
        };
    }
    static async generateTrendInsights(trends) {
        const insights = [];
        // Insight: NPS crescendo
        if (trends.npsEvolution[6] > trends.npsEvolution[0]) {
            insights.push({
                type: 'POSITIVE_TREND',
                message: 'NPS em tendência de crescimento esta semana',
                impact: 'HIGH'
            });
        }
        // Insight: Issues crescendo
        if (trends.topGrowingIssues.length > 0) {
            insights.push({
                type: 'GROWING_ISSUES',
                message: `Problemas em crescimento: ${trends.topGrowingIssues.join(', ')}`,
                impact: 'MEDIUM'
            });
        }
        return insights;
    }
    static async generateExecutiveReport() {
        // Mock - implementar geração real
        return {
            period: 'Outubro 2024',
            npsScore: 42,
            npsEvolution: '+8 pontos vs mês anterior',
            totalResponses: 347,
            responseRate: 19.2,
            keyAchievements: [
                'Redução de 40% nos bugs reportados',
                'Aumento de 25% na satisfação com desafios',
                'Implementação de 5 melhorias solicitadas'
            ],
            keyActions: [
                'Otimização de performance (15 bugs corrigidos)',
                'Redesign do dashboard (baseado em 23 feedbacks)',
                'Nova funcionalidade de relatórios (12 solicitações)'
            ],
            roadmapInfluence: {
                itemsCreated: 12,
                itemsCompleted: 8,
                revenueImpact: 'R$ 25.000 em retenção'
            },
            nextPriorities: [
                'Melhorar onboarding (7 feedbacks)',
                'Integração Apple Health (15 solicitações)',
                'Modo offline (9 solicitações)'
            ]
        };
    }
    static async notifyLeadershipTeam(report) {
        console.log('📧 Notifying leadership team about VoC report:', report.reportId);
        // Implementar notificação real (email, Slack, etc.)
    }
    static async notifyProductTeam(insights) {
        console.log('📧 Notifying product team about weekly insights');
        // Implementar notificação real
    }
    static async sendExecutiveReport(report) {
        console.log('📧 Sending executive report for:', report.period);
        // Implementar envio real
    }
    static async sendAlert(alert) {
        console.log(`🚨 ALERT [${alert.severity}]: ${alert.message}`);
        // Implementar sistema de alertas real (Slack, email, SMS)
    }
    /**
     * Status dos jobs
     */
    static getJobsStatus() {
        const status = {};
        this.jobs.forEach((job, name) => {
            status[name] = {
                running: !!job.running,
                scheduled: !!job.scheduled
            };
        });
        return status;
    }
    /**
     * Executar job manualmente (para testes)
     */
    static async runJobManually(jobName) {
        console.log(`🔧 Running job manually: ${jobName}`);
        switch (jobName) {
            case 'voice-of-customer-report':
                const report = await this.npsService.generateVoiceOfCustomerReport(15);
                await this.npsService.createRoadmapItems(report);
                break;
            case 'daily-nps-analysis':
                const metrics = await this.calculateDailyMetrics(new Date());
                await this.checkNPSAlerts(metrics);
                break;
            case 'detractor-alert':
                const detractors = await this.getCriticalDetractors(24);
                if (detractors.length > 0) {
                    await this.alertCriticalDetractors(detractors);
                }
                break;
            default:
                console.log(`❌ Unknown job: ${jobName}`);
        }
    }
}
exports.NPSAnalysisJobs = NPSAnalysisJobs;
exports.default = NPSAnalysisJobs;
//# sourceMappingURL=nps-analysis.job.js.map