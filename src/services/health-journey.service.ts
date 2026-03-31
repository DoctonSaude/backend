import prisma from '../lib/prisma.js';
import { engagementService } from './engagement.service.js';

export class HealthJourneyService {
    /**
     * Inicia a jornada de tratamento agudo
     */
    async startAcuteJourney(patientId: string, term: string) {
        const journey = await (prisma as any).healthJourney.create({
            data: {
                patientId,
                type: 'ACUTE',
                status: 'ACTIVE',
                triggerTerm: term,
                stepsCurrent: 1,
                stepsTotal: 3,
                metadata: {
                    currentFocus: 'immediate_relief'
                }
            }
        });

        // Orquestra pushes via EngagementService (reutilizando a infra de notificações)
        // Dia 1: Sugestão de medicamento (já feito no HealthIntentService no processIntent)
        // Agendar Dia 2: Telemedicina
        // Agendar Dia 3: Exames
        // NOTA: Implementação real de agendamento de puffs usará o sistema de filas do Docton
        // Por enquanto, registramos o estado da jornada no banco.
        return journey;
    }

    /**
     * Busca a jornada ativa do paciente
     */
    async getActiveJourney(patientId: string) {
        return (prisma as any).healthJourney.findFirst({
            where: {
                patientId,
                status: 'ACTIVE'
            },
            orderBy: { startedAt: 'desc' }
        });
    }

    /**
     * Retorna sugestões dinâmicas baseadas na jornada ativa e localização
     */
    async getJourneySuggestions(patientId: string, location?: { city?: string }) {
        const journey = await this.getActiveJourney(patientId);
        if (!journey)
            return null;

        if (journey.type === 'ACUTE') {
            // Se a jornada sugere parceiros, vamos buscar os mais próximos ou da mesma cidade
            let partnerInfo = 'Parceiros recomendados';
            if (location?.city) {
                const localPartners = await prisma.partner.count({
                    where: { city: { contains: location.city, mode: 'insensitive' }, isApproved: true }
                });
                if (localPartners > 0) {
                    partnerInfo = `${localPartners} parceiros em ${location.city}`;
                }
            }

            return {
                title: `Acompanhamento: ${journey.triggerTerm}`,
                suggestions: [
                    { label: 'Farmácias próximas', icon: 'Pill', action: 'pharmacy_search', metadata: { city: location?.city } },
                    { label: partnerInfo, icon: 'UserConfig', action: 'partner_search', metadata: { city: location?.city } },
                    { label: 'Laboratórios próximos', icon: 'TestTube', action: 'exams_search', metadata: { city: location?.city } }
                ]
            };
        }
        return null;
    }

    /**
     * Avança o step da jornada e dispara a notificação correspondente
     */
    async advanceJourneyStep(journeyId: string) {
        const journey = await (prisma as any).healthJourney.findUnique({
            where: { id: journeyId }
        });

        if (!journey || journey.status !== 'ACTIVE')
            return;

        const nextStep = (journey.stepsCurrent || 0) + 1;

        // Atualiza a jornada
        const updatedJourney = await (prisma as any).healthJourney.update({
            where: { id: journeyId },
            data: {
                stepsCurrent: nextStep,
                status: nextStep >= (journey.stepsTotal || 0) ? 'COMPLETED' : 'ACTIVE',
                completedAt: nextStep >= (journey.stepsTotal || 0) ? new Date() : null
            }
        });

        // Dispara a notificação do novo passo
        await this.triggerJourneyStep(updatedJourney);
        return updatedJourney;
    }

    /**
     * Dispara a notificação baseada no passo atual da jornada
     */
    async triggerJourneyStep(journey) {
        const patient = await prisma.patient.findUnique({
            where: { id: journey.patientId },
            select: { personId: true }
        });

        if (!patient?.personId)
            return;

        let title = '';
        let message = '';
        const term = journey.triggerTerm;

        // Lógica de mensagens para ACUTE (MVP)
        if (journey.type === 'ACUTE') {
            if (journey.stepsCurrent === 2) {
                title = 'Como você está hoje?';
                message = `Notamos que buscou por "${term}" ontem. Deseja agendar uma telemedicina para avaliação?`;
            }
            else if (journey.stepsCurrent === 3) {
                title = 'Cuidado preventivo';
                message = `Para fechar seu quadro de "${term}", sugerimos realizar os exames laboratoriais básicos. Vamos agendar?`;
            }
        }

        if (title && message) {
            await engagementService.createNotification({
                personId: patient.personId,
                title,
                message,
                type: `HEALTH_JOURNEY_${journey.type}_STEP_${journey.stepsCurrent}`,
                priority: 'medium'
            });
        }
    }

    /**
     * Finaliza uma jornada
     */
    async completeJourney(journeyId: string) {
        return (prisma as any).healthJourney.update({
            where: { id: journeyId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date()
            }
        });
    }
}

export const healthJourneyService = new HealthJourneyService();
