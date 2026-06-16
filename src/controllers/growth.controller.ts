import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { GrowthEngineService } from '../services/growthEngine.service.js';
import { visibilityService } from '../services/visibility.service.js';

export class GrowthController {
  /**
   * Retorna as métricas de crescimento do parceiro atual.
   */
  async getMetrics(req: any, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Não autenticado.' });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { partner: true, Pharmacy: true }
      });

      const partnerId = user?.Partner?.id || user?.Pharmacy?.id;
      if (!partnerId) {
        return res.status(403).json({ error: 'Acesso negado. Perfil de parceiro não encontrado.' });
      }

      const metrics = await GrowthEngineService.getPartnerMetrics(partnerId);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Gera e retorna insights baseados em IA.
   */
  async getInsights(req: any, res: Response) {
    try {
      const userId = req.user?.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { partner: true, Pharmacy: true }
      });

      const partnerId = user?.Partner?.id || user?.Pharmacy?.id;
      if (!partnerId) return res.status(403).json({ error: 'Não autorizado.' });

      const insights = await GrowthEngineService.generateInsights(partnerId);
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cria um novo template de campanha.
   */
  async createTemplate(req: Request, res: Response) {
    try {
      const { name, description, category, type, objective, baseContent } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório.' });
      }

      const template = await prisma.campaignTemplate.create({
        data: {
          name,
          description,
          category: category || 'Personalizada',
          type: type || 'WHATSAPP',
          objective: objective || 'RETENTION',
          baseContent: baseContent || '',
          isActive: true
        }
      });
      res.status(201).json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Atualiza um template existente.
   */
  async updateTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await prisma.campaignTemplate.update({
        where: { id },
        data
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Remove um template.
   */
  async deleteTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.campaignTemplate.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Retorna os templates de campanhas disponíveis (Marketplace).
   */
  async getTemplates(_req: Request, res: Response) {
    try {
      const templates = await prisma.campaignTemplate.findMany({
        where: { isActive: true },
        orderBy: { usageCount: 'desc' }
      });
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Ativa uma campanha a partir de um template.
   */
  async activateCampaign(req: any, res: Response) {
    try {
      const userId = req.user?.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { partner: true, Pharmacy: true }
      });

      const partnerId = user?.Partner?.id || user?.Pharmacy?.id;
      const { templateId, audienceFilter } = req.body;

      if (!partnerId || !templateId) {
        return res.status(400).json({ error: 'Parâmetros inválidos ou parceiro não identificado.' });
      }

      const campaign = await GrowthEngineService.activateCampaign(partnerId, templateId, audienceFilter);
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Estatísticas básicas de visibilidade (Boosts).
   */
  async getStats(req: any, res: Response) {
    try {
      const userId = req.user?.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { partner: true, Pharmacy: true }
      });

      const partnerId = user?.Partner?.id || user?.Pharmacy?.id;
      if (!partnerId) return res.status(403).json({ error: 'Não autorizado.' });

      const stats = await visibilityService.getGrowthStats(partnerId);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar stats' });
    }
  }

  async activateBoost(req: any, res: Response) {
    try {
      const userId = req.user?.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { partner: true, Pharmacy: true }
      });

      const partnerId = user?.Partner?.id || user?.Pharmacy?.id;
      const { type, price, config } = req.body;
      
      if (!partnerId) return res.status(403).json({ error: 'Não autorizado. Perfil de parceiro ausente.' });

      const boost = await visibilityService.activateBoost(partnerId, type, price, config);
      res.json(boost);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async recordClick(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      await visibilityService.recordClick(partnerId);
      res.json({ success: true });
    } catch (err) {
      res.json({ success: false });
    }
  }

  /**
   * Lista todas as campanhas do parceiro (Ativas e Completadas).
   */
  async getCampaigns(req: any, res: Response) {
    try {
      const userId = req.user?.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { partner: true, Pharmacy: true }
      });

      const partnerId = user?.Partner?.id || user?.Pharmacy?.id;
      if (!partnerId) return res.status(403).json({ error: 'Não autorizado.' });

      const campaigns = await prisma.marketingCampaign.findMany({
        where: { partnerId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cria uma campanha manual (Investimento Marketing).
   */
  async createManualCampaign(req: any, res: Response) {
    try {
      const userId = req.user?.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { partner: true, Pharmacy: true }
      });

      const partnerId = user?.Partner?.id || user?.Pharmacy?.id;
      const { name, type, objective, cost } = req.body;

      if (!partnerId || !name) {
        return res.status(400).json({ error: 'Nome é obrigatório.' });
      }

      const campaign = await prisma.marketingCampaign.create({
        data: {
          partnerId,
          name,
          type: type || 'OUTRO',
          objective: objective || 'ACQUISITION',
          status: 'COMPLETED',
          stats: { cost: Number(cost) || 0 },
          startedAt: new Date(),
          endedAt: new Date()
        }
      });

      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Remove uma campanha/investimento.
   */
  async deleteCampaign(req: any, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      // Validação de posse do recurso
      const campaign = await prisma.marketingCampaign.findUnique({ where: { id } });
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { partner: true, Pharmacy: true }
      });
      const partnerId = user?.Partner?.id || user?.Pharmacy?.id;

      if (campaign?.partnerId !== partnerId) {
        return res.status(403).json({ error: 'Não autorizado.' });
      }

      await prisma.marketingCampaign.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Retorna os dados segmentados para o CRM Inteligente.
   */
  async getCRM(req: any, res: Response) {
    try {
      const userId = req.user?.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { partner: true, Pharmacy: true }
      });

      const partnerId = user?.Partner?.id || user?.Pharmacy?.id;
      if (!partnerId) return res.status(403).json({ error: 'Não autorizado.' });

      const data = await GrowthEngineService.getCRMData(partnerId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cria um novo paciente e o vincula ao parceiro.
   */
  async createPatient(req: any, res: Response) {
    try {
      const userId = req.user?.userId;
      const userFull = await prisma.user.findUnique({
        where: { id: userId },
        include: { partner: true, Pharmacy: true }
      });

      const partnerId = userFull?.Partner?.id || userFull?.Pharmacy?.id;
      const { name, email, phone } = req.body;

      if (!partnerId || !name) {
        return res.status(400).json({ error: 'Nome é obrigatório ou parceiro não identificado.' });
      }

      let user = null;
      if (email) {
        user = await prisma.user.findUnique({ where: { email } });
      }

      if (!user) {
        user = await prisma.user.create({
          data: {
            name,
            email: email || `${Date.now()}@temp.docton.com`,
            phone,
            password: 'temporary_password_123',
            role: 'PATIENT',
            updatedAt: new Date()
          }
        });
        
        await prisma.patient.create({
          data: {
            userId: user.id,
            updatedAt: new Date()
          }
        });
      }

      const patient = await prisma.patient.findUnique({ where: { userId: user.id } });

      await prisma.validationCodeLog.create({
        data: {
          code: 'MANUAL',
          status: 'VALIDATED',
          partnerId,
          patientId: patient?.id || '',
          timestamp: new Date()
        }
      });

      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Retorna os preços dinâmicos dos boosts cadastrados no sistema.
   */
  async getBoostPrices(_req: Request, res: Response) {
    try {
      const prices = await prisma.boostPrice.findMany();
      res.json(prices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

const growthController = new GrowthController();
export default growthController;
