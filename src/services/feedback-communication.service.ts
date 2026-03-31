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

export class FeedbackCommunicationService {

  /**
   * Gera comunicação "Vocês pediram, nós fizemos"
   */
  async createImprovementCommunication(data: {
    improvements: string[];
    implementationDate: string;
    originalFeedbacks: string[];
    targetAudience?: Partial<ImprovementCommunication['targetAudience']>;
    channels?: ImprovementCommunication['channels'];
  }): Promise<ImprovementCommunication> {
    
    const communication: ImprovementCommunication = {
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
  async schedulePersonalOutreach(data: {
    userId: string;
    userName: string;
    userEmail: string;
    npsScore: number;
    feedback: string;
    planType: string;
    preferredMethod?: PersonalOutreach['outreachType'];
  }): Promise<PersonalOutreach> {
    
    const outreach: PersonalOutreach = {
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
  async executeCommunication(communicationId: string): Promise<void> {
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

    } catch (error) {
      console.error(`❌ Error executing communication ${communicationId}:`, error);
      communication.status = 'CANCELLED';
      await this.saveCommunication(communication);
      throw error;
    }
  }

  /**
   * Executa outreach pessoal
   */
  async executePersonalOutreach(outreachId: string): Promise<void> {
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

    } catch (error) {
      console.error(`❌ Error executing outreach ${outreachId}:`, error);
      throw error;
    }
  }

  /**
   * Processa resposta de outreach
   */
  async processOutreachResponse(outreachId: string, response: {
    satisfied: boolean;
    newNPSScore?: number;
    additionalFeedback?: string;
  }): Promise<void> {
    const outreach = await this.getOutreachById(outreachId);
    if (!outreach) return;

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
  async generateImpactReport(days: number = 30): Promise<any> {
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
  async findUsersWhoProvidedFeedback(feedbackTheme: string): Promise<string[]> {
    // Mock - implementar busca real no banco
    return ['user1', 'user2', 'user3'];
  }

  // MÉTODOS DE GERAÇÃO DE CONTEÚDO

  private generateCommunicationTitle(improvements: string[]): string {
    if (improvements.length === 1) {
      return `🎉 Vocês pediram, nós fizemos: ${improvements[0]}`;
    }
    return `🎉 Vocês pediram, nós fizemos: ${improvements.length} melhorias implementadas!`;
  }

  private async generateCommunicationContent(improvements: string[], originalFeedbacks: string[]): Promise<string> {
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

  private async generatePersonalMessage(data: {
    userName: string;
    npsScore: number;
    feedback: string;
    planType: string;
  }): Promise<string> {
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

  private async sendThroughChannel(communication: ImprovementCommunication, channel: string): Promise<void> {
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

  private async sendEmail(communication: ImprovementCommunication): Promise<void> {
    console.log(`📧 Sending email communication: ${communication.title}`);
    // Implementar envio real de email
  }

  private async sendInAppAnnouncement(communication: ImprovementCommunication): Promise<void> {
    console.log(`📱 Sending in-app announcement: ${communication.title}`);
    // Implementar notificação in-app
  }

  private async sendPersonalEmail(outreach: PersonalOutreach): Promise<void> {
    console.log(`📧 Sending personal email to: ${outreach.userName}`);
    // Implementar envio de email personalizado
  }

  private async sendWhatsAppMessage(outreach: PersonalOutreach): Promise<void> {
    console.log(`📱 Sending WhatsApp message to: ${outreach.userName}`);
    // Implementar envio via WhatsApp Business API
  }

  // MÉTODOS AUXILIARES

  private determineOptimalOutreachMethod(planType: string, npsScore: number): PersonalOutreach['outreachType'] {
    if (['Premium', 'Família'].includes(planType) && npsScore <= 3) {
      return 'PHONE'; // Casos críticos merecem ligação
    }
    if (npsScore <= 5) {
      return 'EMAIL'; // Email personalizado para detratores
    }
    return 'IN_APP'; // Notificação no app para casos menos críticos
  }

  private extractMainIssue(feedback: string): string {
    const text = feedback.toLowerCase();
    
    if (text.includes('lento') || text.includes('demora')) return 'performance';
    if (text.includes('bug') || text.includes('erro')) return 'bug';
    if (text.includes('confuso') || text.includes('difícil')) return 'usability';
    if (text.includes('caro') || text.includes('preço')) return 'pricing';
    
    return 'general';
  }

  private async proposeSolution(issue: string): Promise<any> {
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
    
    return (solutions as any)[issue] || solutions.general;
  }

  // Mock methods - implementar com sistema real
  private async saveCommunication(communication: ImprovementCommunication): Promise<void> {
    console.log('💾 Saving communication:', communication.id);
  }

  private async saveOutreach(outreach: PersonalOutreach): Promise<void> {
    console.log('💾 Saving outreach:', outreach.id);
  }

  private async getCommunicationById(id: string): Promise<ImprovementCommunication | null> {
    return null; // Mock
  }

  private async getOutreachById(id: string): Promise<PersonalOutreach | null> {
    return null; // Mock
  }

  private async calculateImpactMetrics(improvements: string[]): Promise<ImprovementCommunication['impactMetrics']> {
    return {
      npsImpact: 5,
      usersSatisfied: 150,
      problemsSolved: improvements.length
    };
  }

  private async scheduleOutreachExecution(outreach: PersonalOutreach): Promise<void> {
    console.log(`⏰ Scheduling outreach execution: ${outreach.id}`);
  }

  private async scheduleImpactMeasurement(communication: ImprovementCommunication): Promise<void> {
    console.log(`📊 Scheduling impact measurement: ${communication.id}`);
  }

  private calculateResponseRate(outreaches: PersonalOutreach[]): number {
    const sent = outreaches.filter(o => o.status === 'SENT').length;
    const responded = outreaches.filter(o => o.responseReceived).length;
    return sent > 0 ? (responded / sent) * 100 : 0;
  }

  private calculateConversionRate(outreaches: PersonalOutreach[]): number {
    const detractors = outreaches.filter(o => o.originalNPSScore <= 6).length;
    const converted = outreaches.filter(o => o.status === 'CLOSED').length;
    return detractors > 0 ? (converted / detractors) * 100 : 0;
  }

  private async getCommunicationsSince(date: Date): Promise<ImprovementCommunication[]> {
    return []; // Mock
  }

  private async getOutreachesSince(date: Date): Promise<PersonalOutreach[]> {
    return []; // Mock
  }

  private async calculateTotalReach(communications: ImprovementCommunication[]): Promise<number> {
    return 1500; // Mock
  }

  private async calculateEngagementRate(communications: ImprovementCommunication[]): Promise<number> {
    return 35.5; // Mock
  }

  private async calculateNPSImpactFromCommunications(
    communications: ImprovementCommunication[], 
    outreaches: PersonalOutreach[]
  ): Promise<number> {
    return 8; // Mock
  }

  private async countDetractorConversions(outreaches: PersonalOutreach[]): Promise<number> {
    return 12; // Mock
  }

  private async calculateRetentionImpact(
    communications: ImprovementCommunication[], 
    outreaches: PersonalOutreach[]
  ): Promise<number> {
    return 15.5; // Mock - % improvement in retention
  }

  private async getTopSuccessStories(outreaches: PersonalOutreach[]): Promise<any[]> {
    return [
      {
        userName: 'João Silva',
        beforeScore: 3,
        afterScore: 9,
        feedback: 'Problema resolvido rapidamente, excelente suporte!'
      }
    ];
  }

  private async recordNPSImprovement(outreach: PersonalOutreach, newScore: number): Promise<void> {
    console.log(`📈 NPS improvement recorded: ${outreach.originalNPSScore} → ${newScore}`);
  }

  private async scheduleFollowUp(outreach: PersonalOutreach, additionalFeedback: string): Promise<void> {
    console.log(`📅 Follow-up scheduled for: ${outreach.userName}`);
  }

  private async sendPushNotification(communication: ImprovementCommunication): Promise<void> {
    console.log(`🔔 Sending push notification: ${communication.title}`);
  }

  private async addToReleaseNotes(communication: ImprovementCommunication): Promise<void> {
    console.log(`📝 Adding to release notes: ${communication.title}`);
  }

  private async postToSocialMedia(communication: ImprovementCommunication): Promise<void> {
    console.log(`📱 Posting to social media: ${communication.title}`);
  }

  private async sendInAppNotification(outreach: PersonalOutreach): Promise<void> {
    console.log(`📱 Sending in-app notification to: ${outreach.userName}`);
  }

  private async schedulePhoneCall(outreach: PersonalOutreach): Promise<void> {
    console.log(`📞 Scheduling phone call for: ${outreach.userName}`);
  }
}

export default FeedbackCommunicationService;
