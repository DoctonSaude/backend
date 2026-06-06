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
        patientName: any;
        type: string;
        data: import("lib/generated/prisma/runtime/library").JsonValue | null;
        title: string;
        priority: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        category: string;
        userId: string | null;
        confidence: number;
        actionable: boolean;
        impact: string;
    }[]>;
    getAiModels(): Promise<AdminAiModel[]>;
    generateGlobalInsights(): Promise<{
        type: string;
        data: import("lib/generated/prisma/runtime/library").JsonValue | null;
        title: string;
        priority: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        category: string;
        userId: string | null;
        confidence: number;
        actionable: boolean;
        impact: string;
    }>;
    trainModel(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        accuracy: number;
        lastTrained: Date | null;
        predictions: import("lib/generated/prisma/runtime/library").JsonValue | null;
    }>;
}
export declare const adminAiInsightService: AdminAiInsightService;
//# sourceMappingURL=adminAiInsight.service.d.ts.map