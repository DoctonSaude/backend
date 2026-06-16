import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import OpenAI from 'openai';
import { MarketingOrchestrator } from '../../services/ai/marketing-orchestrator.service';

const router = Router();
const adminAuth = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? [] : [authenticate, authorize('ADMIN')];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Prompts dos Agentes DAIOS
const AGENT_PROMPTS: Record<string, string> = {
  SPARK: `Você é SPARK, Head de Ideação Estratégica da Docton.
Sua missão é criar ideias brilhantes de marketing para a área da saúde.
Responda sempre de forma direta, listando ideias claras e objetivas.
Mantenha o tom da Docton: Humano, Premium, Tecnológico, Confiável, Simples.`,
  MAYA: `Você é MAYA, Head de Persuasão e Copywriter da Docton.
Sua missão é transformar atenção em ação criando textos magnéticos (headlines, e-mails, posts).
Use frameworks como AIDA e PAS. Foque em conversão ética.
Mantenha o tom da Docton: Humano, Premium, Tecnológico, Confiável, Simples.`,
  LUNA: `Você é LUNA, Head de Conteúdo da Docton.
Sua missão é criar estruturas e calendários para conteúdo educativo (Carrosséis, Stories, Blog).
Entregue sempre: Estrutura visual, Texto, CTA e Objetivo.
Mantenha o tom da Docton: Humano, Premium, Tecnológico, Confiável, Simples.`,
  FLASH: `Você é FLASH, Head de Vídeos Curtos e Roteirista da Docton.
Sua missão é criar roteiros envolventes para Reels, Shorts e TikTok.
Entregue sempre: Hook, Cena a Cena, Falas, Texto na Tela, e Dica de Edição.
Mantenha o tom da Docton: Humano, Premium, Tecnológico, Confiável, Simples.`,
  VISION: `Você é VISION, Head de Direção de Arte da Docton.
Sua missão é criar prompts precisos para Midjourney e DALL-E, gerando imagens hiper-realistas e premium para campanhas de saúde.
Entregue sempre: O conceito, o Prompt em Inglês, e a iluminação/lentes.`,
  PIXEL: `Você é PIXEL, Head de Design UI/UX da Docton.
Sua missão é auxiliar o usuário com códigos CSS/Tailwind, estruturas visuais de Landing Pages e críticas de design.
Foque em design limpo, glassmorphism e cores harmoniosas (Tom Premium).`,
  PULSE: `Você é PULSE, Head de Data & Analytics da Docton.
Sua missão é ler métricas de campanhas, cliques e conversões, entregando insights acionáveis e diretos.
Identifique gargalos no funil e sugira melhorias com base em dados.`,
  ECHO: `Você é ECHO, Head de Aquisição e Tráfego Pago da Docton.
Sua missão é estruturar campanhas de anúncios (Meta Ads, Google Ads) com segmentação precisa e A/B tests.
Entregue sempre: Público-alvo, Criativo recomendado, Orçamento sugerido, KPI de controle.`,
  MIRROR: `Você é MIRROR, Head de Remarketing e Retenção da Docton.
Sua missão é recuperar leads frios, reativar pacientes inativos e estruturar funis de nutrição.
Entregue sempre: Segmento, Mensagem, Canal e Sequência de touchpoints.`,
  FLOW: `Você é FLOW, Head de Automação e Integrações da Docton.
Sua missão é desenhar fluxos de automação conectando o DAIOS com ferramentas externas (n8n, Make, Zapier).
Entregue sempre: Trigger, Ação, Condição e Ferramenta recomendada para cada automação.`,
};

// ─── AGENTES IA ────────────────────────────────────────────────────────────────
router.post('/marketing/agent', ...adminAuth, async (req: any, res: any) => {
  try {
    const { agentId, prompt } = req.body;
    if (!agentId || !prompt) return res.status(400).json({ error: 'agentId e prompt são obrigatórios' });

    const systemPrompt = AGENT_PROMPTS[agentId] || 'Você é um assistente IA da Docton.';

    if (!process.env.OPENAI_API_KEY) {
      const mockResponse = `[${agentId}] Resposta simulada para: "${prompt}".\n\nAdicione OPENAI_API_KEY no Railway para ativar a IA real.`;
      await prisma.agentLog.create({ data: { agentId, prompt, response: mockResponse, tokensUsed: 0 } });
      return res.json({ response: mockResponse });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
    });

    const responseText = completion.choices[0].message.content || '';
    await prisma.agentLog.create({
      data: { agentId, prompt, response: responseText, tokensUsed: completion.usage?.total_tokens || 0 }
    });

    return res.json({ response: responseText });
  } catch (error) {
    console.error('[Marketing AI] Error:', error);
    res.status(500).json({ error: 'Erro ao gerar resposta com o agente de IA.' });
  }
});

// ─── CAMPANHAS ────────────────────────────────────────────────────────────────
router.get('/marketing/campaigns', ...adminAuth, async (req: any, res: any) => {
  try {
    const campaigns = await prisma.marketingCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { assets: true }
    });
    return res.json(campaigns);
  } catch (error) {
    console.error('[Marketing] Error fetching campaigns:', error);
    res.status(500).json({ error: 'Erro ao carregar campanhas.' });
  }
});

