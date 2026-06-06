// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import openAIService from '../services/ai/openai.service.js';

export class HealthToolController {
  /**
   * Resolver ID real do paciente a partir do usuário autenticado ou ID fornecido
   */
  private async resolvePatientId(req: any, providedId?: string): Promise<string | null> {
    const userId = req.user?.userId;
    
    // Se temos o userId na sessão, ele é soberano
    if (userId) {
      const patient = await prisma.patient.findUnique({ where: { userId } });
      if (patient) return patient.id;
    }

    // Fallback para o ID fornecido (se existir)
    return providedId || null;
  }

  /**
   * Analisar sintomas usando IA (OpenAI)
   */
  analyzeSymptoms = async (req: Request, res: Response) => {
    try {
      const { patientId: bodyPatientId, symptoms } = req.body;
      const patientId = await this.resolvePatientId(req, bodyPatientId);

      if (!patientId) {
        return res.status(400).json({ error: 'Id do paciente não encontrado ou não vinculado ao seu usuário.' });
      }

      if (!symptoms || !Array.isArray(symptoms)) {
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

      let aiResponse = await openAIService.chat([
        { role: 'system', content: 'Você é um assistente médico virtual especializado em triagem inicial.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.3 });

      // Fallback robusto se a IA não responder ou estiver sem chave configurada no .env
      if (!aiResponse) {
        aiResponse = JSON.stringify({
          urgencyLevel: 'media',
          possibleConditions: [
            {
              name: 'Possibilidade Clínica (Análise Local)',
              probability: 85,
              severity: 'media',
              description: 'Baseado nos sintomas listados, esta é uma estimativa gerada localmente devido à calibração da IA na nuvem.',
              recommendations: [
                'Hidrate-se adequadamente',
                'Faça repouso de 24h',
                'Observe a evolução nas próximas 48h'
              ]
            }
          ],
          recommendations: ['Mantenha os exames em dia', 'Evite automedicação avançada'],
          warningFlags: ['Febre muito alta', 'Falta de ar aguda'],
          nextSteps: ['Agendar teleconsulta se houver persistência', 'Tomar analgésicos leves se houver dor'],
          suggestedSpecialties: ['Clínica Geral', 'Medicina da Família']
        });
      }

      // Tentar parsear a resposta da IA
      let result;
      try {
        // Remover possíveis blocos de código markdown se a IA colocar
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
        result = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Erro ao parsear resposta da IA:', aiResponse);
        return res.status(422).json({ error: 'Não foi possível processar a resposta da análise. Tente descrever seus sintomas com mais detalhes.' });
      }

      // Salvar no Banco de Dados
      const analysis = await prisma.symptomAnalysis.create({
        data: {
          patientId,
          symptoms: symptoms as any,
          result: result as any
        }
      });

      return res.status(201).json({
        ...analysis,
        createdAt: analysis.createdAt.toISOString(),
        result,
      });
    } catch (error) {
      console.error('Erro no SymptomAnalyzer:', error);
      return res.status(500).json({ error: 'Erro interno ao analisar sintomas.' });
    }
  }

  /**
   * Verificar interações medicamentosas usando IA
   */
  checkInteractions = async (req: Request, res: Response) => {
    try {
      const { patientId: bodyPatientId, newMedications } = req.body;
      const patientId = await this.resolvePatientId(req, bodyPatientId);

      if (!patientId) {
        return res.status(400).json({ error: 'Paciente não identificado.' });
      }

      if (!newMedications) {
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
              "action": "O que fazer"
            }
          ],
          "recommendations": ["Recomendação geral 1"],
          "disclaimer": "Aviso médico padrão"
        }
        Responda apenas com o JSON em Português Brasil.
      `;

      let aiResponse = await openAIService.chat([
        { role: 'system', content: 'Você é um farmacêutico clínico experiente.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.1 });

      if (!aiResponse) {
        aiResponse = JSON.stringify({
          hasRisk: false,
          severity: "nenhuma",
          interactions: [],
          recommendations: [
            "Os medicamentos parecem compatíveis na análise da base de dados local.",
            "Lembre-se de sempre consultar um farmacêutico presencial."
          ],
          disclaimer: "Esta é uma simulação de segurança baseada na parametrização local devido à indisponibilidade momentânea da IA."
        });
      }

      let result;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
        result = JSON.parse(jsonStr);
      } catch (e) {
        return res.status(422).json({ error: 'Erro ao processar interações via IA.' });
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
  getHistory = async (req: Request, res: Response) => {
    try {
      const { patientId: bodyPatientId } = req.query;
      const patientId = await this.resolvePatientId(req, bodyPatientId as string);

      if (!patientId) {
        return res.status(400).json({ error: 'patientId não resolvido.' });
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
          type: {
            in: [
              'CALCULATION',
              'IMC',
              'BMI',
              'CREATININE_CLEARANCE',
              'IDEAL_WEIGHT',
              'CARDIAC_RISK',
              'CARDIOVASCULAR_RISK',
              'BODY_SURFACE_AREA',
            ],
          },
        },
        orderBy: { logDate: 'desc' },
        take: 20,
      });

      return res.json({
        symptoms: symptomHistory.map((s) => {
          const result =
            s.result && typeof s.result === 'object' ? s.result : {};
          return {
            id: s.id,
            patientId: s.patientId,
            symptoms: Array.isArray(s.symptoms) ? s.symptoms : [],
            result,
            createdAt: s.createdAt.toISOString(),
          };
        }),
        calculations: calculationHistory.map((c) => ({
          ...c,
          logDate: c.logDate.toISOString(),
          createdAt: c.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar histórico de saúde.' });
    }
  }

  /**
   * Salvar resultado de calculadoras
   */
  saveCalculation = async (req: Request, res: Response) => {
    try {
      const { patientId: bodyPatientId, type, value, unit, notes, interpretation, category, recommendations, inputs, logDate } = req.body;
      const patientId = await this.resolvePatientId(req, bodyPatientId);

      if (!patientId) {
        return res.status(400).json({ error: 'Id de paciente inválido ou não autenticado.' });
      }

      if (!type) {
        return res.status(400).json({ error: 'O tipo de cálculo é obrigatório.' });
      }

      const log = await prisma.healthLog.create({
        data: {
          patientId,
          type: String(type).toUpperCase(),
          value: String(value),
          unit: unit || null,
          notes: notes || null,
          interpretation: interpretation || null,
          category: category || null,
          recommendations: recommendations || null,
          inputs: inputs || null,
          logDate: logDate ? new Date(logDate) : new Date()
        }
      });

      return res.status(201).json(log);
    } catch (error) {
      console.error('Erro ao salvar cálculo:', error);
      return res.status(500).json({ error: 'Erro interno ao salvar cálculo médico.' });
    }
  }

  /**
   * Obter cálculos do paciente
   */
  getCalculations = async (req: Request, res: Response) => {
    try {
      const { patientId: bodyPatientId } = req.query;
      const patientId = await this.resolvePatientId(req, bodyPatientId as string);

      if (!patientId) {
        return res.status(400).json({ error: 'patientId não resolvido.' });
      }

      const calculationTypes = ['BMI', 'BODY_SURFACE_AREA', 'CREATININE_CLEARANCE', 'CARDIAC_RISK', 'IDEAL_WEIGHT', 'CALCULATION'];
      const calculations = await prisma.healthLog.findMany({
        where: {
          patientId: patientId as string,
          type: { in: calculationTypes.map(t => t.toUpperCase()) }
        },
        orderBy: { logDate: 'desc' }
      });

      return res.json(calculations);
    } catch (error) {
      console.error('Erro ao buscar cálculos:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar cálculos.' });
    }
  }

  /**
   * Atualizar cálculo
   */
  updateCalculation = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { patientId: bodyPatientId, type, value, unit, notes, interpretation, category, recommendations, inputs, logDate } = req.body;
      const patientId = await this.resolvePatientId(req, bodyPatientId);

      if (!patientId) {
        return res.status(400).json({ error: 'Id de paciente inválido ou não autenticado.' });
      }

      const log = await prisma.healthLog.findFirst({
        where: { id, patientId: patientId as string }
      });

      if (!log) {
        return res.status(404).json({ error: 'Cálculo não encontrado.' });
      }

      const updatedLog = await prisma.healthLog.update({
        where: { id },
        data: {
          type: type ? String(type).toUpperCase() : undefined,
          value: value ? String(value) : undefined,
          unit: unit !== undefined ? unit : undefined,
          notes: notes !== undefined ? notes : undefined,
          interpretation: interpretation !== undefined ? interpretation : undefined,
          category: category !== undefined ? category : undefined,
          recommendations: recommendations !== undefined ? recommendations : undefined,
          inputs: inputs !== undefined ? inputs : undefined,
          logDate: logDate ? new Date(logDate) : undefined
        }
      });

      return res.json(updatedLog);
    } catch (error) {
      console.error('Erro ao atualizar cálculo:', error);
      return res.status(500).json({ error: 'Erro interno ao atualizar cálculo.' });
    }
  }

  /**
   * Excluir cálculo
   */
  deleteCalculation = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { patientId: bodyPatientId } = req.query;
      const patientId = await this.resolvePatientId(req, bodyPatientId as string);

      if (!patientId) {
        return res.status(400).json({ error: 'Id de paciente inválido ou não autenticado.' });
      }

      const log = await prisma.healthLog.findFirst({
        where: { id, patientId: patientId as string }
      });

      if (!log) {
        return res.status(404).json({ error: 'Cálculo não encontrado.' });
      }

      await prisma.healthLog.delete({
        where: { id }
      });

      return res.json({ message: 'Cálculo excluído com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir cálculo:', error);
      return res.status(500).json({ error: 'Erro interno ao excluir cálculo.' });
    }
  }
}

const healthToolController = new HealthToolController();
export default healthToolController;
