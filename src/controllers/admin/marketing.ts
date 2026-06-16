import { Request, Response } from 'express';
import prisma from '../../lib/prisma.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-fake-key-for-now',
});

// Prompts dos Agentes
const AGENT_PROMPTS = {
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
Entregue sempre: Trigger, Ação, Condição e Ferramenta recomendada para cada automação.`
};

/**
 * Endpoint para interação direta com os Agentes IA (SPARK, MAYA, etc.)
 */
export async function chatWithAgent(req: Request, res: Response) {
  try {
    const { agentId, prompt, campaignId } = req.body;

    if (!agentId || !prompt) {
      return res.status(400).json({ error: 'agentId e prompt são obrigatórios' });
    }

    const systemPrompt = AGENT_PROMPTS[agentId as keyof typeof AGENT_PROMPTS] || 'Você é um assistente IA da Docton.';

    // Se a API Key for fake, vamos retornar um mock para o usuário conseguir ver funcionando
    if (!process.env.OPENAI_API_KEY) {
      const mockResponse = `[${agentId}] Simulação de resposta gerada pela IA para o prompt: "${prompt}".\n\nPor favor, adicione a OPENAI_API_KEY no .env do servidor para interações reais.`;
      
      // Registrar log no banco
      await prisma.agentLog.create({
        data: {
          agentId,
          prompt,
          response: mockResponse,
          tokensUsed: 0
        }
      });

      return res.json({ response: mockResponse });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    });

    const responseText = completion.choices[0].message.content || '';

    // Salvar Log
    await prisma.agentLog.create({
      data: {
        agentId,
        prompt,
        response: responseText,
        tokensUsed: completion.usage?.total_tokens || 0
      }
    });

    return res.json({ response: responseText });
  } catch (error) {
    console.error(`[Marketing AI] Error with ${req.body.agentId}:`, error);
    res.status(500).json({ error: 'Erro ao gerar resposta com o agente de IA.' });
  }
}

/**
 * Listar Campanhas de Marketing
 */
export async function getCampaigns(req: Request, res: Response) {
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
}

/**
 * Criar Campanha
 */
export async function createCampaign(req: Request, res: Response) {
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
    
    return res.status(201).json(campaign);
  } catch (error) {
    console.error('[Marketing] Error creating campaign:', error);
    res.status(500).json({ error: 'Erro ao criar campanha.' });
  }
}

/**
 * Adicionar Asset à Campanha
 */
export async function createAsset(req: Request, res: Response) {
  try {
    const { campaignId, type, content, agentId } = req.body;
    
    const asset = await prisma.marketingAsset.create({
      data: {
        campaignId,
        type,
        content,
        agentId,
        status: 'APPROVED'
      }
    });
    
    return res.status(201).json(asset);
  } catch (error) {
    console.error('[Marketing] Error creating asset:', error);
    res.status(500).json({ error: 'Erro ao criar asset.' });
  }
}

/**
 * Agendamento de Conteúdo (LUNA / FLASH)
 */
export async function getContentSchedule(req: Request, res: Response) {
  try {
    const schedules = await prisma.contentSchedule.findMany({
      orderBy: { publishAt: 'asc' }
    });
    return res.json(schedules);
  } catch (error) {
    console.error('[Marketing] Error fetching schedules:', error);
    res.status(500).json({ error: 'Erro ao carregar cronograma.' });
  }
}

export async function createContentSchedule(req: Request, res: Response) {
  try {
    const { title, description, platform, status, publishAt, assetId } = req.body;
    
    const schedule = await prisma.contentSchedule.create({
      data: {
        title,
        description,
        platform,
        status: status || 'DRAFT',
        publishAt: publishAt ? new Date(publishAt) : null
      }
    });
    
    return res.status(201).json(schedule);
  } catch (error) {
    console.error('[Marketing] Error creating schedule:', error);
    res.status(500).json({ error: 'Erro ao agendar conteúdo.' });
  }
}

export async function updateContentSchedule(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, description, platform, status, publishAt } = req.body;
    
    const schedule = await prisma.contentSchedule.update({
      where: { id },
      data: {
        title,
        description,
        platform,
        status,
        publishAt: publishAt ? new Date(publishAt) : null
      }
    });
    
    return res.json(schedule);
  } catch (error) {
    console.error('[Marketing] Error updating schedule:', error);
    res.status(500).json({ error: 'Erro ao atualizar cronograma.' });
  }
}

export async function deleteContentSchedule(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.contentSchedule.delete({ where: { id } });
    return res.json({ message: 'Agendamento removido' });
  } catch (error) {
    console.error('[Marketing] Error deleting schedule:', error);
    res.status(500).json({ error: 'Erro ao remover cronograma.' });
  }
}

/**
 * CRUD de Webhooks — FLOW (Fase 4)
 */
export async function getWebhooks(req: Request, res: Response) {
  try {
    const webhooks = await prisma.marketingWebhook.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(webhooks);
  } catch (error) {
    console.error('[Marketing] Error fetching webhooks:', error);
    res.status(500).json({ error: 'Erro ao carregar webhooks.' });
  }
}

export async function createWebhook(req: Request, res: Response) {
  try {
    const { name, description, url, platform } = req.body;
    const webhook = await prisma.marketingWebhook.create({
      data: { event: name || 'N8N', url, isActive: true }
    });
    return res.status(201).json(webhook);
  } catch (error) {
    console.error('[Marketing] Error creating webhook:', error);
    res.status(500).json({ error: 'Erro ao criar webhook.' });
  }
}

export async function updateWebhook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, url, platform, isActive } = req.body;
    const webhook = await prisma.marketingWebhook.update({
      where: { id },
      data: { event: name || 'N8N', url, isActive }
    });
    return res.json(webhook);
  } catch (error) {
    console.error('[Marketing] Error updating webhook:', error);
    res.status(500).json({ error: 'Erro ao atualizar webhook.' });
  }
}

export async function deleteWebhook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.marketingWebhook.delete({ where: { id } });
    return res.json({ message: 'Webhook removido.' });
  } catch (error) {
    console.error('[Marketing] Error deleting webhook:', error);
    res.status(500).json({ error: 'Erro ao remover webhook.' });
  }
}

export async function triggerWebhook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const webhook = await prisma.marketingWebhook.findUnique({ where: { id } });

    if (!webhook || !webhook.isActive) {
      return res.status(404).json({ error: 'Webhook não encontrado ou inativo.' });
    }

    // Disparo real via fetch para a URL cadastrada
    const result = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'DAIOS', agentId: 'FLOW', webhookId: id, triggeredAt: new Date() })
    });

    await prisma.marketingWebhook.update({
      where: { id },
      data: {
        updatedAt: new Date()
      }
    });

    return res.json({ success: true, statusCode: result.status });
  } catch (error) {
    console.error('[Marketing] Error triggering webhook:', error);
    res.status(500).json({ error: 'Erro ao disparar webhook.' });
  }
}
