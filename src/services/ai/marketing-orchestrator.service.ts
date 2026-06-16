import prisma from '../../lib/prisma.js';
import OpenAI from 'openai';

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'your-openai-api-key') return null;
  return new OpenAI({ apiKey: key });
}

const AGENT_PROMPTS: Record<string, string> = {
  SPARK: `Você é SPARK, Head de Ideação Estratégica da Docton.
Sua missão é criar ideias brilhantes de marketing para a área da saúde.
Retorne APENAS um texto contendo 3 ideias claras e objetivas, sem enrolação.
Mantenha o tom da Docton: Humano, Premium, Tecnológico, Confiável, Simples.`,
  MAYA: `Você é MAYA, Head de Persuasão e Copywriter da Docton.
Sua missão é transformar atenção em ação criando textos magnéticos.
Gere 1 Copy para E-mail e 1 Script de Reels baseado na ideia central fornecida.
Foque em conversão ética. Retorne APENAS o texto da copy e script.
Mantenha o tom da Docton: Humano, Premium, Tecnológico, Confiável, Simples.`,
  LUNA: `Você é LUNA, Head de Conteúdo da Docton.
Sua missão é criar estruturas de postagens para redes sociais.
Dado o contexto, gere 3 títulos de posts (1 Carrossel, 1 Reel, 1 Imagem estática) com uma breve descrição para cada.
Retorne APENAS os 3 itens, linha por linha.
Mantenha o tom da Docton: Humano, Premium, Tecnológico, Confiável, Simples.`,
  VISION: `Você é VISION, Head de Direção de Arte da Docton.
Sua missão é criar prompts precisos para Midjourney e DALL-E.
Gere 3 Prompts em Inglês para ilustrar o conceito da campanha.
Retorne APENAS os 3 prompts em inglês.`,
};

export class MarketingOrchestrator {
  
  static async runInitialCampaignGeneration(campaignId: string) {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[MarketingOrchestrator] OPENAI_API_KEY não configurada. Simulando orquestração...');
      // Simulando a criação para fins de teste sem chave
      await this.createMockAssets(campaignId);
      return;
    }

    try {
      console.log(`[MarketingOrchestrator] Iniciando orquestração para campanha ${campaignId}...`);
      const campaign = await prisma.marketingCampaign.findUnique({ where: { id: campaignId } });
      if (!campaign) return;

      const baseContext = `Campanha: ${campaign.name}. Objetivo: ${campaign.objective}.`;

      // 1. SPARK gera Ideias
      const sparkResponse = await this.askAgent('SPARK', `Gere 3 ideias virais e ganchos para esta campanha. ${baseContext}`);
      await prisma.marketingAsset.create({
        data: { campaignId, type: 'IDEA', content: sparkResponse, agentId: 'SPARK', status: 'GENERATED' }
      });

      // 2. MAYA gera Copy baseada na primeira ideia do Spark (ou no conceito geral)
      const mayaResponse = await this.askAgent('MAYA', `Baseado nas ideias do Spark (${sparkResponse}), crie 1 Copy de E-mail de conversão e 1 Script Base para vídeo.`);
      await prisma.marketingAsset.create({
        data: { campaignId, type: 'COPY', content: mayaResponse, agentId: 'MAYA', status: 'GENERATED' }
      });

      // 3. LUNA cria agendas de conteúdo
      const lunaResponse = await this.askAgent('LUNA', `Baseado na copy da Maya (${mayaResponse}), crie 3 pautas de conteúdo (1 Carrossel, 1 Reel, 1 Story).`);
      
      // Quebrar a resposta da Luna em linhas e criar agendamentos (Aproximação)
      const posts = lunaResponse.split('\n').filter(line => line.trim().length > 10).slice(0, 3);
      for (let i = 0; i < posts.length; i++) {
        await prisma.contentSchedule.create({
          data: {
            title: `Post ${i + 1} - ${campaign.name}`,
            description: posts[i].substring(0, 200),
            platform: i === 0 ? 'INSTAGRAM' : (i === 1 ? 'TIKTOK' : 'LINKEDIN'),
            status: 'DRAFT'
          }
        });
      }

      // 4. VISION cria prompts de imagem
      const visionResponse = await this.askAgent('VISION', `Baseado na campanha ${baseContext}, crie 3 prompts do Midjourney para criativos de anúncios.`);
      await prisma.marketingAsset.create({
        data: { campaignId, type: 'PROMPT', content: visionResponse, agentId: 'VISION', status: 'GENERATED' }
      });

      console.log(`[MarketingOrchestrator] Orquestração concluída para campanha ${campaignId}.`);
    } catch (error) {
      console.error('[MarketingOrchestrator] Erro na orquestração:', error);
    }
  }

  private static async askAgent(agentId: string, prompt: string): Promise<string> {
    const systemPrompt = AGENT_PROMPTS[agentId] || 'Você é um assistente IA da Docton.';
    
    const openai = getOpenAI();
    if (!openai) {
      console.warn(`[MarketingOrchestrator] Chave OpenAI não encontrada. Simulando resposta para agente ${agentId}.`);
      return `[Mock ${agentId}] Resposta simulada para: ${prompt.substring(0, 50)}...`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    });

    const response = completion.choices[0]?.message?.content || '';
    
    // Salva o log de uso do agente para auditoria
    await prisma.agentLog.create({
      data: { agentId, prompt, response, tokensUsed: completion.usage?.total_tokens || 0 }
    });

    return response;
  }

  private static async createMockAssets(campaignId: string) {
    await prisma.marketingAsset.create({
      data: { campaignId, type: 'IDEA', content: '[SPARK Mock] Ideia de Campanha Sensacional 1\n[SPARK Mock] Gancho Oculto 2', agentId: 'SPARK', status: 'GENERATED' }
    });
    await prisma.marketingAsset.create({
      data: { campaignId, type: 'COPY', content: '[MAYA Mock] Assunto: Essa novidade mudou tudo!\nOlá paciente, temos algo novo...', agentId: 'MAYA', status: 'GENERATED' }
    });
    await prisma.marketingAsset.create({
      data: { campaignId, type: 'PROMPT', content: '/imagine prompt: healthy patient smiling cinematic lighting 8k --ar 16:9', agentId: 'VISION', status: 'GENERATED' }
    });
    await prisma.contentSchedule.create({
      data: { title: 'Post Carrossel (Mock LUNA)', description: '5 motivos para agendar hoje', platform: 'INSTAGRAM', status: 'DRAFT' }
    });
  }
}
