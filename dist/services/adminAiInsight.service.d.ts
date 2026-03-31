export interface AdminAiInsight {
    id: string;
    type: string;
    title: string;
    description: string;
    confidence: number;
    impact: string;
    category: string;
    actionable: boolean;
    priority: number;
    createdAt: Date;
    patientName?: string;
}
export interface AdminAiModel {
    id: string;
    name: string;
    type: string;
    status: 'active' | 'training' | 'idle';
    accuracy: number;
    lastTrained: Date | null;
    nextTraining?: Date | null;
}
export declare class AdminAiInsightService {
    getGlobalInsights(): Promise<{
        patientName: string;
        user: {
            name: string;
        };
        type: string;
        data: import("../../lib/generated/prisma/runtime/library").JsonValue | null;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        priority: number;
        category: string;
        actionable: boolean;
        confidence: number;
        impact: string;
    }[]>;
    getAiModels(): Promise<AdminAiModel[]>;
    generateGlobalInsights(): Promise<{
        type: string;
        data: import("../../lib/generated/prisma/runtime/library").JsonValue | null;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        priority: number;
        category: string;
        actionable: boolean;
        confidence: number;
        impact: string;
    }>;
    trainModel(id: string): Promise<{
        description: string | null;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        accuracy: number;
        lastTrained: Date | null;
        predictions: import("../../lib/generated/prisma/runtime/library").JsonValue | null;
    }>;
}
export declare const adminAiInsightService: AdminAiInsightService;
//# sourceMappingURL=adminAiInsight.service.d.ts.map