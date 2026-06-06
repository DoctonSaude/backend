// @ts-nocheck
import prisma from '../lib/prisma';

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

export class AdminAiInsightService {
    async getGlobalInsights() {
        const insights = await prisma.aiInsight.findMany({
            include: {
                user: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return insights.map(i => ({
            ...i,
            patientName: i.user?.name || 'Sistema'
        }));
    }

    async getAiModels(): Promise<AdminAiModel[]> {
        // Mapeamos PredictiveModel para o formato esperado pelo frontend
        const models = await prisma.predictiveModel.findMany();

        return models.map(m => ({
            id: m.id,
            name: m.name,
            type: 'Preditivo',
            status: 'active',
            accuracy: m.accuracy * 100,
            lastTrained: m.lastTrained
        }));
    }

    async generateGlobalInsights() {
        // Aqui seria a lógica para disparar uma análise em toda a base
        // Para fins de demonstração e integração, vamos simular a criação de um insight global
        const newInsight = await prisma.aiInsight.create({
            data: {
                type: 'trend',
                title: 'Aumento na adesão vacinal',
                description: 'Observamos um aumento de 15% na busca por vacinas preventivas na última semana.',
                confidence: 94,
                impact: 'Positivo',
                category: 'preventive',
                actionable: true,
                priority: 2
            }
        });

        return newInsight;
    }

    async trainModel(id: string) {
        return prisma.predictiveModel.update({
            where: { id },
            data: {
                lastTrained: new Date(),
                accuracy: 0.95 // Simulando melhora na precisão após treino
            }
        });
    }
}

export const adminAiInsightService = new AdminAiInsightService();