router.post('/marketing/campaigns', ...adminAuth, async (req: any, res: any) => {
    try {
        const { name, objective, status, audience, budget, type } = req.body;
        const campaign = await prisma.marketingCampaign.create({
            data: { 
              name, 
              objective, 
              type: type || 'STANDARD',
              status: status || 'DRAFT', 
              targetAudience: audience ? { audience } : undefined, 
              stats: budget ? { budget: parseFloat(budget) } : undefined 
            }
        });
        
        // Dispara a orquestração do Conselho Executivo Digital em background
        // Sem dar await para não travar a resposta da requisição no frontend
        MarketingOrchestrator.runInitialCampaignGeneration(campaign.id).catch(err => {
            console.error('[MarketingOrchestrator] Falha ao executar workflow background:', err);
        });

        return res.status(201).json(campaign);
    } catch (error) {
        console.error('[Marketing] Error creating campaign:', error);
        return res.status(500).json({ error: 'Erro ao criar campanha' });
    }
});

router.put('/marketing/campaigns/:id', ...adminAuth, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { name, objective, status, audience, budget } = req.body;
        const campaign = await prisma.marketingCampaign.update({
            where: { id },
            data: { 
              name, 
              objective, 
              status, 
              targetAudience: audience ? { audience } : undefined, 
              stats: budget ? { budget: parseFloat(budget) } : undefined 
            }
        });
        return res.json(campaign);
    } catch (error) {
        console.error('[Marketing] Error updating campaign:', error);
        return res.status(500).json({ error: 'Erro ao atualizar campanha' });
    }
});

router.get('/marketing/assets', ...adminAuth, async (req: any, res: any) => {
    try {
        const assets = await prisma.marketingAsset.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json(assets);
    } catch (error) {
        console.error('[Marketing] Error fetching assets:', error);
        return res.status(500).json({ error: 'Erro ao buscar assets' });
    }
});

router.post('/marketing/assets', ...adminAuth, async (req: any, res: any) => {
  try {
    const { campaignId, type, content, agentId } = req.body;
    const asset = await prisma.marketingAsset.create({
      data: { campaignId, type, content, agentId, status: 'APPROVED' }
    });
    return res.status(201).json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar asset.' });
  }
});

// ─── CRONOGRAMA EDITORIAL (LUNA / FLASH — Fase 2) ────────────────────────────
router.get('/marketing/schedule', ...adminAuth, async (req: any, res: any) => {
  try {
    const schedules = await prisma.contentSchedule.findMany({ orderBy: { publishAt: 'asc' } });
    return res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar cronograma.' });
  }
});

router.post('/marketing/schedule', ...adminAuth, async (req: any, res: any) => {
  try {
    const { title, description, platform, status, publishAt, assetId } = req.body;
    const schedule = await prisma.contentSchedule.create({
      data: { title, description, platform, status: status || 'DRAFT', publishAt: publishAt ? new Date(publishAt) : null }
    });
    return res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao agendar conteúdo.' });
  }
});

router.put('/marketing/schedule/:id', ...adminAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title, description, platform, status, publishAt } = req.body;
    const schedule = await prisma.contentSchedule.update({
      where: { id },
      data: { title, description, platform, status, publishAt: publishAt ? new Date(publishAt) : null }
    });
    return res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar cronograma.' });
  }
});

router.delete('/marketing/schedule/:id', ...adminAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await prisma.contentSchedule.delete({ where: { id } });
    return res.json({ message: 'Agendamento removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover cronograma.' });
  }
});

// ─── WEBHOOKS DE AUTOMAÇÃO — FLOW (Fase 4) ───────────────────────────────────
router.get('/marketing/webhooks', ...adminAuth, async (req: any, res: any) => {
  try {
    const webhooks = await prisma.marketingWebhook.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar webhooks.' });
  }
});

router.post('/marketing/webhooks', ...adminAuth, async (req: any, res: any) => {
  try {
    const { name, description, url, platform } = req.body;
    const webhook = await prisma.marketingWebhook.create({
      data: { event: name || 'N8N', url, isActive: true }
    });
    return res.status(201).json(webhook);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar webhook.' });
  }
});

router.put('/marketing/webhooks/:id', ...adminAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, description, url, platform, isActive } = req.body;
    const webhook = await prisma.marketingWebhook.update({
      where: { id },
      data: { event: name || 'N8N', url, isActive }
    });
    return res.json(webhook);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar webhook.' });
  }
});

router.delete('/marketing/webhooks/:id', ...adminAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await prisma.marketingWebhook.delete({ where: { id } });
    return res.json({ message: 'Webhook removido.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover webhook.' });
  }
});

router.post('/marketing/webhooks/:id/trigger', ...adminAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const webhook = await prisma.marketingWebhook.findUnique({ where: { id } });
    if (!webhook || !webhook.isActive) return res.status(404).json({ error: 'Webhook não encontrado ou inativo.' });

    const result = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'DAIOS', agentId: 'FLOW', webhookId: id, triggeredAt: new Date() })
    });

    await prisma.marketingWebhook.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    return res.json({ success: true, statusCode: result.status });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao disparar webhook.' });
  }
});

export default router;
