declare class PredictiveAlertsService {
    /**
     * Analyze user health patterns and generate alerts
     */
    analyzeHealthPatterns(userId: string): Promise<any[]>;
    private analyzeBloodPressure;
    /**
     * Analyze no-show risk based on appointment history
     */
    private analyzeNoShowRisk;
    /**
     * Analyze medication adherence
     */
    private analyzeMedicationAdherence;
    /**
     * Analyze checkup needs based on last visit
     */
    private analyzeCheckupNeeds;
    /**
     * Create predictive alert
     */
    createAlert(userId: string, type: string, severity: string, message: string, data: any): Promise<void>;
    /**
     * Get user alerts
     */
    getUserAlerts(userId: string, includesDismissed?: boolean): Promise<any>;
    /**
     * Dismiss alert
     */
    dismissAlert(alertId: string): Promise<void>;
    /**
     * Run daily analysis for all active users
     */
    runDailyAnalysis(): Promise<void>;
}
declare const _default: PredictiveAlertsService;
export default _default;
//# sourceMappingURL=predictive-alerts.service.d.ts.map