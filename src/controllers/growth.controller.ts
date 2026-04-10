import { Request, Response } from 'express';
import { visibilityService } from '../services/visibility.service.js';
import prisma from '../lib/prisma.js';

export class GrowthController {
  /**
   * Resgata estatísticas de crescimento e visibilidade para o parceiro logado
   */
  getStats = async (req: any, res: Response) => {
    try {
      const partnerId = await this.getPartnerId(req);
      if (!partnerId) return res.status(403).json({ error: 'Acesso negado. Apenas parceiros podem acessar.' });

      const stats = await visibilityService.getGrowthStats(partnerId);
      return res.json(stats);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
  }

  /**
   * Ativa um boost (impulso de visibilidade)
   */
  activateBoost = async (req: any, res: Response) => {
    try {
      const partnerId = await this.getPartnerId(req);
      const { type, config, price, durationDays } = req.body;

      if (!partnerId) return res.status(403).json({ error: 'Acesso negado.' });
      if (!type) return res.status(400).json({ error: 'Tipo de boost é obrigatório.' });

      const boost = await visibilityService.activateBoost(
        partnerId,
        type,
        price || 0,
        config || {},
        durationDays || 30
      );

      return res.status(201).json(boost);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro interno ao ativar boost' });
    }
  }

  /**
   * Registra um clique no perfil (para métricas e ranking)
   */
  recordClick = async (req: Request, res: Response) => {
    try {
      const { partnerId } = req.params;
      if (!partnerId) return res.status(400).json({ error: 'ID do parceiro é obrigatório.' });

      await visibilityService.recordClick(partnerId);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao registrar clique' });
    }
  }

  /**
   * Auxiliar para pegar o ID do parceiro a partir do usuário
   */
  private async getPartnerId(req: any): Promise<string | null> {
    const userId = req.user?.userId;
    if (!userId) return null;

    const partner = await prisma.partner.findFirst({
      where: { userId },
      select: { id: true }
    });

    return partner?.id || null;
  }
}

const growthController = new GrowthController();
export default growthController;
