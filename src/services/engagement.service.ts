import prisma from '../lib/prisma.js';
import { createNotification } from './inAppNotification.service.js';

export class EngagementService {
    /**
     * Inicia uma jornada de tratamento automatizada (Ex: Pós-cirúrgico, Tratamento Crônico)
     */
    async startTreatmentJourney(patientId: string, journeyType: 'POST_OP' | 'CHRONIC_FOLLOWUP') {
        const triggers = {
            'POST_OP': [
                { day: 1, message: 'Como está se sentindo hoje após o procedimento? Lembre-se do repouso.' },
                { day: 3, message: 'Hoje é o dia de trocar o curativo conforme orientado.' },
                { day: 7, message: 'Hora de marcar seu retorno presencial para retirada de pontos.' }
            ],
            'CHRONIC_FOLLOWUP': [
                { day: 30, message: 'Não esqueça de renovar sua receita este mês.' },
                { day: 90, message: 'Hora de realizar seus exames de rotina trimestrais.' }
            ]
        };

        const now = new Date();
        const activeTriggers = triggers[journeyType];

        for (const trigger of activeTriggers) {
            const scheduledAt = new Date(now.getTime() + trigger.day * 24 * 60 * 60 * 1000);
            const patient = await prisma.patient.findUnique({ where: { id: patientId } });

            if (!patient?.personId) continue;

            // Criar notificação agendada (Futuramente em um sistema de filas)
            await (prisma as any).notification.create({
                data: {
                    personId: patient.personId,
                    title: 'Acompanhamento Clínico',
                    message: trigger.message,
                    type: 'CLINICAL_FOLLOWUP',
                    priority: 'high',
                    createdAt: scheduledAt // Usamos createdAt como data de disparo para simplificar
                }
            });
        }
    }

    /**
     * Reativação automática de pacientes que não agendam há X dias
     */
    async autoReactivateChurningPatients(partnerId: string, daysInactive = 60) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysInactive);

        // Buscar pacientes que tiveram consultas com este parceiro mas não desde thresholdDate
        const patients = await (prisma as any).appointment.groupBy({
            by: ['patientId'],
            where: {
                partnerId,
                dateTime: { lt: thresholdDate },
                status: 'COMPLETED'
            },
            having: {
                patientId: {
                    _max: {
                        dateTime: { lt: thresholdDate }
                    }
                }
            }
        });

        for (const p of patients) {
            const patient = await prisma.patient.findUnique({
                where: { id: p.patientId },
                include: { person: true }
            });

            if (!patient || !patient.personId)
                continue;

            await createNotification({
                personId: patient.personId,
                title: 'Sentimos sua falta!',
                message: `Olá ${patient.person.name}, faz tempo que não nos vemos. Que tal agendar seu check-up de rotina?`,
                type: 'REACTIVATION'
            } as any);
        }

        return patients.length;
    }

    // --- Challenge Management (Partner) ---
    async listChallenges(partnerId: string) {
        return prisma.challenge.findMany({
            where: { createdBy: partnerId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async createChallenge(data, partnerId: string) {
        return prisma.challenge.create({
            data: {
                ...data,
                createdBy: partnerId,
                isActive: data.isActive ?? true
            }
        });
    }

    async updateChallenge(id: string, data, partnerId: string) {
        // Verify ownership
        const challenge = await prisma.challenge.findUnique({ where: { id } });
        if (!challenge || challenge.createdBy !== partnerId) {
            throw new Error('Challenge not found or permission denied');
        }

        return prisma.challenge.update({
            where: { id },
            data
        });
    }

    async deleteChallenge(id: string, partnerId: string) {
        // Verify ownership
        const challenge = await prisma.challenge.findUnique({ where: { id } });
        if (!challenge || challenge.createdBy !== partnerId) {
            throw new Error('Challenge not found or permission denied');
        }

        return prisma.challenge.delete({ where: { id } });
    }

    async getSettings(partnerId: string) {
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId },
            select: { settings: true }
        });

        const settings = typeof partner?.settings === 'string'
            ? JSON.parse(partner.settings)
            : (partner?.settings as any || {});

        return settings.engagement || { automationEnabled: false };
    }

    async updateSettings(partnerId: string, engagementSettings) {
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId },
            select: { settings: true }
        });

        const currentSettings = typeof partner?.settings === 'string'
            ? JSON.parse(partner.settings)
            : (partner?.settings as any || {});

        const updatedSettings = {
            ...currentSettings,
            engagement: {
                ...currentSettings.engagement,
                ...engagementSettings
            }
        };

        return prisma.partner.update({
            where: { id: partnerId },
            data: { settings: updatedSettings }
        });
    }

    /**
     * Proxies to inAppNotification.service's createNotification
     */
    async createNotification(data) {
        return createNotification(data);
    }
}

export const engagementService = new EngagementService();
