import prisma from '../lib/prisma.js';
import { engagementService } from './engagement.service.js';
import { LoyaltyService } from './loyalty.service.js';

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
        const patient = await prisma.patient.findUnique({
            where: { id: patientId },
            select: { journeyPhase: true, nextAction: true, abandonmentRisk: true, healthScore: true }
        });

        const journey = await this.getActiveJourney(patientId);
        
        let activeJourneySuggestions = null;
        if (journey && journey.type === 'ACUTE') {
            let partnerInfo = 'Parceiros recomendados';
            if (location?.city) {
                const localPartners = await prisma.partner.count({
                    where: { city: { contains: location.city, mode: 'insensitive' }, isApproved: true }
                });
                if (localPartners > 0) {
                    partnerInfo = `${localPartners} parceiros em ${location.city}`;
                }
            }

            activeJourneySuggestions = {
                title: `Acompanhamento: ${journey.triggerTerm}`,
                suggestions: [
                    { label: 'Farmácias próximas', icon: 'Pill', action: 'pharmacy_search', metadata: { city: location?.city } },
                    { label: partnerInfo, icon: 'UserConfig', action: 'partner_search', metadata: { city: location?.city } },
                    { label: 'Laboratórios próximos', icon: 'TestTube', action: 'exams_search', metadata: { city: location?.city } }
                ]
            };
        }

        return {
            globalState: patient,
            activeAcuteJourney: activeJourneySuggestions
        };
    }

    /**
     * Atualiza o estado global da jornada do paciente (Fases 0 a 7)
     */
    async updateGlobalJourneyState(patientId: string, updates: { phase?: number; score?: number; action?: string; risk?: string; engagement?: number }) {
        return prisma.patient.update({
            where: { id: patientId },
            data: {
                ...(updates.phase !== undefined && { journeyPhase: updates.phase }),
                ...(updates.score !== undefined && { healthScore: updates.score }),
                ...(updates.action !== undefined && { nextAction: updates.action }),
                ...(updates.risk !== undefined && { abandonmentRisk: updates.risk }),
                ...(updates.engagement !== undefined && { engagementScore: updates.engagement })
            }
        });
    }

    /**
     * Recalcula a fase da jornada e score de saúde do paciente com base nas interações
     */
    async processPatientInteractions(patientId: string) {
        const patient = await prisma.patient.findUnique({
            where: { id: patientId },
            include: { appointment: true,
                medicalRecords: true,
                healthExams: true,
                MedicationLog: true
            }
        });

        if (!patient) return;

        let newPhase = patient.journeyPhase;
        let nextAction = patient.nextAction;
        let score = patient.healthScore;

        // Fase 0: Descoberta -> Fase 1: Conscientização (Após Cadastro / Onboarding)
        if (newPhase === 0 && patient.onboardingCompleted) {
            newPhase = 1;
            nextAction = 'Completar Avaliação de Saúde';
            score += 10;
        }

        // Fase 1: Conscientização -> Fase 2: Consulta de Avaliação (Após agendar primeira consulta)
        if (newPhase === 1 && patient.Appointment.length > 0) {
            newPhase = 2;
            nextAction = 'Realizar Consulta Médica';
            score += 15;
        }

        // Fase 2: Consulta -> Fase 3: Exames Complementares (Após receber prontuário/receita/exames)
        if (newPhase === 2 && patient.medicalRecords.length > 0) {
            newPhase = 3;
            nextAction = 'Enviar Resultados de Exames';
            score += 15;
        }

        // Fase 3: Exames -> Fase 4: Tratamento / Adesão (Após enviar exames ou registrar remédios)
        if (newPhase === 3 && (patient.healthExams.length > 0 || patient.MedicationLog.length > 0)) {
            newPhase = 4;
            nextAction = 'Registrar Uso de Medicamentos';
            score += 20;
        }

        // Fase 4 -> Fase 5: Hábitos (Após boa adesão)
        // Simplificado para o MVP
        if (newPhase === 4 && patient.currentStreak > 3) {
            newPhase = 5;
            nextAction = 'Completar Desafios Diários';
            score += 20;
        }

        const finalScore = Math.min(100, score);
        
        await this.updateGlobalJourneyState(patientId, {
            phase: newPhase,
            score: finalScore,
            action: nextAction || 'Continue engajado',
            engagement: Math.min(100, patient.engagementScore + 5)
        });

        // Integração com Gamificação (Docton Coins)
        if (newPhase > patient.journeyPhase || finalScore > patient.healthScore) {
            const pointsGained = (newPhase > patient.journeyPhase) ? 100 : 50;
            const desc = (newPhase > patient.journeyPhase) ? `Subiu para a Fase ${newPhase} na Jornada` : 'Melhoria no score de saúde';
            
            try {
                await LoyaltyService.awardPoints(patientId, pointsGained, 'HEALTH_JOURNEY_PROGRESS', desc, {
                    oldPhase: patient.journeyPhase,
                    newPhase: newPhase
                });
                console.log(`[GAMIFICATION] ${pointsGained} Docton Coins awarded to ${patientId}`);
            } catch (err) {
                console.error('[GAMIFICATION] Erro ao atribuir Docton Coins:', err);
            }
        }
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
