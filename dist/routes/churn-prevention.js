"use strict";
/**
 * ROTAS PARA PREVENÇÃO DE CHURN - API ENDPOINTS
 * Implementa endpoints para as 3 fases da estratégia anti-churn
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const churn_prevention_service_1 = require("../services/churn-prevention.service");
const router = (0, express_1.Router)();
const churnService = new churn_prevention_service_1.ChurnPreventionService();
// FASE 1: DIAGNÓSTICO
/**
 * POST /api/churn/exit-survey
 * Salva dados do Exit Survey quando usuário cancela
 */
router.post('/exit-survey', async (req, res) => {
    try {
        const surveyData = {
            userId: req.body.userId,
            primaryReason: req.body.primaryReason,
            secondaryReasons: req.body.secondaryReasons || [],
            feedback: req.body.feedback || '',
            likelihood: req.body.likelihood,
            timestamp: new Date().toISOString(),
            planName: req.body.planName,
            userAgent: req.headers['user-agent'] || '',
            sessionDuration: req.body.sessionDuration || 0
        };
        await churnService.saveExitSurvey(surveyData);
        res.status(201).json({
            success: true,
            message: 'Exit survey saved successfully',
            data: {
                surveyId: `survey_${Date.now()}`,
                timestamp: surveyData.timestamp
            }
        });
    }
    catch (error) {
        console.error('Error saving exit survey:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: 'Failed to save exit survey',
            error: message
        });
    }
});
/**
 * GET /api/churn/pre-churn-analysis/:userId
 * Analisa comportamento pré-churn dos últimos 30 dias
 */
router.get('/pre-churn-analysis/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const analysis = await churnService.analyzePreChurnBehavior(userId);
        res.json({
            success: true,
            data: {
                userId,
                analysis,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Error analyzing pre-churn behavior:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: 'Failed to analyze pre-churn behavior',
            error: message
        });
    }
});
/**
 * GET /api/churn/exit-survey-analytics
 * Relatório de análise dos Exit Surveys (para equipe de produto)
 */
router.get('/exit-survey-analytics', async (req, res) => {
    try {
        const { startDate, endDate, reason } = req.query;
        // Mock analytics data
        const analytics = {
            totalSurveys: 127,
            period: { startDate, endDate },
            reasonBreakdown: {
                price: 34,
                lack_of_use: 28,
                technical_issues: 19,
                goal_achieved: 15,
                competitor: 18,
                life_change: 8,
                other: 5
            },
            averageLikelihood: 3.2,
            topFeedbackThemes: [
                'App muito lento',
                'Falta de novos desafios',
                'Preço alto para o valor oferecido',
                'Dificuldade para criar hábito'
            ],
            retentionOpportunities: {
                high: 23, // likelihood > 4
                medium: 45, // likelihood 2-4
                low: 59 // likelihood < 2
            }
        };
        res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        console.error('Error getting exit survey analytics:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: 'Failed to get analytics',
            error: message
        });
    }
});
// FASE 2: PREVENÇÃO
/**
 * GET /api/churn/health-score/:userId
 * Calcula e retorna o Health Score do usuário
 */
router.get('/health-score/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const healthScore = await churnService.calculateHealthScore(userId);
        res.json({
            success: true,
            data: healthScore
        });
    }
    catch (error) {
        console.error('Error calculating health score:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: 'Failed to calculate health score',
            error: message
        });
    }
});
/**
 * GET /api/churn/at-risk-users
 * Lista usuários em risco de churn
 */
router.get('/at-risk-users', async (req, res) => {
    try {
        const { riskLevel, limit = 50 } = req.query;
        const atRiskUsers = await churnService.identifyAtRiskUsers();
        let filteredUsers = atRiskUsers;
        if (riskLevel) {
            filteredUsers = atRiskUsers.filter(user => user.riskLevel === riskLevel);
        }
        filteredUsers = filteredUsers.slice(0, parseInt(limit));
        res.json({
            success: true,
            data: {
                users: filteredUsers,
                summary: {
                    total: atRiskUsers.length,
                    critical: atRiskUsers.filter(u => u.riskLevel === 'CRITICAL').length,
                    high: atRiskUsers.filter(u => u.riskLevel === 'HIGH').length,
                    medium: atRiskUsers.filter(u => u.riskLevel === 'MEDIUM').length
                }
            }
        });
    }
    catch (error) {
        console.error('Error getting at-risk users:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: 'Failed to get at-risk users',
            error: message
        });
    }
});
/**
 * POST /api/churn/reactivation-campaigns
 * Executa campanhas de reativação para usuários inativos
 */
router.post('/reactivation-campaigns', async (req, res) => {
    try {
        await churnService.executeReactivationCampaigns();
        res.json({
            success: true,
            message: 'Reactivation campaigns executed successfully',
            executedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error executing reactivation campaigns:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: 'Failed to execute reactivation campaigns',
            error: message
        });
    }
});
/**
 * GET /api/churn/health-score-dashboard
 * Dashboard com métricas de Health Score para CS team
 */
