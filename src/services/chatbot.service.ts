import prisma from '../lib/prisma';
import OpenAI from 'openai';
import { env } from '../config/env';

let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (openaiInstance) return openaiInstance;
  const key = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (key) {
    openaiInstance = new OpenAI({ apiKey: key });
    return openaiInstance;
  }
  return null;
}
export class ChatbotService {
  static async processQuery(query: string) {
    const openai = getOpenAI();
    // Se não houver chave OpenAI, usa fallback para lógica de intenção simples
    if (!openai) {
      return this.processQuerySimple(query);
    }

    try {
      // Coleta contexto em tempo real do banco de dados para o "State of the Union"
      const [
        totalUsers,
        totalPatients,
        totalPartners,
        totalAppointmentsToday,
        pendingTickets,
        pendingApprovals,
        totalRevenueMonth
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'PATIENT' } }),
        prisma.user.count({ where: { role: 'PARTNER' } }),
        prisma.appointment.count({
          where: { dateTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lt: new Date(new Date().setHours(23, 59, 59, 999)) } }
        }),
        prisma.supportTicket.count({ where: { status: 'OPEN' } }),
        prisma.partner.count({ where: { isApproved: false } }),
        prisma.transaction.aggregate({
          where: { type: 'INCOME', status: 'COMPLETED', date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
          _sum: { amount: true }
        })
      ]);

      const systemPrompt = `
Você é o Assistente Administrativo Inteligente do Docton Saúde. 
Sua função é ajudar administradores a entender o estado da plataforma, analisar métricas e realizar ações operacionais.

DADOS EM TEMPO REAL (Contexto do Sistema):
- Total de Usuários: ${totalUsers}
- Pacientes: ${totalPatients}
- Parceiros/Médicos: ${totalPartners}
- Consultas Hoje: ${totalAppointmentsToday}
- Tickets de Suporte Abertos: ${pendingTickets}
- Parceiros Pendentes de Aprovação: ${pendingApprovals}
- Receita Mensal: R$ ${(totalRevenueMonth._sum.amount || 0).toLocaleString('pt-BR')}

REGRAS DE RESPOSTA:
1. Responda em Português do Brasil com um tom profissional e prestativo.
2. Use Markdown para formatar a resposta. Use negrito para valores importantes.
3. Se o usuário pedir métricas que você não tem, informe que ainda não tem acesso a esses dados específicos mas forneça o que puder.
4. Você PODE incluir gráficos (metrics) ou ações (links) na sua resposta se julgar relevante.
5. Para incluir gráficos ou ações, a sua resposta DEVE terminar com um bloco JSON no seguinte formato:
   
   ---JSON_BLOCK---
   {
     "charts": [
       { "type": "metric", "data": { "label": "Título", "value": "Valor", "change": "+X%", "positive": true } }
     ],
     "actions": [
       { "label": "Texto do Botão", "action": "navigate", "data": "/url/da/pagina" }
     ]
   }
   ---END_JSON_BLOCK---

URLs Úteis para ações:
- /admin/parceiros (Lista de médicos/parceiros)
- /admin/aprovacoes (Aprovação de novos parceiros)
- /admin/suporte (Tickets de suporte)
- /admin/financeiro (Dashboard financeiro)
- /admin/usuarios (Gestão de usuários)

Seja objetivo e analítico.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "";

      // Extrair JSON se existir
      let finalContent = content;
      let charts: any[] | undefined;
      let actions: any[] | undefined;

      const jsonMatch = content.match(/---JSON_BLOCK---([\s\S]*?)---END_JSON_BLOCK---/);
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[1].trim());
          charts = jsonData.charts;
          actions = jsonData.actions;
          // Remover o bloco JSON da resposta textual
          finalContent = content.replace(/---JSON_BLOCK---[\s\S]*?---END_JSON_BLOCK---/, "").trim();
        } catch (e) {
          console.error("Erro ao parsear JSON da IA:", e);
        }
      }

      return {
        content: finalContent,
        charts,
        actions
      };

    } catch (error) {
      console.error("Erro na OpenAI:", error);
      return this.processQuerySimple(query);
    }
  }

  private static async processQuerySimple(query: string) {
    const lowerQuery = query.toLowerCase();

    // Financeiro
    if (lowerQuery.includes('receita') || lowerQuery.includes('faturamento') || lowerQuery.includes('vendas')) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const transactions = await prisma.transaction.findMany({
        where: {
          type: 'INCOME',
          status: 'COMPLETED',
          date: { gte: startOfMonth }
        },
        select: { amount: true }
      });

      const total = transactions.reduce((acc, t) => acc + t.amount, 0);
      const formattedTotal = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      return {
        content: `💰 **Receita deste Mês**\n\nO faturamento total registrado até agora é de **${formattedTotal}**.\n\n• **Status:** Em crescimento (Fallback Mode)\n• **Transações:** ${transactions.length}\n• **Última atualização:** ${new Date().toLocaleTimeString('pt-BR')}`,
        charts: [
          { type: 'metric', data: { label: 'Receita Mensal', value: formattedTotal, change: '+12%', positive: true } }
        ]
      };
    }

    // Usuários
    if (lowerQuery.includes('usuário') || lowerQuery.includes('cadastro') || lowerQuery.includes('cliente')) {
      const [total, activeToday, doctors, patients] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
        prisma.user.count({ where: { role: 'PARTNER' } }),
        prisma.user.count({ where: { role: 'PATIENT' } })
      ]);

      return {
        content: `👥 **Dados de Usuários**\n\nAtualmente temos **${total}** usuários cadastrados no sistema.\n\n• **Pacientes:** ${patients}\n• **Médicos/Parceiros:** ${doctors}\n• **Ativos hoje:** ${activeToday} (Fallback Mode)`,
        charts: [
          { type: 'metric', data: { label: 'Total Usuários', value: total.toString(), change: '+5%', positive: true } }
        ]
      };
    }

    // Parceiros
    if (lowerQuery.includes('parceiro') || lowerQuery.includes('médico') || lowerQuery.includes('profissional')) {
      const partners = await prisma.partner.findMany({
        take: 5,
        orderBy: { rating: 'desc' },
        select: { name: true, rating: true, isApproved: true }
      });

      const totalPartners = await prisma.partner.count();
      const approved = await prisma.partner.count({ where: { isApproved: true } });
      const pending = totalPartners - approved;

      return {
        content: `🏥 **Performance dos Parceiros**\n\nContamos com **${totalPartners}** parceiros na plataforma.\n\n• **Ativos:** ${approved}\n• **Aguardando aprovação:** ${pending} ⚠️ (Fallback Mode)\n\n**Top Performers:**\n${partners.map(p => `• ${p.name} (${p.rating}⭐)`).join('\n')}`,
        actions: [
          { label: 'Ver Ranking', action: 'navigate', data: '/admin/parceiros' },
          { label: 'Aprovar Pendentes', action: 'navigate', data: '/admin/aprovacoes' }
        ]
      };
    }

    // Default
    return {
      content: `🤔 Entendi que você quer saber sobre "${query}".\n\nEstou em modo de compatibilidade básica (sem OpenAI). Tente me perguntar sobre **receita**, **usuários** ou **parceiros**.`,
    };
  }

  static async processPartnerQuery(query: string, userId: string) {
    const openai = getOpenAI();
    if (!openai) {
      return this.processPartnerQuerySimple(query, userId);
    }

    try {
      const partner = await prisma.partner.findUnique({
        where: { userId },
        include: { services: true }
      });

      if (!partner) return { content: "Perfil de parceiro não encontrado." };

      const [
        totalAppointments,
        appointmentsToday,
        totalRevenue,
        pendingPayments
      ] = await Promise.all([
        prisma.appointment.count({ where: { partnerId: partner.id } }),
        prisma.appointment.count({
          where: {
            partnerId: partner.id,
            dateTime: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999))
            }
          }
        }),
        prisma.transaction.aggregate({
          where: { partnerId: partner.id, type: 'INCOME', status: 'COMPLETED' },
          _sum: { amount: true }
        }),
        prisma.transfer.aggregate({
          where: { partnerId: partner.id, status: 'PENDING' },
          _sum: { amount: true }
        })
      ]);

      const systemPrompt = `
