import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import openAIService from '../services/ai/openai.service.js';

export class HealthToolController {
  /**
   * Analisar sintomas usando IA (OpenAI)
   */
  async analyzeSymptoms(req: Request, res: Response) {
    try {
      const { patientId, symptoms } = req.body;

      if (!patientId || !symptoms || !Array.isArray(symptoms)) {
        return res.status(400).json({ error: 'Dados inválidos. patientId e symptoms (array) são obrigatórios.' });
      }

      // Preparar prompt para a OpenAI
      const symptomList = symptoms.map((s: any) => 
        `- ${s.name} (Gravidade: ${s.severity}, Duração: ${s.duration}, Frequência: ${s.frequency})`
      ).join('\n');

      const prompt = `
        Você é um assistente médico de IA para a plataforma Docton Saúde. 
        Analise os seguintes sintomas relatados por um paciente e forneça uma resposta em JSON estruturado:
        
        Sintomas:
        ${symptomList}
        
        A resposta DEVE estar no seguinte formato JSON estrito:
        {
          "urgencyLevel": "baixa" | "media" | "alta" | "critica",
          "possibleConditions": [
            {
              "name": "Nome da Condição",
              "probability": 0-100,
              "severity": "baixa" | "media" | "alta",
              "description": "Breve descrição",
              "recommendations": ["Rec 1", "Rec 2"]
            }
          ],
          "recommendations": ["Dica geral 1", "Dica geral 2"],
          "warningFlags": ["Sinal de alerta 1"],
          "nextSteps": ["Passo 1", "Passo 2"],
          "suggestedSpecialties": ["Cardiologia", "Clínica Médica"]
        }
        
        IMPORTANTE: Use linguagem clara em Português do Brasil. Seja cauteloso e sempre inclua avisos de que isto não substitui uma consulta médica.
      `;

      const aiResponse = await openAIService.chat([
        { role: 'system', content: 'Você é um assistente médico virtual especializado em triagem inicial.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.3 });

      // Tentar parsear a resposta da IA
      let result;
      try {
        // Remover possíveis blocos de código markdown se a IA colocar
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
        result = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Erro ao parsear resposta da IA:', aiResponse);
        return res.status(500).json({ error: 'Erro na análise da IA. Formato de resposta inválido.' });
      }

      // Salvar no Banco de Dados
      const analysis = await prisma.symptomAnalysis.create({
        data: {
          patientId,
          symptoms: symptoms as any,
          result: result as any
        }
      });

      return res.status(201).json(analysis);
    } catch (error) {
      console.error('Erro no SymptomAnalyzer:', error);
      return res.status(500).json({ error: 'Erro interno ao analisar sintomas.' });
    }
  }

  /**
   * Verificar interações medicamentosas usando IA
   */
  async checkInteractions(req: Request, res: Response) {
    try {
      const { patientId, newMedications } = req.body;

      if (!patientId || !newMedications) {
        return res.status(400).json({ error: 'patientId e newMedications são obrigatórios.' });
      }

      // Buscar medicamentos atuais do paciente (Prescrições ativas)
      const currentPrescriptions = await prisma.prescription.findMany({
        where: { 
          patientId,
          status: 'Ativo'
        }
      });

      const currentMeds = currentPrescriptions.map(p => p.medication).filter(Boolean).join(', ');
      const newMeds = Array.isArray(newMedications) ? newMedications.join(', ') : newMedications;

      const prompt = `
        Analise as possíveis interações medicamentosas entre os medicamentos atuais do paciente e os novos medicamentos que ele pretende tomar.
        
        Medicamentos Atuais: ${currentMeds || 'Nenhum registrado'}
        Novos Medicamentos: ${newMeds}
        
        Forneça uma resposta em JSON estruturado com o seguinte formato:
        {
          "hasRisk": boolean,
          "severity": "nenhuma" | "leve" | "moderada" | "grave",
          "interactions": [
            {
              "meds": ["Med 1", "Med 2"],
              "severity": "leve" | "moderada" | "grave",
              "description": "O que acontece",
              "recommendations": ["O que fazer"]
            }
          ],
          "disclaimer": "Aviso médico padrão"
        }
        Responda apenas com o JSON em Português Brasil.
      `;

      const aiResponse = await openAIService.chat([
        { role: 'system', content: 'Você é um especialista em farmacologia clínica.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.2 });

      let result;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
        result = JSON.parse(jsonStr);
      } catch (e) {
        return res.status(500).json({ error: 'Erro ao processar interações via IA.' });
      }

      return res.json(result);
    } catch (error) {
      console.error('Erro no InteractionChecker:', error);
      return res.status(500).json({ error: 'Erro interno ao verificar interações.' });
    }
  }

  /**
   * Obter histórico de ferramentas de saúde
   */
  async getHistory(req: Request, res: Response) {
    try {
      const { patientId } = req.query;

      if (!patientId) {
        return res.status(400).json({ error: 'patientId é necessário.' });
      }

      const symptomHistory = await prisma.symptomAnalysis.findMany({
        where: { patientId: patientId as string },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Também buscar logs de saúde que sejam do tipo 'CALCULATION'
      const calculationHistory = await prisma.healthLog.findMany({
        where: { 
          patientId: patientId as string,
          type: { in: ['CALCULATION', 'IMC', 'BMI', 'CREATININE_CLEARANCE', 'IDEAL_WEIGHT'] }
        },
        orderBy: { logDate: 'desc' },
        take: 20
      });

      return res.json({
        symptoms: symptomHistory,
        calculations: calculationHistory
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar histórico.' });
    }
  }

  /**
   * Salvar resultado de calculadoras
   */
  async saveCalculation(req: Request, res: Response) {
    try {
      const { patientId, type, value, unit, notes } = req.body;

      const log = await prisma.healthLog.create({
        data: {
          patientId,
          type: type.toUpperCase(),
          value: String(value),
          unit,
          notes,
          logDate: new Date()
        }
      });

      return res.status(201).json(log);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao salvar cálculo.' });
    }
  }
}

const healthToolController = new HealthToolController();
export default healthToolController;
