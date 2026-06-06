import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ChatbotService } from '../services/chatbot.service.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Chat com a Luma (n8n Proxy)
router.post('/chat', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user!.userId;
    // @ts-ignore
    const patientPhone = req.user?.phone || ''; 
    
    const webhookUrl = process.env.N8N_WEBHOOK_URL_LUMA;

    if (!webhookUrl) {
      // Fallback: se não configuraram o n8n no painel ainda, processa igual antigamente.
      console.warn('[Luma Proxy] N8N_WEBHOOK_URL_LUMA ausente. Usando processamento local.');
      const response = await ChatbotService.processPatientQuery(message, userId);
      return res.json(response);
    }

    // Proxy repassando o payload ao Webhook
    const n8nRequest = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ message, userId, patient_phone: patientPhone })
    });

    if (!n8nRequest.ok) {
      throw new Error(`Erro no n8n: ${n8nRequest.statusText}`);
    }

    const n8nData = await n8nRequest.json();

    // Devolve para o Frontend mantendo a tipagem esperada
    res.json({
      content: n8nData.content || 'Não consegui me conectar com os servidores.',
      actions: n8nData.actions || []
    });

  } catch (error) {
    console.error('[Luma Proxy Error]', error);
    res.status(500).json({ error: 'Erro ao processar conversa com a Luma via n8n' });
  }
});

// Histórico de conversas do paciente (CRUD Supabase)
router.get('/history', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { limit = '30' } = req.query;
    const history = await prisma.chatHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: Number(limit),
    });
    res.json(history);
  } catch (error) {
    console.error('[Luma History Error]', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// Deletar mensagem individual do histórico
router.delete('/history/:id', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    await prisma.chatHistory.deleteMany({ where: { id, userId } });
    res.json({ success: true });
  } catch (error) {
    console.error('[Luma History Delete Error]', error);
    res.status(500).json({ error: 'Erro ao deletar mensagem' });
  }
});

// Limpar todo o histórico do usuário
router.delete('/history', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user!.userId;
    await prisma.chatHistory.deleteMany({ where: { userId } });
    res.json({ success: true, message: 'Histórico apagado com sucesso' });
  } catch (error) {
    console.error('[Luma History Clear Error]', error);
    res.status(500).json({ error: 'Erro ao limpar histórico' });
  }
});

// Geração de Voz (TTS)
router.post('/speech', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Texto não informado' });

    const audioBuffer = await ChatbotService.generateSpeech(text);
    
    if (!audioBuffer) {
      return res.status(500).json({ error: 'Erro ao gerar áudio' });
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error('[Luma Speech Error]', error);
    res.status(500).json({ error: 'Erro ao gerar voz da Luma' });
  }
});

// Atualizar preferência de avatar
router.patch('/avatar-preference', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { preference } = req.body; // 'MALE' | 'FEMALE'
    const userId = req.user!.userId;

    const patient = await prisma.patient.update({
      where: { userId },
      // @ts-ignore - TODO: Schema drift fix
      data: { avatarPreference: preference }
    });

    res.json(patient);
  } catch (error) {
    console.error('[Luma Avatar Update Error]', error);
    res.status(500).json({ error: 'Erro ao atualizar preferência de avatar' });
  }
});

export default router;
