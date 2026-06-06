"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrowthController = void 0;
const visibility_service_js_1 = require("../services/visibility.service.js");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
class GrowthController {
    /**
     * Resgata estatísticas de crescimento e visibilidade para o parceiro logado
     */
    getStats = async (req, res) => {
        try {
            const partnerId = await this.getPartnerId(req);
            if (!partnerId)
                return res.status(403).json({ error: 'Acesso negado. Apenas parceiros podem acessar.' });
            const stats = await visibility_service_js_1.visibilityService.getGrowthStats(partnerId);
            return res.json(stats);
        }
        catch (error) {
            return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
        }
    };
    /**
     * Ativa um boost (impulso de visibilidade)
     */
    activateBoost = async (req, res) => {
        try {
            const partnerId = await this.getPartnerId(req);
            const { type, config, price, durationDays } = req.body;
            if (!partnerId)
                return res.status(403).json({ error: 'Acesso negado.' });
            if (!type)
                return res.status(400).json({ error: 'Tipo de boost é obrigatório.' });
            const boost = await visibility_service_js_1.visibilityService.activateBoost(partnerId, type, price || 0, config || {}, durationDays || 30);
            return res.status(201).json(boost);
        }
        catch (error) {
            return res.status(500).json({ error: error.message || 'Erro interno ao ativar boost' });
        }
    };
    /**
     * Registra um clique no perfil (para métricas e ranking)
     */
    recordClick = async (req, res) => {
        try {
            const { partnerId } = req.params;
            if (!partnerId)
                return res.status(400).json({ error: 'ID do parceiro é obrigatório.' });
            await visibility_service_js_1.visibilityService.recordClick(partnerId);
            return res.json({ success: true });
        }
        catch (error) {
            return res.status(500).json({ error: 'Erro ao registrar clique' });
        }
    };
    /**
     * Auxiliar para pegar o ID do parceiro a partir do usuário
     */
    async getPartnerId(req) {
        const userId = req.user?.userId;
        if (!userId)
            return null;
        const partner = await prisma_js_1.default.partner.findFirst({
            where: { userId },
            select: { id: true }
        });
        return partner?.id || null;
    }
}
exports.GrowthController = GrowthController;
const growthController = new GrowthController();
exports.default = growthController;
//# sourceMappingURL=growth.controller.js.map