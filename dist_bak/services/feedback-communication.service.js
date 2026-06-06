"use strict";
/**
 * SERVIÇO DE COMUNICAÇÃO DE FEEDBACK
 * FASE 4: Fechamento do loop - "Vocês pediram, nós fizemos"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackCommunicationService = void 0;
class FeedbackCommunicationService {
    /**
     * Gera comunicação "Vocês pediram, nós fizemos"
     */
    async createImprovementCommunication(data) {
        const communication = {
            id: `comm_${Date.now()}`,
            title: this.generateCommunicationTitle(data.improvements),
            description: await this.generateCommunicationContent(data.improvements, data.originalFeedbacks),
            implementationDate: data.implementationDate,
            originalFeedback: data.originalFeedbacks,
            impactMetrics: await this.calculateImpactMetrics(data.improvements),
            channels: data.channels || ['email', 'in-app', 'release-notes'],
            targetAudience: {
                allUsers: true,
                feedbackProviders: true,
                ...data.targetAudience
            },
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Amanhã
            status: 'DRAFT'
        };
        await this.saveCommunication(communication);
        console.log(`📢 Improvement communication created: ${communication.id}`);
        return communication;
    }
    /**
     * Agenda outreach personalizado para detrator
     */
    async schedulePersonalOutreach(data) {
        const outreach = {
            id: `outreach_${Date.now()}`,
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail,
            originalNPSScore: data.npsScore,
            originalFeedback: data.feedback,
            planType: data.planType,
            outreachType: data.preferredMethod || this.determineOptimalOutreachMethod(data.planType, data.npsScore),
            message: await this.generatePersonalMessage(data),
            scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 horas
            status: 'PENDING'
        };
        await this.saveOutreach(outreach);
        // Agendar envio automático
        await this.scheduleOutreachExecution(outreach);
        console.log(`📞 Personal outreach scheduled: ${outreach.id} for ${data.userName}`);
        return outreach;
    }
    /**
     * Executa comunicação de melhoria
     */
    async executeCommunication(communicationId) {
        const communication = await this.getCommunicationById(communicationId);
        if (!communication) {
            throw new Error(`Communication ${communicationId} not found`);
        }
        try {
            // Enviar por cada canal
            for (const channel of communication.channels) {
                await this.sendThroughChannel(communication, channel);
            }
            // Atualizar status
            communication.status = 'SENT';
            communication.sentDate = new Date().toISOString();
            await this.saveCommunication(communication);
            // Agendar follow-up para medir impacto
            await this.scheduleImpactMeasurement(communication);
            console.log(`✅ Communication executed: ${communicationId}`);
        }
        catch (error) {
            console.error(`❌ Error executing communication ${communicationId}:`, error);
            communication.status = 'CANCELLED';
            await this.saveCommunication(communication);
            throw error;
        }
    }
    /**
     * Executa outreach pessoal
     */
    async executePersonalOutreach(outreachId) {
        const outreach = await this.getOutreachById(outreachId);
        if (!outreach) {
            throw new Error(`Outreach ${outreachId} not found`);
        }
        try {
            switch (outreach.outreachType) {
                case 'EMAIL':
                    await this.sendPersonalEmail(outreach);
                    break;
                case 'WHATSAPP':
                    await this.sendWhatsAppMessage(outreach);
                    break;
                case 'IN_APP':
                    await this.sendInAppNotification(outreach);
                    break;
                case 'PHONE':
                    await this.schedulePhoneCall(outreach);
                    break;
            }
            outreach.status = 'SENT';
            outreach.sentDate = new Date().toISOString();
            // Agendar follow-up em 7 dias
            outreach.followUpScheduled = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            await this.saveOutreach(outreach);
            console.log(`✅ Personal outreach executed: ${outreachId}`);
        }
        catch (error) {
            console.error(`❌ Error executing outreach ${outreachId}:`, error);
            throw error;
        }
    }
    /**
     * Processa resposta de outreach
     */
    async processOutreachResponse(outreachId, response) {
        const outreach = await this.getOutreachById(outreachId);
        if (!outreach)
            return;
        outreach.responseReceived = true;
        outreach.status = response.satisfied ? 'CLOSED' : 'FOLLOW_UP';
        // Registrar melhoria no NPS se aplicável
        if (response.newNPSScore && response.newNPSScore > outreach.originalNPSScore) {
            await this.recordNPSImprovement(outreach, response.newNPSScore);
        }
        // Se não ficou satisfeito, agendar follow-up
        if (!response.satisfied && response.additionalFeedback) {
            await this.scheduleFollowUp(outreach, response.additionalFeedback);
        }
        await this.saveOutreach(outreach);
        console.log(`📊 Outreach response processed: ${outreachId}`);
    }
    /**
     * Gera relatório de impacto das comunicações
     */
    async generateImpactReport(days = 30) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const communications = await this.getCommunicationsSince(startDate);
        const outreaches = await this.getOutreachesSince(startDate);
        return {
            period: `${days} dias`,
            generatedAt: new Date().toISOString(),
            communications: {
                total: communications.length,
                sent: communications.filter(c => c.status === 'SENT').length,
                reach: await this.calculateTotalReach(communications),
                engagement: await this.calculateEngagementRate(communications)
            },
            personalOutreach: {
                total: outreaches.length,
                sent: outreaches.filter(o => o.status === 'SENT').length,
                responseRate: this.calculateResponseRate(outreaches),
                conversionRate: this.calculateConversionRate(outreaches)
            },
            impact: {
                npsImprovement: await this.calculateNPSImpactFromCommunications(communications, outreaches),
                detractorConversions: await this.countDetractorConversions(outreaches),
                userRetention: await this.calculateRetentionImpact(communications, outreaches)
            },
            topSuccessStories: await this.getTopSuccessStories(outreaches)
        };
    }
    /**
     * Busca usuários que forneceram feedback específico
     */
    async findUsersWhoProvidedFeedback(feedbackTheme) {
        // Mock - implementar busca real no banco
        return ['user1', 'user2', 'user3'];
    }
    // MÉTODOS DE GERAÇÃO DE CONTEÚDO
    generateCommunicationTitle(improvements) {
        if (improvements.length === 1) {
            return `🎉 Vocês pediram, nós fizemos: ${improvements[0]}`;
        }
        return `🎉 Vocês pediram, nós fizemos: ${improvements.length} melhorias implementadas!`;
    }
    async generateCommunicationContent(improvements, originalFeedbacks) {
        return `
# 🎉 Vocês Pediram, Nós Fizemos!

Olá!

Baseado no feedback valioso que recebemos de vocês, implementamos as seguintes melhorias:

${improvements.map(improvement => `
## ✅ ${improvement}

**O que vocês disseram:**
${originalFeedbacks.slice(0, 2).map(feedback => `> "${feedback}"`).join('\n')}

**O que fizemos:**
Ouvimos vocês e implementamos esta melhoria para tornar sua experiência ainda melhor!
`).join('\n')}

## 📢 Continue Enviando Feedback!

Cada sugestão é analisada pela nossa equipe e pode virar realidade na próxima atualização.

**Como enviar feedback:**
- 📱 Pesquisa NPS no app (após completar desafios)
- 📧 Email: feedback@gestaosaude.com
- 💬 Chat de suporte

## 📊 Seu NPS Importa

Suas avaliações nos ajudam a priorizar o que realmente importa para vocês:
- ⭐ **Promotores**: Nos mostram o que está funcionando
- 🔄 **Neutros**: Nos guiam para melhorias específicas  
- 🚨 **Detratores**: Nos alertam sobre problemas urgentes

---

*Equipe Gestão Saúde - Construindo juntos o futuro da saúde digital* 💙

P.S.: Vocês são os verdadeiros construtores desta plataforma! 🙏
    `.trim();
    }
    async generatePersonalMessage(data) {
        const issue = this.extractMainIssue(data.feedback);
        const solution = await this.proposeSolution(issue);
        return `
Olá ${data.userName},

Obrigado por dedicar seu tempo para nos dar feedback através da pesquisa NPS. 
Sua avaliação de ${data.npsScore}/10 e seu comentário foram lidos pessoalmente 
por nossa equipe de produto.

## 🎯 Sobre seu feedback:
"${data.feedback}"

## 💡 Nossa resposta:
${solution.description}

## 🚀 Próximos passos:
${solution.timeline}

## 📞 Contato direto:
Gostaria de conversar pessoalmente sobre sua experiência? 
Responda este email ou me chame no WhatsApp: (11) 99999-9999

Estou aqui para garantir que sua experiência com a Gestão Saúde seja excepcional.

Atenciosamente,

**${solution.owner}**  
${solution.title}  
Gestão Saúde  

P.S.: Sua opinião é fundamental para construirmos um produto cada vez melhor. 
Obrigado por nos ajudar a evoluir! 🙏
    `.trim();
    }
    // MÉTODOS DE ENVIO
    async sendThroughChannel(communication, channel) {
        switch (channel) {
            case 'email':
                await this.sendEmail(communication);
                break;
            case 'in-app':
                await this.sendInAppAnnouncement(communication);
                break;
            case 'push':
                await this.sendPushNotification(communication);
                break;
            case 'release-notes':
                await this.addToReleaseNotes(communication);
                break;
            case 'social':
                await this.postToSocialMedia(communication);
                break;
        }
    }
    async sendEmail(communication) {
        console.log(`📧 Sending email communication: ${communication.title}`);
        // Implementar envio real de email
    }
    async sendInAppAnnouncement(communication) {
        console.log(`📱 Sending in-app announcement: ${communication.title}`);
        // Implementar notificação in-app
    }
    async sendPersonalEmail(outreach) {
        console.log(`📧 Sending personal email to: ${outreach.userName}`);
        // Implementar envio de email personalizado
    }
    async sendWhatsAppMessage(outreach) {
        console.log(`📱 Sending WhatsApp message to: ${outreach.userName}`);
        // Implementar envio via WhatsApp Business API
    }
    // MÉTODOS AUXILIARES
    determineOptimalOutreachMethod(planType, npsScore) {
        if (['Premium', 'Família'].includes(planType) && npsScore <= 3) {
            return 'PHONE'; // Casos críticos merecem ligação
        }
        if (npsScore <= 5) {
            return 'EMAIL'; // Email personalizado para detratores
        }
        return 'IN_APP'; // Notificação no app para casos menos críticos
    }
    extractMainIssue(feedback) {
        const text = feedback.toLowerCase();
        if (text.includes('lento') || text.includes('demora'))
            return 'performance';
        if (text.includes('bug') || text.includes('erro'))
            return 'bug';
        if (text.includes('confuso') || text.includes('difícil'))
            return 'usability';
        if (text.includes('caro') || text.includes('preço'))
            return 'pricing';
        return 'general';
    }
    async proposeSolution(issue) {
        const solutions = {
            performance: {
                description: 'Identificamos os gargalos de performance e já iniciamos as otimizações.',
                timeline: 'Melhorias serão implementadas nos próximos 7 dias.',
                owner: 'João Silva',
                title: 'Head de Engenharia'
            },
            bug: {
                description: 'Reproduzimos o bug reportado e já temos a correção em desenvolvimento.',
                timeline: 'Correção será lançada na próxima atualização (3-5 dias).',
                owner: 'João Silva',
                title: 'Head de Engenharia'
            },
            usability: {
                description: 'Sua sugestão de melhoria na interface foi adicionada ao nosso roadmap.',
                timeline: 'Redesign será implementado nas próximas 2-3 semanas.',
                owner: 'Maria Santos',
                title: 'Head de Produto'
            },
            pricing: {
                description: 'Entendemos sua preocupação com o valor e temos algumas opções para você.',
                timeline: 'Vamos entrar em contato em 24h com alternativas personalizadas.',
                owner: 'Carlos Lima',
                title: 'Head de Customer Success'
            },
            general: {
                description: 'Seu feedback foi encaminhado para a equipe responsável.',
                timeline: 'Retornaremos com uma resposta detalhada em até 48h.',
                owner: 'Maria Santos',
                title: 'Head de Produto'
            }
        };
        return solutions[issue] || solutions.general;
    }
    // Mock methods - implementar com sistema real
    async saveCommunication(communication) {
        console.log('💾 Saving communication:', communication.id);
    }
    async saveOutreach(outreach) {
        console.log('💾 Saving outreach:', outreach.id);
    }
    async getCommunicationById(id) {
        return null; // Mock
    }
    async getOutreachById(id) {
        return null; // Mock
    }
    async calculateImpactMetrics(improvements) {
        return {
            npsImpact: 5,
            usersSatisfied: 150,
            problemsSolved: improvements.length
        };
    }
    async scheduleOutreachExecution(outreach) {
        console.log(`⏰ Scheduling outreach execution: ${outreach.id}`);
    }
    async scheduleImpactMeasurement(communication) {
        console.log(`📊 Scheduling impact measurement: ${communication.id}`);
    }
    calculateResponseRate(outreaches) {
        const sent = outreaches.filter(o => o.status === 'SENT').length;
        const responded = outreaches.filter(o => o.responseReceived).length;
        return sent > 0 ? (responded / sent) * 100 : 0;
    }
    calculateConversionRate(outreaches) {
        const detractors = outreaches.filter(o => o.originalNPSScore <= 6).length;
        const converted = outreaches.filter(o => o.status === 'CLOSED').length;
        return detractors > 0 ? (converted / detractors) * 100 : 0;
    }
    async getCommunicationsSince(date) {
        return []; // Mock
    }
    async getOutreachesSince(date) {
        return []; // Mock
    }
    async calculateTotalReach(communications) {
        return 1500; // Mock
    }
    async calculateEngagementRate(communications) {
        return 35.5; // Mock
    }
    async calculateNPSImpactFromCommunications(communications, outreaches) {
        return 8; // Mock
    }
    async countDetractorConversions(outreaches) {
        return 12; // Mock
    }
    async calculateRetentionImpact(communications, outreaches) {
        return 15.5; // Mock - % improvement in retention
    }
    async getTopSuccessStories(outreaches) {
        return [
            {
                userName: 'João Silva',
                beforeScore: 3,
                afterScore: 9,
                feedback: 'Problema resolvido rapidamente, excelente suporte!'
            }
        ];
    }
    async recordNPSImprovement(outreach, newScore) {
        console.log(`📈 NPS improvement recorded: ${outreach.originalNPSScore} → ${newScore}`);
    }
    async scheduleFollowUp(outreach, additionalFeedback) {
        console.log(`📅 Follow-up scheduled for: ${outreach.userName}`);
    }
    async sendPushNotification(communication) {
        console.log(`🔔 Sending push notification: ${communication.title}`);
    }
    async addToReleaseNotes(communication) {
        console.log(`📝 Adding to release notes: ${communication.title}`);
    }
    async postToSocialMedia(communication) {
        console.log(`📱 Posting to social media: ${communication.title}`);
    }
    async sendInAppNotification(outreach) {
        console.log(`📱 Sending in-app notification to: ${outreach.userName}`);
    }
    async schedulePhoneCall(outreach) {
        console.log(`📞 Scheduling phone call for: ${outreach.userName}`);
    }
}
exports.FeedbackCommunicationService = FeedbackCommunicationService;
exports.default = FeedbackCommunicationService;
//# sourceMappingURL=feedback-communication.service.js.map