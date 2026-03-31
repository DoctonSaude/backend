"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../config/env");
const openai = env_1.env.OPENAI_API_KEY ? new openai_1.default({ apiKey: env_1.env.OPENAI_API_KEY }) : null;
class ChatbotService {
    static async processQuery(query) {
        // Se não houver chave OpenAI, usa fallback para lógica de intenção simples
        if (!openai) {
            return this.processQuerySimple(query);
        }
        try {
            // Coleta contexto em tempo real do banco de dados para o "State of the Union"
            const [totalUsers, totalPatients, totalPartners, totalAppointmentsToday, pendingTickets, pendingApprovals, totalRevenueMonth] = await Promise.all([
                prisma_1.default.user.count(),
                prisma_1.default.user.count({ where: { role: 'PATIENT' } }),
                prisma_1.default.user.count({ where: { role: 'PARTNER' } }),
                prisma_1.default.appointment.count({
                    where: { dateTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lt: new Date(new Date().setHours(23, 59, 59, 999)) } }
                }),
                prisma_1.default.supportTicket.count({ where: { status: 'OPEN' } }),
                prisma_1.default.partner.count({ where: { isApproved: false } }),
                prisma_1.default.transaction.aggregate({
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
            let charts;
            let actions;
            const jsonMatch = content.match(/---JSON_BLOCK---([\s\S]*?)---END_JSON_BLOCK---/);
            if (jsonMatch) {
                try {
                    const jsonData = JSON.parse(jsonMatch[1].trim());
                    charts = jsonData.charts;
                    actions = jsonData.actions;
                    // Remover o bloco JSON da resposta textual
                    finalContent = content.replace(/---JSON_BLOCK---[\s\S]*?---END_JSON_BLOCK---/, "").trim();
                }
                catch (e) {
                    console.error("Erro ao parsear JSON da IA:", e);
                }
            }
            return {
                content: finalContent,
                charts,
                actions
            };
        }
        catch (error) {
            console.error("Erro na OpenAI:", error);
            return this.processQuerySimple(query);
        }
    }
    static async processQuerySimple(query) {
        const lowerQuery = query.toLowerCase();
        // Financeiro
        if (lowerQuery.includes('receita') || lowerQuery.includes('faturamento') || lowerQuery.includes('vendas')) {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const transactions = await prisma_1.default.transaction.findMany({
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
                prisma_1.default.user.count(),
                prisma_1.default.user.count({ where: { updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
                prisma_1.default.user.count({ where: { role: 'PARTNER' } }),
                prisma_1.default.user.count({ where: { role: 'PATIENT' } })
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
            const partners = await prisma_1.default.partner.findMany({
                take: 5,
                orderBy: { rating: 'desc' },
                select: { name: true, rating: true, isApproved: true }
            });
            const totalPartners = await prisma_1.default.partner.count();
            const approved = await prisma_1.default.partner.count({ where: { isApproved: true } });
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
    static async processPartnerQuery(query, userId) {
        if (!openai) {
            return this.processPartnerQuerySimple(query, userId);
        }
        try {
            const partner = await prisma_1.default.partner.findUnique({
                where: { userId },
                include: { services: true }
            });
            if (!partner)
                return { content: "Perfil de parceiro não encontrado." };
            const [totalAppointments, appointmentsToday, totalRevenue, pendingPayments] = await Promise.all([
                prisma_1.default.appointment.count({ where: { partnerId: partner.id } }),
                prisma_1.default.appointment.count({
                    where: {
                        partnerId: partner.id,
                        dateTime: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0)),
                            lt: new Date(new Date().setHours(23, 59, 59, 999))
                        }
                    }
                }),
                prisma_1.default.transaction.aggregate({
                    where: { partnerId: partner.id, type: 'INCOME', status: 'COMPLETED' },
                    _sum: { amount: true }
                }),
                prisma_1.default.transfer.aggregate({
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
            let charts;
            let actions;
            const jsonMatch = content.match(/---JSON_BLOCK---([\s\S]*?)---END_JSON_BLOCK---/);
            if (jsonMatch) {
                try {
                    const jsonData = JSON.parse(jsonMatch[1].trim());
                    charts = jsonData.charts;
                    actions = jsonData.actions;
                    finalContent = content.replace(/---JSON_BLOCK---[\s\S]*?---END_JSON_BLOCK---/, "").trim();
                }
                catch (e) {
                    console.error("Erro ao parsear JSON da IA:", e);
                }
            }
            // Salvar no histórico
            await prisma_1.default.chatHistory.create({
                data: {
                    userId,
                    message: query,
                    response: finalContent,
                    context: { charts, actions }
                }
            });
            return { content: finalContent, charts, actions };
        }
        catch (error) {
            console.error("Erro na OpenAI (Partner):", error);
            return this.processPartnerQuerySimple(query, userId);
        }
    }
    static async processPartnerQuerySimple(query, userId) {
        const lowerQuery = query.toLowerCase();
        // Fallback simples para parceiros
        if (lowerQuery.includes('agenda') || lowerQuery.includes('consulta')) {
            const response = {
                content: "📅 **Insight de Agenda**\n\nSua agenda parece estável. Recomendo verificar os agendamentos de amanhã para confirmar comparecimento.\n\n• **Ação:** [Ver Agenda](/partner/agenda)",
                charts: [{ type: 'metric', data: { label: 'Ocupação', value: '75%', change: '+5%', positive: true } }]
            };
            await prisma_1.default.chatHistory.create({
                data: {
                    userId,
                    message: query,
                    response: response.content,
                    context: { charts: response.charts }
                }
            });
            return response;
        }
        const content = `🤖 Sou seu assistente Docton. Entendi seu interesse em "${query}".\n\nNo momento estou operando em um modo simplificado, mas posso te ajudar a navegar pela **agenda**, **serviços** ou **financeiro**.`;
        await prisma_1.default.chatHistory.create({
            data: {
                userId,
                message: query,
                response: content,
                context: {}
            }
        });
        return { content };
    }
}
exports.ChatbotService = ChatbotService;
//# sourceMappingURL=chatbot.service.js.map