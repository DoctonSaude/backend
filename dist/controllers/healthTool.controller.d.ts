import { Request, Response } from 'express';
export declare class HealthToolController {
    /**
     * Analisar sintomas usando IA (OpenAI)
     */
    analyzeSymptoms(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Verificar interações medicamentosas usando IA
     */
    checkInteractions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Obter histórico de ferramentas de saúde
     */
    getHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Salvar resultado de calculadoras
     */
    saveCalculation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
declare const healthToolController: HealthToolController;
export default healthToolController;
//# sourceMappingURL=healthTool.controller.d.ts.map