/**
 * SERVIÇO DE PREVENÇÃO DE CHURN - ESTRATÉGIA IMUNOLOGIA DO CLIENTE
 * Implementa as 3 fases: Diagnóstico, Prevenção e Tratamento
 */

import { Patient } from '../types';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

export interface ExitSurveyData {
  userId: string;
  primaryReason: 'price' | 'lack_of_use' | 'technical_issues' | 'goal_achieved' | 'competitor' | 'life_change' | 'other';
  secondaryReasons: string[];
  feedback: string;
  likelihood: number; // 0-6 scale
  timestamp: string;
  planName: string;
  userAgent: string;
  sessionDuration: number;
}

export interface HealthScore {
  userId: string;
  score: number; // 0-100
  factors: {
    loginFrequency: number;
    challengeParticipation: number;
    featureUsage: number;
    socialEngagement: number;
    goalProgress: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lastCalculated: string;
  recommendations: string[];
}

export interface ChurnRiskUser {
  userId: string;
  userName: string;
  email: string;
  planName: string;
  healthScore: number;
  riskLevel: string;
  daysSinceLastLogin: number;
  interventionsSent: number;
  lastInterventionDate?: string;
  predictedChurnDate: string;
}

export class ChurnPreventionService {
  // FASE 1: DIAGNÓSTICO