router.get('/health-score-dashboard', async (req, res) => {
    try {
        // Mock dashboard data
        const dashboard = {
            overview: {
                totalUsers: 1247,
                averageHealthScore: 67.3,
                usersAtRisk: 89,
                interventionsThisWeek: 23
            },
            scoreDistribution: {
                excellent: 312, // 80-100
                good: 498, // 60-79
                fair: 287, // 40-59
                poor: 150 // 0-39
            },
            trendAnalysis: {
                weekOverWeek: -2.1, // % change
                monthOverMonth: -5.3,
                improvingUsers: 67,
                decliningUsers: 94
            },
            topRiskFactors: [
                { factor: 'Low login frequency', affectedUsers: 156 },
                { factor: 'No challenge participation', affectedUsers: 134 },
                { factor: 'Limited feature usage', affectedUsers: 98 },
                { factor: 'No social engagement', affectedUsers: 87 }
            ]
        };
        res.json({
            success: true,
            data: dashboard,
            generatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error getting health score dashboard:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard data',
            error: message
        });
    }
});
// FASE 3: TRATAMENTO
/**
 * POST /api/churn/retention-flow
 * Executa processo de retenção no momento do cancelamento
 */
router.post('/retention-flow', async (req, res) => {
    try {
        const { userId, reason } = req.body;
        if (!userId || !reason) {
            return res.status(400).json({
                success: false,
                message: 'userId and reason are required'
            });
        }
        const retentionOffer = await churnService.executeRetentionFlow(userId, reason);
        res.json({
            success: true,
            data: retentionOffer
        });
    }
    catch (error) {
        console.error('Error executing retention flow:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: 'Failed to execute retention flow',
            error: message
        });
    }
});
/**
 * POST /api/churn/proactive-interventions
 * Executa intervenções proativas baseadas no Health Score
 */
router.post('/proactive-interventions', async (req, res) => {
    try {
        await churnService.executeProactiveInterventions();
        res.json({
            success: true,
            message: 'Proactive interventions executed successfully',
            executedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error executing proactive interventions:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: 'Failed to execute proactive interventions',
            error: message
        });
    }
});
/**
 * POST /api/churn/retention-offer-response
 * Processa resposta do usuário à oferta de retenção
 */
router.post('/retention-offer-response', async (req, res) => {
    try {
        const { userId, offerId, response, selectedOffer } = req.body;
        // Log da resposta para análise
        const responseData = {
            userId,
            offerId,
            response, // 'accepted', 'declined', 'alternative'
            selectedOffer,
            timestamp: new Date().toISOString()
        };
        console.log('📊 Retention Offer Response:', responseData);
        // Salvar no banco para análise de efetividade das ofertas
        // await saveRetentionResponse(responseData);
        let message = '';
        if (response === 'accepted') {
            message = 'Que ótimo! Sua oferta foi aplicada com sucesso.';
            // Aplicar desconto ou benefício
        }
        else if (response === 'alternative') {
            message = 'Alternativa selecionada com sucesso.';
            // Processar alternativa (pause, downgrade, etc.)
        }
        else {
            message = 'Entendemos sua decisão. Estaremos aqui quando precisar.';
            // Agendar win-back campaign
        }
        res.json({
            success: true,
            message,
            data: responseData
        });
    }
    catch (error) {
        console.error('Error processing retention offer response:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: 'Failed to process response',
            error: message
        });
    }
});
/**
 * GET /api/churn/retention-analytics
 * Analytics de efetividade das estratégias de retenção
 */
router.get('/retention-analytics', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        // Mock retention analytics
        const analytics = {
            period,
            retentionOffers: {
                sent: 156,
                accepted: 67,
                declined: 89,
                acceptanceRate: 43.0
            },
            offerEffectiveness: {
                discount: { sent: 89, accepted: 45, rate: 50.6 },
                pause: { sent: 34, accepted: 12, rate: 35.3 },
                downgrade: { sent: 33, accepted: 10, rate: 30.3 }
            },
            proactiveInterventions: {
                executed: 234,
                successful: 89,
                successRate: 38.0
            },
            churnPrevented: {
                totalUsers: 67,
                estimatedRevenueSaved: 8940, // R$
                averageLifetimeExtension: 4.2 // months
            },
            healthScoreImpact: {
                usersImproved: 123,
                averageImprovement: 12.4,
                usersStabilized: 89
            }
        };
        res.json({
            success: true,
            data: analytics,
            generatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error getting retention analytics:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: 'Failed to get retention analytics',
            error: message
        });
    }
});
/**
 * GET /api/churn/churn-metrics
 * Métricas principais de churn para dashboard executivo
 */
router.get('/churn-metrics', async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        // Mock churn metrics
        const metrics = {
            period,
            churnRate: {
                current: 4.2, // %
                previous: 5.1,
                trend: -0.9,
                target: 5.0
            },
            retentionRate: {
                current: 95.8, // %
                previous: 94.9,
                trend: 0.9
            },
            cohortAnalysis: {
                month1: 92.3,
                month3: 78.5,
                month6: 68.2,
                month12: 54.7
            },
            revenueImpact: {
                churnedMRR: 12450, // R$
                retainedMRR: 8940,
                netChurnMRR: 3510
            },
            topChurnReasons: [
                { reason: 'price', percentage: 28.5 },
                { reason: 'lack_of_use', percentage: 24.1 },
                { reason: 'technical_issues', percentage: 18.3 },
                { reason: 'competitor', percentage: 15.2 },
                { reason: 'goal_achieved', percentage: 13.9 }
            ]
        };
        res.json({
            success: true,
            data: metrics,
            generatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error getting churn metrics:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: 'Failed to get churn metrics',
            error: message
        });
    }
});
exports.default = router;
//# sourceMappingURL=churn-prevention.js.map