import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

router.get('/chatbot/history', ...adminAuth, async (req, res) => {
  try {
    const history = await prisma.chatHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return res.json(history);
  } catch (err) {
    console.error('Erro ao carregar histórico do chatbot:', err);
    return res.status(500).json({ error: 'Erro ao carregar histórico' });
  }
});

router.delete('/chatbot/history', ...adminAuth, async (req, res) => {
  try {
    await prisma.chatHistory.deleteMany();
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao limpar histórico do chatbot:', err);
    return res.status(500).json({ error: 'Erro ao limpar histórico' });
  }
});

router.post('/chatbot/query', ...adminAuth, async (req, res) => {
  try {
    const { query } = req.body;
    
    // Simulate AI response logic
    let responseText = "Entendi. Estou processando sua solicitação.";
    let contextData: any[] = [];
    let charts: any[] = [];

    if (query.toLowerCase().includes('receita') || query.toLowerCase().includes('financeiro')) {
      // Fetch actual quotes or revenue proxies from Prisma
      const totalQuotes = await prisma.quote.count().catch(() => 0);
      const approvedQuotes = await prisma.quote.count({ where: { status: 'APPROVED' } }).catch(() => 0);
      responseText = `No momento, o sistema registra um total de ${totalQuotes} cotações, sendo ${approvedQuotes} aprovadas.`;
      charts.push({ type: 'metric', data: { label: 'Cotações Aprovadas', value: String(approvedQuotes), positive: true, change: '+Ativas' } });
      
    } else if (query.toLowerCase().includes('usuários') || query.toLowerCase().includes('usuario')) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const totalUsers = await prisma.user.count().catch(() => 0);
      const newUsersToday = await prisma.user.count({
        where: { createdAt: { gte: startOfDay } }
      }).catch(() => 0);
      
      responseText = `Atualmente temos um total de ${totalUsers} usuários na plataforma, sendo ${newUsersToday} registrados hoje.`;
      charts.push({ type: 'metric', data: { label: 'Novos Usuários (Hoje)', value: String(newUsersToday), positive: newUsersToday > 0, change: newUsersToday > 0 ? '+Alta' : 'Estável' } });
      
    } else if (query.toLowerCase().includes('parceiros')) {
      const activePartners = await prisma.partner.count({ where: { isApproved: true } }).catch(() => 0);
      const pendingPartners = await prisma.partner.count({ where: { isApproved: false } }).catch(() => 0);
      responseText = `Temos ${activePartners} parceiros ativos e ${pendingPartners} aguardando aprovação.`;
      charts.push({ type: 'metric', data: { label: 'Parceiros Ativos', value: String(activePartners), positive: true, change: 'Estável' } });

    } else if (query.toLowerCase().includes('alertas') || query.toLowerCase().includes('críticos')) {
      const urgentTickets = await prisma.supportTicket.count({ where: { priority: 'URGENT', status: 'OPEN' } }).catch(() => 0);
      if (urgentTickets > 0) {
        responseText = `Atenção: Existem ${urgentTickets} chamados de suporte URGENTES abertos no momento!`;
        charts.push({ type: 'metric', data: { label: 'Chamados Críticos', value: String(urgentTickets), positive: false, change: 'Requer Atenção' } });
      } else {
        responseText = "Não há nenhum alerta crítico ou chamado urgente no momento. O sistema opera normalmente.";
        charts.push({ type: 'metric', data: { label: 'Sistema Saudável', value: '100%', positive: true, change: 'Sem Alertas' } });
      }
    } else {
      responseText = `Pesquisa recebida: "${query}". No momento estou focado em extrair métricas de Usuários, Parceiros, Financeiro e Alertas via Supabase.`;
    }

    const created = await prisma.chatHistory.create({
      data: {
        message: query,
        response: responseText,
        userId: req.user?.userId || null,
        context: charts.length > 0 ? charts : [],
      }
    });

    return res.json({ content: responseText, charts });
  } catch (err) {
    console.error('Erro ao processar consulta do chatbot:', err);
    return res.status(500).json({ error: 'Erro ao processar consulta' });
  }
});

export default router;
