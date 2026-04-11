/**
 * SERVIÇO DE COMUNICAÇÃO DE FEEDBACK
 * FASE 4: Fechamento do loop - "Vocês pediram, nós fizemos"
 */
export interface ImprovementCommunication {
    id: string;
    title: string;
    description: string;
    implementationDate: string;
    originalFeedback: string[];
    impactMetrics: {
        npsImpact?: number;
        usersSatisfied?: number;
        problemsSolved?: number;
    };
    channels: ('email' | 'in-app' | 'push' | 'release-notes' | 'social')[];
    targetAudience: {
        allUsers: boolean;
        feedbackProviders: boolean;
        specificSegment?: string;
        userIds?: string[];
    };
    scheduledDate: string;
    sentDate?: string;
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED';
}
export interface PersonalOutreach {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    originalNPSScore: number;
    originalFeedback: string;
    planType: string;
    outreachType: 'EMAIL' | 'PHONE' | 'WHATSAPP' | 'IN_APP';
    message: string;
    scheduledDate: string;
    sentDate?: string;
    responseReceived?: boolean;
    followUpScheduled?: string;
    status: 'PENDING' | 'SENT' | 'RESPONDED' | 'FOLLOW_UP' | 'CLOSED';
}
export interface FeedbackLoopMetrics {
    communicationsSent: number;
    personalOutreachSent: number;
    responseRate: number;
    npsImprovementFromCommunication: number;
    userEngagementIncrease: number;
    detractorConversionRate: number;
}
export declare class FeedbackCommunicationService {
    /**
     * Gera comunicação "Vocês pediram, nós fizemos"
     */
    createImprovementCommunication(data: {
        improvements: string[];
        implementationDate: string;
        originalFeedbacks: string[];
        targetAudience?: Partial<ImprovementCommunication['targetAudience']>;
        channels?: ImprovementCommunication['channels'];
    }): Promise<ImprovementCommunication>;
    /**
     * Agenda outreach personalizado para detrator
     */
    schedulePersonalOutreach(data: {
        userId: string;
        userName: string;
        userEmail: string;
        npsScore: number;
        feedback: string;
        planType: string;
        preferredMethod?: PersonalOutreach['outreachType'];
    }): Promise<PersonalOutreach>;
    /**
     * Executa comunicação de melhoria
     */
    executeCommunication(communicationId: string): Promise<void>;
    /**
     * Executa outreach pessoal
     */
    executePersonalOutreach(outreachId: string): Promise<void>;
    /**
     * Processa resposta de outreach
     */
    processOutreachResponse(outreachId: string, response: {
        satisfied: boolean;
        newNPSScore?: number;
        additionalFeedback?: string;
    }): Promise<void>;
    /**
     * Gera relatório de impacto das comunicações
     */
    generateImpactReport(days?: number): Promise<any>;
    /**
     * Busca usuários que forneceram feedback específico
     */
    findUsersWhoProvidedFeedback(feedbackTheme: string): Promise<string[]>;
    private generateCommunicationTitle;
    private generateCommunicationContent;
    private generatePersonalMessage;
    private sendThroughChannel;
    private sendEmail;
    private sendInAppAnnouncement;
    private sendPersonalEmail;
    private sendWhatsAppMessage;
    private determineOptimalOutreachMethod;
    private extractMainIssue;
    private proposeSolution;
    private saveCommunication;
    private saveOutreach;
    private getCommunicationById;
    private getOutreachById;
    private calculateImpactMetrics;
    private scheduleOutreachExecution;
    private scheduleImpactMeasurement;
    private calculateResponseRate;
    private calculateConversionRate;
    private getCommunicationsSince;
    private getOutreachesSince;
    private calculateTotalReach;
    private calculateEngagementRate;
    private calculateNPSImpactFromCommunications;
    private countDetractorConversions;
    private calculateRetentionImpact;
    private getTopSuccessStories;
    private recordNPSImprovement;
    private scheduleFollowUp;
    private sendPushNotification;
    private addToReleaseNotes;
    private postToSocialMedia;
    private sendInAppNotification;
    private schedulePhoneCall;
}
export default FeedbackCommunicationService;
//# sourceMappingURL=feedback-communication.service.d.ts.map