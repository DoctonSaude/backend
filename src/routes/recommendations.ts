/**
 * ROTAS API - PROJETO CÉREBRO
 * Endpoints para sistema de recomendação personalizada
 */

import { Router } from 'express';
import RecommendationEngineService, { BusinessRule } from '../services/recommendation-engine.service.js';

const router = Router();
const recommendationService = new RecommendationEngineService();

/**
 * GET /recommendations/:userId
 * Gera recomendações personalizadas para um usuário
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { context = 'home', limit = 10 } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID é obrigatório'
      });
    }

    const recommendations = await recommendationService.generateRecommendations(
      userId,
      context as 'home' | 'post_challenge' | 'discover',
      parseInt(limit as string) || 10
    );

    res.json({
      success: true,
      data: {
        user_id: userId,
        context,
        recommendations,
        generated_at: new Date().toISOString(),
        total: recommendations.length
      }
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /recommendations/rules
 * Cria uma nova regra de negócio
 */
router.post('/rules', async (req, res) => {
  try {
    const ruleData = req.body;
    
    // Validação básica
    if (!ruleData.name || !ruleData.description || !ruleData.conditions || !ruleData.actions) {
      return res.status(400).json({
        success: false,
        message: 'Dados da regra incompletos'
      });
    }

    const rule = await recommendationService.createBusinessRule(ruleData);

    res.status(201).json({
      success: true,
      data: rule,
      message: 'Regra de negócio criada com sucesso'
    });

  } catch (error) {
    console.error('Error creating business rule:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /recommendations/rules/initialize
 * Inicializa regras padrão do sistema
 */
router.post('/rules/initialize', async (req, res) => {
  try {
    await recommendationService.initializeDefaultRules();

    res.json({
      success: true,
      message: 'Regras padrão inicializadas com sucesso'
    });

  } catch (error) {
    console.error('Error initializing default rules:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /recommendations/interaction
 * Registra interação do usuário com recomendação
 */
router.post('/interaction', async (req, res) => {
  try {
    const { user_id, content_id, interaction_type, context, position } = req.body;
    
    if (!user_id || !content_id || !interaction_type) {
      return res.status(400).json({
        success: false,
        message: 'Dados de interação incompletos'
      });
    }

    // Mock - implementar logging real
    console.log(`📊 Interaction logged:`, {
      user_id,
      content_id,
      interaction_type, // 'click', 'complete', 'skip', 'save'
      context,
      position,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Interação registrada com sucesso'
    });

  } catch (error) {
    console.error('Error logging interaction:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /recommendations/analytics/performance
 * Métricas de performance das recomendações
 */
router.get('/analytics/performance', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    // Mock data - implementar análise real
    const analytics = {
      period: `${days} dias`,
      generated_at: new Date().toISOString(),
      
      overall_metrics: {
        total_recommendations: 15420,
        total_interactions: 4856,
        click_through_rate: 31.5, // %
        completion_rate: 68.2, // %
        avg_position_clicked: 2.3
      },
      
      by_context: {
        home: {
          recommendations: 8950,
          interactions: 2890,
          ctr: 32.3
        },
        post_challenge: {
          recommendations: 4200,
          interactions: 1450,
          ctr: 34.5
        },
        discover: {
          recommendations: 2270,
          interactions: 516,
          ctr: 22.7
        }
      },
      
      top_performing_rules: [
        { rule_name: 'Perda de Peso - Cardio + Nutrição', interactions: 890, ctr: 45.2 },
        { rule_name: 'Usuários Inativos - Conteúdo Motivacional', interactions: 654, ctr: 38.7 },
        { rule_name: 'Tempo Limitado - Conteúdo Curto', interactions: 523, ctr: 35.1 }
      ],
      
      content_performance: {
        most_recommended: [
          { content_id: 'challenge_1', title: 'Desafio Caminhada Matinal', recommendations: 1250 },
          { content_id: 'article_1', title: 'Guia de Hidratação Diária', recommendations: 890 }
        ],
        highest_ctr: [
          { content_id: 'challenge_2', title: 'Yoga para Iniciantes', ctr: 52.3 },
          { content_id: 'recipe_1', title: 'Smoothie Proteico', ctr: 48.7 }
        ]
      }
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /recommendations/user/:userId/profile
 * Busca perfil do usuário para recomendações
 */
router.get('/user/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Mock data - implementar busca real no banco
    const userProfile = {
      id: userId,
      meta_principal: 'perder_peso',
      atividades_preferidas: ['corrida', 'yoga'],
      nivel_declarado: 'iniciante',
      tempo_disponivel: 'medio',
      horario_preferido: 'manha',
      frequencia_desejada: 'diaria',
      motivacao_principal: 'saude',
      restricoes_alimentares: [],
      limitacoes_fisicas: [],
      equipamentos_disponiveis: ['nenhum'],
      desafios_completados: 5,
      tipos_mais_engajados: ['exercicio', 'nutricao'],
      horarios_mais_ativos: ['08:00', '19:00'],
      taxa_conclusao_geral: 0.75,
      plano_atual: 'Premium',
      dias_desde_cadastro: 15,
      ultimo_acesso: new Date().toISOString(),
      
      // Insights calculados
      segment: 'Iniciante Motivado',
      engagement_level: 'Alto',
      churn_risk: 'Baixo',
      preferred_content_types: ['Desafios Curtos', 'Artigos de Nutrição'],
      optimal_recommendation_time: '08:00-09:00, 19:00-20:00'
    };

    res.json({
      success: true,
      data: userProfile
    });

  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /recommendations/content/tag
 * Adiciona tags a um conteúdo para melhorar recomendações
 */
router.post('/content/tag', async (req, res) => {
  try {
    const { content_id, tags, taxonomy } = req.body;
    
    if (!content_id || !tags) {
      return res.status(400).json({
        success: false,
        message: 'Content ID e tags são obrigatórios'
      });
    }

    // Mock - implementar atualização real no banco
    console.log(`🏷️ Content tagged:`, {
      content_id,
      tags,
      taxonomy,
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Tags adicionadas com sucesso',
      data: {
        content_id,
        tags,
        taxonomy
      }
    });

  } catch (error) {
    console.error('Error tagging content:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /recommendations/debug/:userId
 * Endpoint de debug para visualizar o processo de recomendação
 */
router.get('/debug/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { content_id } = req.query;
    
    // Mock debug info - implementar debug real
    const debugInfo = {
      user_id: userId,
      content_id: content_id || 'all',
      debug_timestamp: new Date().toISOString(),
      
      user_profile: {
        meta_principal: 'perder_peso',
        nivel_declarado: 'iniciante',
        dias_desde_cadastro: 15
      },
      
      applied_rules: [
        {
          rule_id: 'rule_1',
          rule_name: 'Perda de Peso - Cardio + Nutrição',
          matched: true,
          conditions_met: ['meta_principal: perder_peso', 'tipo: exercicio'],
          actions_applied: ['boost_score: 2.0x', 'priority_boost: +0.3']
        },
        {
          rule_id: 'rule_2',
          rule_name: 'Iniciantes - Conteúdo Fácil',
          matched: true,
          conditions_met: ['nivel_declarado: iniciante', 'dias_desde_cadastro: 15 < 30'],
          actions_applied: ['boost_score: 1.5x', 'priority_boost: +0.2']
        }
      ],
      
      score_breakdown: {
        base_score: 0.65,
        goal_compatibility: 0.3,
        level_match: 0.2,
        time_compatibility: 0.15,
        activity_preference: 0.25,
        quality_boost: 0.15,
        rule_boosts: 1.8,
        final_score: 0.89
      },
      
      reasoning: [
        'Score base: 0.65',
        'Meta compatível (perder_peso): +0.30',
        'Nível compatível (iniciante): +0.20',
        'Regra "Perda de Peso": boost 2.0x',
        'Regra "Iniciantes": boost 1.5x',
        'Score final: 0.89'
      ]
    };

    res.json({
      success: true,
      data: debugInfo
    });

  } catch (error) {
    console.error('Error getting debug info:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

export default router;
