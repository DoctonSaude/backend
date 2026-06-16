import prisma from '../lib/prisma.js';
import openAiService from './ai/openai.service.js';
import whatsappService from './whatsapp.service.js';

export interface PartnerMetrics {
  totalRevenue: number;
  totalAppointments: number;
  returnRate: number;
  repurchaseRate: number;
  inactivePatients: number;
  averageTicket: number;
  cac: number;
  ltv: number;
  returnDistribution?: {
    new: number;
    returning: number;
  };
  growthScore?: number;
}

export class GrowthEngineService {
  /**
   * Calcula as métricas principais de crescimento para um parceiro.
   */
  static async getPartnerMetrics(partnerId: string): Promise<PartnerMetrics> {
    const now = new Date();

    // 1. Faturamento Total (Transações completadas)
    const transactions = await prisma.transaction.findMany({
      where: { partnerId, status: 'COMPLETED' }
    });
    const totalRevenue = transactions.reduce((acc, t) => acc + t.amount, 0);

    // 2. Agendamentos Totais
    const totalAppointments = await prisma.appointment.count({
      where: { partnerId }
    });

    // 3. Taxa de Retorno (% de pacientes com > 1 consulta)
    const patientCounts = await prisma.appointment.groupBy({
      by: ['patientId'],
      where: { partnerId },
      _count: { patientId: true }
    });
    const returningPatients = patientCounts.filter(p => p._count.patientId > 1).length;
    const totalPatients = patientCounts.length;
    const returnRate = totalPatients > 0 ? (returningPatients / totalPatients) * 100 : 0;

    // 4. Taxa de Recompra (baseado em UserProductStats se disponível para o inquilino/parceiro)
    // Nota: Como UserProductStats é vinculado ao User, precisamos buscar via usuários vinculados ao parceiro
    // Para simplificar no MVP, buscaremos pedidos de farmácia vinculados à economicGroupId se existir
    const stats = await prisma.userProductStats.count({
      where: { isRecurring: true }
    });
    const totalStats = await prisma.userProductStats.count();
    const repurchaseRate = totalStats > 0 ? (stats / totalStats) * 100 : 0;

    // 5. Pacientes Inativos (Sem agendamento há mais de 90 dias)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const activePatientIds = await prisma.appointment.findMany({
      where: {
        partnerId,
        dateTime: { gte: ninetyDaysAgo }
      },
      select: { patientId: true }
    });
    const activeIds = new Set(activePatientIds.map(a => a.patientId));
    const allPatientIds = new Set(patientCounts.map(p => p.patientId));
    const inactivePatients = Array.from(allPatientIds).filter(id => !activeIds.has(id)).length;

    // 6. Ticket Médio
    const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

    // 7. CAC & LTV (Estimados)
    const campaignsCount = await prisma.marketingCampaign.findMany({
      where: { partnerId, status: 'COMPLETED' }
    });
    const totalMarketingSpend = campaignsCount.reduce((acc, c) => acc + (c.stats as any)?.cost || 0, 0);
    const cac = totalPatients > 0 ? totalMarketingSpend / totalPatients : 0;
    const ltv = totalPatients > 0 ? totalRevenue / totalPatients : averageTicket;

    // 8. Distribuição de Retorno (Novos vs Recorrentes)
    const distribution = {
      new: totalPatients > 0 ? ((totalPatients - returningPatients) / totalPatients) * 100 : 0,
      returning: totalPatients > 0 ? (returningPatients / totalPatients) * 100 : 0
    };

    // 9. Score de Crescimento (Cálculo ponderado 0-100)
    // Fatores: Taxa de Retorno (40%), Ticket Médio vs 150 (30%), Volume (30%)
    const scoreBase = (returnRate * 0.4) + (Math.min(100, (averageTicket / 150) * 100) * 0.3) + (Math.min(100, totalAppointments) * 0.3);
    const growthScore = Math.min(100, Math.round(scoreBase || 0));

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalAppointments,
      returnRate: Number(returnRate.toFixed(1)),
      repurchaseRate: Number(repurchaseRate.toFixed(1)),
      inactivePatients,
      averageTicket: Number(averageTicket.toFixed(2)),
      cac: Number(cac.toFixed(2)),
      ltv: Number(ltv.toFixed(2)),
      returnDistribution: distribution,
      growthScore
    };
  }

  /**
   * Gera insights acionáveis usando IA baseada nos dados do parceiro.
   */
  static async generateInsights(partnerId: string) {
    const metrics = await this.getPartnerMetrics(partnerId);
    
    // Buscar modelos de campanhas disponíveis para sugestão
    const templates = await prisma.campaignTemplate.findMany({ where: { isActive: true }, take: 5 });

    const prompt = `
      Você é o Docton Growth Engine, um assistente de IA focado em crescer clínicas e farmácias.
      Analise as seguintes métricas de um parceiro e gere 3 insights acionáveis de alta prioridade.
      
      Métricas Atuais:
      - Faturamento: R$ ${metrics.totalRevenue}
      - Taxa de Retorno: ${metrics.returnRate}%
      - Pacientes Inativos: ${metrics.inactivePatients}
      - Recompra: ${metrics.repurchaseRate}%
      
      Modelos de Campanhas Disponíveis:
      // @ts-ignore - TODO: Schema drift fix
      ${templates.map(t => `- ${t.name} (Objetivo: ${t.category})`).join('\n')}
      
      Retorne APENAS um JSON array no seguinte formato:
      [
        {
          "title": "Título Curto",
          "description": "Explicação do porquê e o benefício esperado",
          "type": "REVENUE_OPPORTUNITY", // ou CHURN_ALERT, RECURRENCE_DETECTION
          "priority": "HIGH",
          "actionType": "QUICK_CAMPAIGN",
          "actionData": { "templateId": "id_do_template_sugerido" }
        }
      ]
    `;

    const aiResponse = await openAiService.chat([{ role: 'system', content: 'Você é um especialista em marketing médico e de farmácia.' }, { role: 'user', content: prompt }]);
    
    if (!aiResponse) return [];

    try {
      const insights = JSON.parse(aiResponse);
      
      // Limpar insights antigos não executados
      await prisma.growthInsight.deleteMany({
        where: { partnerId, isExecuted: false }
      });

      // Salvar novos insights
      const savedInsights = await Promise.all(insights.map((insight: any) => 
        prisma.growthInsight.create({
          data: {
            ...insight,
            partnerId
          }
        })
      ));

      return savedInsights;
    } catch (e) {
      console.error('[GROWTH ENGINE] Erro ao processar insights da IA:', e);
      return [];
    }
  }

  /**
   * Ativa uma campanha (simulação de envio de triggers).
   */
  static async activateCampaign(partnerId: string, templateId: string, audienceFilter: any) {
    const template = await prisma.campaignTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error('Template não encontrado');

    const campaign = await prisma.marketingCampaign.create({
      data: {
        partnerId,
        name: template.name,
        type: template.type,
        objective: template.objective,
        status: 'ACTIVE',
        targetAudience: audienceFilter,
        content: template.baseContent || null,
        startedAt: new Date()
      }
    });

    // Aqui dispararia os jobs de segundo plano para WhatsApp/Push/Email
    // Por enquanto, marcamos como ativa e incrementamos o uso do template
    await prisma.campaignTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } }
    });

    return campaign;
  }

  /**
   * Busca dados segmentados de pacientes para o CRM Inteligente.
   */
  static async getCRMData(partnerId: string) {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Buscar todos os pacientes do parceiro via Agendamentos
    const patientCounts = await prisma.appointment.groupBy({
      by: ['patientId'],
      where: { partnerId },
      _count: { patientId: true },
      _max: { dateTime: true }
    });

    const activeIds = patientCounts
      .filter(p => p._max.dateTime && p._max.dateTime >= ninetyDaysAgo)
      .map(p => p.patientId);

    const inactiveIds = patientCounts
      .filter(p => !p._max.dateTime || p._max.dateTime < ninetyDaysAgo)
      .map(p => p.patientId);

    const vipIds = patientCounts
      .filter(p => p._count.patientId >= 5)
      .map(p => p.patientId);

    // Buscar detalhes dos pacientes
    // Buscar detalhes dos pacientes via relação Patient -> User
    const patientsData = await prisma.patient.findMany({
      where: { 
        id: { in: patientCounts.map(p => p.patientId) }
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true
          }
        }
      }
    });

    const patients = patientsData.map(p => ({
      id: p.id,
      name: p.User?.name || 'Paciente',
      email: p.User?.email,
      phone: p.User?.phone,
      createdAt: p.User?.createdAt || p.createdAt
    }));

    return {
      summary: {
        total: patients.length,
        active: activeIds.length,
        inactive: inactiveIds.length,
        vip: vipIds.length
      },
      segments: {
        active: patients.filter(p => activeIds.includes(p.id)),
        inactive: patients.filter(p => inactiveIds.includes(p.id)),
        vip: patients.filter(p => vipIds.includes(p.id))
      }
    };
  }

  /**
   * Executa uma campanha ativa disparando mensagens reais.
   */
  static async executeCampaign(campaignId: string) {
    const campaign = await prisma.marketingCampaign.findUnique({
      where: { id: campaignId },
      include: { Partner: true }
    });

    if (!campaign || campaign.status !== 'ACTIVE') return;

    // Lógica simplificada: se for mensagem de reativação para inativos
    const crmData = await this.getCRMData(campaign.partnerId!);
    const targetPatients = campaign.objective === 'RETENTION' 
      ? crmData.segments.inactive 
      : crmData.segments.active;

    let sentCount = 0;
    const content = (campaign.content as any)?.copy || campaign.content || 'Olá! Temos uma novidade para você.';

    // Disparar via WhatsApp (InstanceName = partnerId para ser multieconomicGroup no futuro ou admin para MVP)
    // No MVP usaremos a primeira conexão ativa 'main' ou personalizada do parceiro
    const connection = await prisma.adminWhatsappConnection.findFirst({
      where: { status: 'CONNECTED' }
    });

    if (!connection) {
      console.warn('[GROWTH ENGINE] Nenhuma conexão WhatsApp ativa para disparar campanha.');
      return;
    }

    for (const patient of targetPatients) {
      if (!patient.phone) continue;
      try {
        await whatsappService.sendMessage(connection.instanceName, patient.phone, content.replace('{{name}}', patient.name));
        sentCount++;
        // Throttling para evitar block
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Erro ao enviar para ${patient.id}:`, e);
      }
    }

    await prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        stats: { sent: sentCount, target: targetPatients.length }
      }
    });
  }
}
