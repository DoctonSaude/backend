/**
 * ROTAS NPS - MÁQUINA DE FEEDBACK ESTRATÉGICO
 * API Endpoints para todas as 4 fases do sistema NPS
 */

import { Router } from 'express';
import { NPSFeedbackService, NPSResponse } from '../services/nps-feedback.service.js';

const router = Router();
const npsService = new NPSFeedbackService();

// FASE 1: COLETA INTELIGENTE

/**
 * Verifica se usuário é elegível para pesquisa NPS
 */
router.get('/eligibility/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const isEligible = await npsService.isEligibleForNPS(userId);
    
    res.json({
      success: true,
      eligible: isEligible,
      message: isEligible ? 'Usuário elegível para NPS' : 'Usuário não elegível para NPS'
    });
  } catch (error) {
    console.error('Erro ao verificar elegibilidade NPS:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * Salva resposta NPS do usuário
 */
router.post('/response', async (req, res) => {
  try {
    const npsData: Partial<NPSResponse> = req.body;
    
    // Validações básicas
    if (!npsData.userId || npsData.score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'userId e score são obrigatórios'
      });
    }
    
    if (npsData.score < 0 || npsData.score > 10) {
      return res.status(400).json({
        success: false,
        message: 'Score deve estar entre 0 e 10'
      });
    }
    
    const response = await npsService.saveNPSResponse(npsData);
    
    res.json({
      success: true,
      data: response,
      message: 'Resposta NPS salva com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar resposta NPS:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * Busca histórico de respostas NPS de um usuário
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Mock data - implementar busca real
    const history = [
      {
        id: 'nps_123',
        score: 8,
        category: 'NEUTRAL',
        feedback: 'Bom app, mas pode melhorar',
        timestamp: '2024-10-01T10:00:00Z'
      }
    ];
    
    res.json({
      success: true,
      data: history,
      message: 'Histórico NPS recuperado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar histórico NPS:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// FASE 2: ANÁLISE E SÍNTESE

/**
 * Gera relatório "Voz do Cliente"
 */
router.post('/report/generate', async (req, res) => {
  try {
    const { days = 15 } = req.body;
    const report = await npsService.generateVoiceOfCustomerReport(days);
    
    res.json({
      success: true,
      data: report,
      message: 'Relatório Voz do Cliente gerado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * Busca métricas NPS em tempo real
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    // Mock data - implementar cálculo real
    const analytics = {
      currentNPS: 42,
      trend: +8,
      totalResponses: 156,
      distribution: {
        promoters: 45,
        neutrals: 67,
        detractors: 44
      },
      topIssues: [
        { theme: 'Performance-Lenta', count: 12, trend: +3 },
        { theme: 'Bug', count: 8, trend: -2 },
        { theme: 'Usabilidade-Confusa', count: 6, trend: +1 }
      ],
      topPraises: [
        { theme: 'Elogio-Desafios', count: 23, trend: +5 },
        { theme: 'Elogio-Gamificação', count: 18, trend: +2 },
        { theme: 'Elogio-Interface', count: 12, trend: 0 }
      ],
      responseRate: 24.3,
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: analytics,
      message: 'Analytics NPS recuperado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * Lista usuários detratores para outreach
 */
router.get('/detractors/high-value', async (req, res) => {
  try {
    // Mock data - implementar busca real
    const detractors = [
      {
        userId: '1',
        userName: 'João Silva',
        email: 'joao@email.com',
        score: 3,
        feedback: 'App muito lento e com bugs',
        planType: 'Premium',
        daysSinceResponse: 2,
        contacted: false
      },
      {
        userId: '2',
        userName: 'Ana Costa',
        email: 'ana@email.com',
        score: 4,
        feedback: 'Interface confusa, difícil de usar',
        planType: 'Família',
        daysSinceResponse: 1,
        contacted: false
      }
    ];
    
    res.json({
      success: true,
      data: detractors,
      message: 'Detratores de alto valor listados com sucesso'
    });
  } catch (error) {
    console.error('Erro ao listar detratores:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// FASE 3: AÇÃO E ROADMAP

/**
 * Cria itens no roadmap baseados no feedback
 */
router.post('/roadmap/create-items', async (req, res) => {
  try {
    const { reportId } = req.body;
    
    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: 'reportId é obrigatório'
      });
    }
    
    // Mock - buscar relatório e criar itens
    const mockReport = {
      reportId,
      recommendedActions: [
        {
          priority: 'URGENT',
          action: 'Corrigir bugs de performance',
          owner: 'Head de Engenharia',
          estimatedImpact: 'Alto'
        },
        {
          priority: 'HIGH',
          action: 'Melhorar UX do dashboard',
          owner: 'Head de Produto',
          estimatedImpact: 'Médio'
        }
      ]
    };
    
    await npsService.createRoadmapItems(mockReport as any);
    
    res.json({
      success: true,
      data: {
        itemsCreated: mockReport.recommendedActions.length,
        reportId
      },
      message: 'Itens do roadmap criados com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar itens do roadmap:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * Lista iniciativas da voz do cliente
 */
router.get('/roadmap/voice-initiatives', async (req, res) => {
  try {
    // Mock data - implementar busca real
    const initiatives = [
      {
        id: 'init_1',
        title: 'Corrigir bugs de login',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        owner: 'Head de Engenharia',
        dueDate: '2024-10-25',
        source: 'NPS Feedback',
        affectedUsers: 23,
        npsImpact: '+5 pontos estimados'
      },
      {
        id: 'init_2',
        title: 'Redesign do dashboard',
        status: 'BACKLOG',
        priority: 'HIGH',
        owner: 'Head de Produto',
        dueDate: '2024-11-15',
        source: 'NPS Feedback',
        affectedUsers: 45,
        npsImpact: '+8 pontos estimados'
      }
    ];
    
    res.json({
      success: true,
      data: initiatives,
      message: 'Iniciativas da voz do cliente listadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao listar iniciativas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// FASE 4: FECHAMENTO DO LOOP

/**
 * Gera comunicação de melhorias implementadas
 */
router.post('/communication/improvements', async (req, res) => {
  try {
    const { implementedFeatures } = req.body;
    
    if (!implementedFeatures || !Array.isArray(implementedFeatures)) {
      return res.status(400).json({
        success: false,
        message: 'implementedFeatures deve ser um array'
      });
    }
    
    const communication = await npsService.generateImprovementCommunication(implementedFeatures);
    
    res.json({
      success: true,
      data: {
        communication,
        featuresCount: implementedFeatures.length
      },
      message: 'Comunicação de melhorias gerada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao gerar comunicação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * Marca detrator como contatado
 */
router.post('/outreach/mark-contacted', async (req, res) => {
  try {
    const { userId, contactMethod, notes } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId é obrigatório'
      });
    }
    
    // Mock - implementar marcação real
    console.log(`📞 Detractor ${userId} contacted via ${contactMethod}`);
    
    res.json({
      success: true,
      data: {
        userId,
        contactedAt: new Date().toISOString(),
        contactMethod,
        notes
      },
      message: 'Contato com detrator registrado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao registrar contato:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * Busca impacto do feedback de um usuário
 */
router.get('/impact/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Mock data - implementar cálculo real
    const impact = {
      userId,
      feedbackCount: 3,
      implementedCount: 2,
      implementedSuggestions: [
        {
          title: 'Melhoria na performance do app',
          date: '2024-10-15',
          yourFeedback: 'App estava muito lento'
        },
        {
          title: 'Nova funcionalidade de relatórios',
          date: '2024-10-10',
          yourFeedback: 'Gostaria de ver meu progresso em gráficos'
        }
      ],
      npsEvolution: [
        { date: '2024-09-01', score: 6 },
        { date: '2024-10-01', score: 8 },
        { date: '2024-10-18', score: 9 }
      ]
    };
    
    res.json({
      success: true,
      data: impact,
      message: 'Impacto do feedback recuperado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar impacto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * Métricas gerais do sistema NPS
 */
router.get('/metrics/overview', async (req, res) => {
  try {
    // Mock data - implementar cálculo real
    const metrics = {
      totalResponses: 1247,
      currentNPS: 42,
      npsEvolution: [
        { month: '2024-07', score: 28 },
        { month: '2024-08', score: 35 },
        { month: '2024-09', score: 38 },
        { month: '2024-10', score: 42 }
      ],
      responseRate: 24.3,
      roadmapInfluence: {
        totalInitiatives: 23,
        completed: 8,
        inProgress: 7,
        backlog: 8
      },
      communicationReach: {
        emailsSent: 156,
        inAppNotifications: 89,
        personalOutreach: 12
      },
      businessImpact: {
        churnReduction: '15%',
        retentionImprovement: '22%',
        revenueSaved: 'R$ 45.000'
      }
    };
    
    res.json({
      success: true,
      data: metrics,
      message: 'Métricas gerais recuperadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

export default router;
