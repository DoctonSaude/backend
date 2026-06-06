import { Request, Response } from 'express';
export declare class GrowthController {
    /**
     * Resgata estatísticas de crescimento e visibilidade para o parceiro logado
     */
    getStats: (req: any, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Ativa um boost (impulso de visibilidade)
     */
    activateBoost: (req: any, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Registra um clique no perfil (para métricas e ranking)
     */
    recordClick: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Auxiliar para pegar o ID do parceiro a partir do usuário
     */
    private getPartnerId;
}
declare const growthController: GrowthController;
export default growthController;
//# sourceMappingURL=growth.controller.d.ts.map