import axios from 'axios';

/**
 * Serviço centralizador de Webhooks para integração com N8N
 * Usado para disparar fluxos automatizados da Jornada Docton (WhatsApp, E-mail, etc.)
 */
export class WebhookN8NService {
    private readonly n8nWebhookUrl: string;

    constructor() {
        // Usa a variável de ambiente ou um fallback de desenvolvimento
        this.n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/';
    }

    /**
     * Envia um evento genérico para o N8N
     * @param eventName Nome do evento (ex: 'patient_registered', 'exam_received')
     * @param payload Dados associados ao evento
     */
    async triggerEvent(eventName: string, payload: any) {
        try {
            const endpoint = `${this.n8nWebhookUrl}${eventName}`;
            
            // Log para debug
            console.log(`[WebhookN8N] Disparando evento ${eventName} para ${endpoint}`);
            
            const response = await axios.post(endpoint, {
                timestamp: new Date().toISOString(),
                event: eventName,
                data: payload
            });

            return { success: true, status: response.status };
        } catch (error: any) {
            console.error(`[WebhookN8N] Erro ao disparar evento ${eventName}:`, error.message);
            // Retornamos false em vez de throw para não travar o fluxo principal (non-blocking)
            return { success: false, error: error.message };
        }
    }

    /**
     * Fluxo 1: Novo cadastro
     */
    async notifyPatientRegistered(patientId: string, name: string, phone: string) {
        return this.triggerEvent('patient_registered', { patientId, name, phone });
    }

    /**
     * Fluxo 2: Exame enviado (para OCR e Ana IA)
     */
    async notifyExamReceived(patientId: string, examId: string, fileUrl: string) {
        return this.triggerEvent('exam_received', { patientId, examId, fileUrl });
    }

    /**
     * Fluxo 3: Medicamento cadastrado (Agendamento lembretes)
     */
    async notifyMedicationAdded(patientId: string, medicationId: string, medicationName: string) {
        return this.triggerEvent('medication_added', { patientId, medicationId, medicationName });
    }

    /**
     * Fluxo 4: Paciente sem interação (Análise risco abandono)
     */
    async notifyInactivityAlert(patientId: string, riskLevel: string, daysInactive: number) {
        return this.triggerEvent('inactivity_alert', { patientId, riskLevel, daysInactive });
    }
}

export const webhookN8nService = new WebhookN8NService();
