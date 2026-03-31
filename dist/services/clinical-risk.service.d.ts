export declare class ClinicalRiskService {
    /**
     * Calcula o risco clínico de um paciente baseado em logs de saúde
     */
    static calculateClinicalRisk(patientId: string): Promise<string>;
    /**
     * Sincroniza o risco clínico com o registro de funcionário B2B
     */
    static syncRiskWithB2B(patientId: string, riskLevel: string): Promise<void>;
    /**
     * Gera alertas preditivos se o risco subir
     */
    static triggerRiskAlerts(patientId: string, riskLevel: string): Promise<void>;
}
//# sourceMappingURL=clinical-risk.service.d.ts.map