Você é o Assistente Médico de IA do Docton Saúde. 
Sua função é ajudar o parceiro (médico/clínica) a gerir sua prática, agenda e performance financeira.

CONTEXTO DO PARCEIRO (${partner.name}):
- Total de Agendamentos (Histórico): ${totalAppointments}
- Agendamentos Hoje: ${appointmentsToday}
- Faturamento Total (Recebido): R$ ${(totalRevenue._sum.amount || 0).toLocaleString('pt-BR')}
- Repasses Pendentes: R$ ${(pendingPayments._sum.amount || 0).toLocaleString('pt-BR')}
- Serviços no Catálogo: ${partner.services.length}

REGRAS:
1. Responda de forma executiva, técnica e profissional.
2. Forneça insights sobre como aumentar a ocupação da agenda ou reduzir cancelamentos.
3. Se solicitado um gráfico, use o formato ---JSON_BLOCK--- conforme descrito no sistema.
4. URLs Úteis:
   - /partner/agenda (Agenda completa)
   - /partner/meus-servicos (Gestão de serviços)
   - /partner/financeiro (Extrato de repasses)
   - /partner/crm-pacientes (Gestão de pacientes/usuários)

Seja proativo em sugerir melhorias baseadas nos números.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "";
      let finalContent = content;
      let charts: any[] | undefined;
      let actions: any[] | undefined;

      const jsonMatch = content.match(/---JSON_BLOCK---([\s\S]*?)---END_JSON_BLOCK---/);
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[1].trim());
          charts = jsonData.charts;
          actions = jsonData.actions;
          finalContent = content.replace(/---JSON_BLOCK---[\s\S]*?---END_JSON_BLOCK---/, "").trim();
        } catch (e) {
          console.error("Erro ao parsear JSON da IA:", e);
        }
      }

      // Salvar no histórico
      await prisma.chatHistory.create({
        data: {
          userId,
          message: query,
          response: finalContent,
          context: { charts, actions } as any
        }
      });

      return { content: finalContent, charts, actions };

    } catch (error) {
      console.error("Erro na OpenAI (Partner):", error);
      return this.processPartnerQuerySimple(query, userId);
    }
  }

  static async processPatientQuery(query: string, userId: string) {
    const openai = getOpenAI();
    if (!openai) {
      const fallback = await this.processPatientQuerySimple(query, userId);
      fallback.content += "\n\n[System Debug] Modo Fallback Ativo: A chave OPENAI_API_KEY não foi encontrada pela aplicação no startup.";
      return fallback;
    }

    try {
      const patient = await prisma.patient.findUnique({
        where: { userId },
        include: {
          HealthLog: { orderBy: { logDate: 'desc' }, take: 10 },
          Prescription: { where: { status: 'Ativo' } as any, take: 5 },
          Appointment: {
            where: { dateTime: { gte: new Date() }, status: { not: 'Cancelado' } },
            orderBy: { dateTime: 'asc' },
            take: 3
          },
          QuotationRequest: { where: { status: 'OPEN' }, take: 3 }
        }
      });

      if (!patient) return { content: "Perfil de paciente não encontrado." };

      const patientName = patient.userId ? (await prisma.user.findUnique({ where: { id: userId } }))?.name : "Paciente";
      const gender = patient.avatarPreference === 'MALE' ? 'Masculino' : 'Feminino';
      const assistantName = patient.avatarPreference === 'MALE' ? 'Luan' : 'Luma';

      const systemPrompt = `
Você é ${assistantName}, a assistente virtual inteligente da Luma Saúde (Docton Saúde). 
Sua missão é ser uma companheira de saúde atenciosa, empática e proativa.

PERSONALIDADE:
- Calorosa, inspiradora e técnica quando necessário.
- Use o nome do paciente: ${patientName}.
- Você fala como um orientador de saúde, NÃO como um médico que dá diagnóstico definitivo.
- Se o paciente relatar sintomas graves, SEMPRE oriente buscar atendimento de urgência.

CONTEXTO DO PACIENTE (${patientName}):
- Sexo do Avatar: ${gender}
- Metas de Saúde: ${patient.healthGoals.join(', ') || 'Não definidas'}
- Registros Recentes: ${patient.HealthLog.map(l => `${l.type}: ${l.value}`).join(', ') || 'Nenhum'}
- Prescrições Ativas: ${patient.Prescription.map(p => p.medication).join(', ') || 'Nenhuma'}
- Próximas Consultas: ${patient.Appointment.length} agendadas.
- Cotações de Exame Abertas: ${patient.QuotationRequest.length} pendentes.

REGRAS:
1. Identifique se o paciente precisa de uma cotação de exame ou medicamento. Se sim, sugira criar uma cotação.
2. Ajude a interpretar os dados de saúde dele de forma motivadora.
3. Se o paciente perguntar sobre algo que exige ação (ex: "quero marcar uma consulta"), forneça o link.
4. Responda em Português do Brasil.
5. Formato de resposta: Markdown amigável.
6. BLOCO JSON (OBRIGATÓRIO para ações ou intenções detecadas):
   ---JSON_BLOCK---
   {
     "intent": {
        "type": "APPOINTMENT" | "QUOTE" | "EXAM" | "INFO",
        "description": "Breve descrição da intenção do paciente",
        "metadata": { "specialty": "Cardiologia", "medication": "Aspirina", "urgency": "high" }
     },
     "actions": [
        { "label": "Solicitar Cotação", "action": "quote", "data": "exame_sugerido" },
        { "label": "Ver Meus Medicamentos", "action": "navigate", "data": "/patient/medications" }
     ],
     "voice": true
   }
   ---END_JSON_BLOCK---

URLs Úteis:
- /patient/triage (Triagem de sintomas)
- /patient/explore (Buscar médicos)
- /patient/health-insights (Métricas e metas)
- /patient/medications (Meus remédios)
- /patient/orders (Meus pedidos/cotações)

Seja sempre empática.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content || "";
      let finalContent = content;
      let charts: any[] | undefined;
      let actions: any[] | undefined;
      let shouldVoice = false;

      const jsonMatch = content.match(/---JSON_BLOCK---([\s\S]*?)---END_JSON_BLOCK---/);
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[1].trim());
          charts = jsonData.charts;
          actions = jsonData.actions;
          shouldVoice = jsonData.voice || false;
          finalContent = content.replace(/---JSON_BLOCK---[\s\S]*?---END_JSON_BLOCK---/, "").trim();

          // Salvar intenção estruturada se detectada
          if (jsonData.intent) {
            const meta = jsonData.intent.metadata || {};
            await prisma.healthIntent.create({
              data: {
                patientId: patient.id,
                intent: jsonData.intent.type,
                status: 'OPEN',
                context: {
                  description: jsonData.intent.description,
                  item:
                    meta.medication ||
                    meta.item ||
                    jsonData.intent.description,
                  metadata: meta,
                  query,
                } as any,
              },
            });
          }
        } catch (e) {
          console.error("Erro ao parsear JSON da IA:", e);
        }
      }

      // Salvar no histórico
      await prisma.chatHistory.create({
        data: {
          userId,
          message: query,
          response: finalContent,
          context: { charts, actions, isPatient: true } as any
        }
      });

      return { content: finalContent, charts, actions, voice: true }; // Sempre voz para Luma se solicitado no MVP

    } catch (error: any) {
      console.error("Erro na OpenAI (Patient):", error);
      const fallback = await this.processPatientQuerySimple(query, userId);
      fallback.content += "\n\n[System Debug] Erro da OpenAI detectado: " + (error.message || String(error));
      return fallback;
    }
  }
  
  private static async processPartnerQuerySimple(query: string, userId: string) {
    const q = query.toLowerCase();
    const partner = await prisma.partner.findUnique({ where: { userId } });
    
    let content = `Olá${partner?.name ? `, ${partner.name}` : ''}! Identifiquei que você é um parceiro Docton. No momento estou operando em modo simplificado, mas posso te ajudar com informações básicas.`;
    const actions: any[] = [];
    
    if (q.includes("agenda") || q.includes("agendamento") || q.includes("consulta")) {
      content = "Você pode gerenciar todos os seus agendamentos diretamente na sua agenda digital.";
      actions.push({ label: "Ver Minha Agenda", action: "navigate", data: "/partner/agenda" });
    } else if (q.includes("serviço") || q.includes("procedimento")) {
      content = "Seus serviços e tabela de preços podem ser editados na seção de Meus Serviços.";
      actions.push({ label: "Gerenciar Serviços", action: "navigate", data: "/partner/meus-servicos" });
    } else if (q.includes("financeiro") || q.includes("pagamento") || q.includes("repasse")) {
      content = "Para verificar seus repasses e histórico financeiro, acesse o dashboard financeiro.";
      actions.push({ label: "Extrato Financeiro", action: "navigate", data: "/partner/financeiro" });
    } else if (q.includes("paciente") || q.includes("usuário")) {
      content = "A gestão dos seus pacientes e histórico de atendimentos está disponível no CRM.";
      actions.push({ label: "CRM de Pacientes", action: "navigate", data: "/partner/crm-pacientes" });
    }

    return { content, actions };
  }

  private static async processPatientQuerySimple(query: string, userId: string) {
    const q = query.toLowerCase();
    let content = "Olá! Eu sou a Luma. No momento estou operando em modo de economia de energia (sem chave de IA), mas posso anotar o que você precisa.";
    let intent: any = null;
    let actions: any[] = [];

    if (q.includes("dor") || q.includes("sinto") || q.includes("sentindo")) {
      content = "Sinto muito que você não esteja se sentindo bem. Como sua assistente, recomendo que agende uma triagem ou procure um médico parceiro para uma avaliação detalhada.";
      actions.push({ label: "Marcar Triagem", action: "navigate", data: "/patient/triagem" });
      intent = { type: "INFO", description: "Paciente relatando mal-estar" };
    } else if (q.includes("exame") || q.includes("laboratório")) {
      content = "Entendido. Você gostaria de solicitar uma cotação para algum exame específico? Posso te ajudar a encontrar os melhores preços nos laboratórios parceiros.";
      actions.push({ label: "Solicitar Cotação", action: "navigate", data: "/patient/orders" });
      intent = { type: "EXAM", description: "Interesse em exames" };
    } else if (q.includes("remédio") || q.includes("medicamento") || q.includes("receita") || q.includes("comprar")) {
       content = "Posso te ajudar a encontrar medicamentos com desconto. Você tem uma receita digital ou gostaria de buscar por um nome específico?";
       actions.push({ label: "Buscar Medicamentos", action: "navigate", data: "/patient/explore" });
       intent = { type: "QUOTE", description: "Interesse em medicamentos" };
    } else if (q.includes("consulta") || q.includes("médico") || q.includes("especialista")) {
       content = "Com certeza! Temos diversos especialistas prontos para te atender. Qual especialidade você está procurando?";
       actions.push({ label: "Explorar Médicos", action: "navigate", data: "/patient/explore" });
       intent = { type: "APPOINTMENT", description: "Busca por consulta" };
    }

    // Tentar persistir a intenção mesmo no modo simples (se o banco permitir)
    try {
      if (intent) {
        const patient = await prisma.patient.findUnique({ where: { userId } });
        if (patient) {
          await prisma.healthIntent.create({
            data: {
              patientId: patient.id,
              intent: intent.type,
              status: 'OPEN',
              context: {
                description: intent.description,
                item: intent.description,
                query: q,
              } as any,
            },
          });
        }
      }
    } catch (e) {
      console.warn("Banco de dados indisponível para salvar intenção simples.");
    }

    return { content, actions, voice: false };
  }

  static async generateSpeech(text: string) {
    const openai = getOpenAI();
    if (!openai) return null;

    try {
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: text,
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    } catch (error: any) {
      console.error("Erro CRÍTICO ao gerar voz na OpenAI:", error.message || error);
      console.error(error); // Imprime stack e detalhes de rate limit / auth
      return null;
    }
  }
}