  /**
   * Salva dados do Exit Survey quando usuário cancela
   */
  async saveExitSurvey(data: ExitSurveyData): Promise<void> {
    try {
      // Salvar no banco de dados
      logger.info('📊 Exit Survey Saved:', {
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

    } catch (error) {
      logger.error('Erro ao salvar Exit Survey:', error);
      throw error;
    }
  }

  /**
   * Analisa comportamento pré-churn dos últimos 30 dias
   */
  async analyzePreChurnBehavior(userId: string): Promise<any> {
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
  async calculateHealthScore(userId: string): Promise<HealthScore> {
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

    const score = Math.round(
      factors.loginFrequency * weights.loginFrequency +
      factors.challengeParticipation * weights.challengeParticipation +
      factors.featureUsage * weights.featureUsage +
      factors.socialEngagement * weights.socialEngagement +
      factors.goalProgress * weights.goalProgress
    );

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
  async identifyAtRiskUsers(): Promise<ChurnRiskUser[]> {
    const users = await this.getAllActiveUsers();
    const atRiskUsers: ChurnRiskUser[] = [];

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
  async executeReactivationCampaigns(): Promise<void> {
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
  async executeRetentionFlow(userId: string, reason: string): Promise<any> {
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
  async executeProactiveInterventions(): Promise<void> {
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

  private async calculateLoginFrequency(userId: string): Promise<number> {
    // Mock: Calcular frequência de login dos últimos 30 dias
    // TODO: Implementar consulta real: COUNT(PointsHistory) onde action='LOGIN' e date > 30d
    const logins = await this.getLoginCount(userId, 30);
    return Math.min(100, (logins / 20) * 100); // 20 logins = 100%
  }

  private async calculateChallengeParticipation(userId: string): Promise<number> {
    // Mock: Participação em desafios
    // TODO: Implementar consulta real na tabela PatientChallenge
    const participation = await this.getChallengeParticipationRate(userId);
    return participation * 100;
  }

  private async calculateFeatureUsage(userId: string): Promise<number> {
    // Mock: Uso de funcionalidades principais
    const featuresUsed = await this.getUniqueFeatureUsage(userId);
    const totalFeatures = 10; // Total de features principais
    return (featuresUsed / totalFeatures) * 100;
  }

  private async calculateSocialEngagement(userId: string): Promise<number> {
    // Mock: Engajamento social (compartilhamentos, grupos, etc.)
    const socialActions = await this.getSocialActionCount(userId);
    return Math.min(100, socialActions * 10);
  }

  private async calculateGoalProgress(userId: string): Promise<number> {
    // Mock: Progresso em metas definidas
    const goalCompletion = await this.getGoalCompletionRate(userId);
    return goalCompletion * 100;
  }

  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'LOW';
    if (score >= 60) return 'MEDIUM';
    if (score >= 40) return 'HIGH';
    return 'CRITICAL';
  }

  private async generateRecommendations(factors: any, riskLevel: string): Promise<string[]> {
    const recommendations: string[] = [];

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

  private predictChurnDate(healthScore: number, daysSinceLastLogin: number): string {
    // Algoritmo simples de predição
    let daysUntilChurn = 30;

    if (healthScore < 20) daysUntilChurn = 7;
    else if (healthScore < 40) daysUntilChurn = 14;
    else if (healthScore < 60) daysUntilChurn = 21;

    // Ajustar baseado na inatividade
    daysUntilChurn = Math.max(1, daysUntilChurn - daysSinceLastLogin);

    const predictedDate = new Date(Date.now() + daysUntilChurn * 24 * 60 * 60 * 1000);
    return predictedDate.toISOString();
  }

  private async generatePersonalizedMessage(user: any, healthScore: HealthScore): Promise<any> {
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

  private async generateRetentionOffer(user: any, reason: string, healthScore: HealthScore): Promise<any> {
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

  private getPersonalizedRetentionReason(reason: ExitSurveyData['primaryReason'] | string): string {
    const messages: Record<string, string> = {
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
  private async generateRetentionMessage(user: any, reason: string): Promise<string> {
    const base = this.getPersonalizedRetentionReason(reason);
    return `Olá ${user.name || 'cliente'}, ${base}`;
  }

  // Mock methods para simular dados
  private async getLoginCount(userId: string, days: number): Promise<number> {
    return Math.floor(Math.random() * 25) + 5; // 5-30 logins
  }

  private async getChallengeParticipationRate(userId: string): Promise<number> {
    return Math.random() * 0.8 + 0.1; // 10-90%
  }

  private async getUniqueFeatureUsage(userId: string): Promise<number> {
    return Math.floor(Math.random() * 8) + 2; // 2-10 features
  }

  private async getSocialActionCount(userId: string): Promise<number> {
    return Math.floor(Math.random() * 10); // 0-10 ações sociais
  }

  private async getGoalCompletionRate(userId: string): Promise<number> {
    return Math.random() * 0.7 + 0.2; // 20-90%
  }

  /**
   * Métodos auxiliares usados pela análise de comportamento pré-churn
   * (implementações mockadas para evitar erros de build)
   */

  private async getLoginFrequency(userId: string, since: Date): Promise<number> {
    void userId;
    void since;
    return Math.floor(Math.random() * 100);
  }

  private async getChallengeParticipation(userId: string, since: Date): Promise<number> {
    void userId;
    void since;
    return Math.floor(Math.random() * 100);
  }

  private async getFeatureUsage(userId: string, since: Date): Promise<number> {
    void userId;
    void since;
    return Math.floor(Math.random() * 100);
  }

  private async getSupportTickets(userId: string, since: Date): Promise<number> {
    void userId;
    void since;
    return Math.floor(Math.random() * 5);
  }

  private async getLastActiveDate(userId: string): Promise<Date> {
    void userId;
    const daysAgo = Math.floor(Math.random() * 30);
    return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  }

  private async identifyWarningSignals(userId: string): Promise<string[]> {
    void userId;
    const signals = [
      'low_login_frequency',
      'no_challenge_participation',
      'low_feature_usage',
      'recent_support_ticket'
    ];
    return signals.filter(() => Math.random() > 0.5);
  }

  async getAllActiveUsers(): Promise<any[]> {
    const users = await prisma.user.findMany({
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

  private async getDaysSinceLastLogin(userId: string): Promise<number> {
    return Math.floor(Math.random() * 30); // 0-30 dias
  }

  private async getInterventionCount(userId: string): Promise<number> {
    return Math.floor(Math.random() * 3); // 0-3 intervenções
  }

  private async getLastInterventionDate(userId: string): Promise<string | undefined> {
    const random = Math.random();
    if (random > 0.5) {
      const date = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000);
      return date.toISOString();
    }
    return undefined;
  }

  private daysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
  }

  private async sendToAnalytics(event: string, data: any): Promise<void> {
    logger.info(`📊 Analytics Event: ${event}`, data);
  }

  private async notifyProductTeam(data: ExitSurveyData): Promise<void> {
    logger.warn('🚨 Product Team Notification:', data.primaryReason);
  }

  private async scheduleWinBackCampaign(userId: string, likelihood: number): Promise<void> {
    logger.info(`📧 Win-back campaign scheduled for user ${userId} (likelihood: ${likelihood})`);
  }

  private async getUserById(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
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

    if (!user) throw new Error('User not found');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      planName: user.patient?.subscriptions?.[0]?.plan?.name || 'Básico'
    };
  }

  private async getInactiveUsers(days: number): Promise<any[]> {
    return [
      { id: '1', name: 'Usuário Inativo 1', email: 'inativo1@email.com' },
      { id: '2', name: 'Usuário Inativo 2', email: 'inativo2@email.com' }
    ];
  }

  private async sendReactivationEmail(email: string, message: any): Promise<void> {
    logger.info(`📧 Reactivation email sent to ${email}`);
  }

  private async sendPushNotification(userId: string, message: any): Promise<void> {
    logger.info(`📱 Push notification sent to user ${userId}`);
  }

  private async logIntervention(userId: string, type: string, data: any): Promise<void> {
    logger.info(`📝 Intervention logged: ${type} for user ${userId}`);
  }

  private async selectIntervention(user: ChurnRiskUser): Promise<string> {
    if (user.riskLevel === 'CRITICAL') return 'personal_call';
    if (user.riskLevel === 'HIGH') return 'personal_email';
    return 'automated_campaign';
  }

  private async executeIntervention(user: ChurnRiskUser, intervention: string): Promise<void> {
    logger.info(`🎯 Executing ${intervention} for user ${user.userName}`);
  }

  private async getRecommendedChallenges(userId: string): Promise<any[]> {
    return [
      { name: 'Hidratação Diária', type: 'health' },
      { name: '10 Mil Passos', type: 'fitness' }
    ];
  }
}

export default ChurnPreventionService;
