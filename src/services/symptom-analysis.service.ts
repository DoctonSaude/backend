import prisma from '../lib/prisma.js';
import openAIService from '../services/ai/openai.service.js';

export type SymptomInput = {
  name: string;
  severity: string;
  duration: string;
  frequency: string;
  category?: string;
  description?: string;
};

export type SymptomAnalysisResult = {
  urgencyLevel: 'baixa' | 'media' | 'alta' | 'critica';
  possibleConditions: Array<{
    name: string;
    probability: number;
    severity: string;
    description: string;
    recommendations: string[];
  }>;
  recommendations: string[];
  warningFlags: string[];
  nextSteps: string[];
  suggestedSpecialties?: string[];
};

export type SymptomAnalysisDto = {
  id: string;
  patientId: string;
  symptoms: SymptomInput[];
  result: SymptomAnalysisResult;
  createdAt: string;
};

function parseAnalysisResult(raw: unknown): SymptomAnalysisResult {
  const fallback: SymptomAnalysisResult = {
    urgencyLevel: 'media',
    possibleConditions: [],
    recommendations: [],
    warningFlags: [],
    nextSteps: [],
    suggestedSpecialties: [],
  };

  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as SymptomAnalysisResult;
  return {
    urgencyLevel: r.urgencyLevel || 'media',
    possibleConditions: Array.isArray(r.possibleConditions) ? r.possibleConditions : [],
    recommendations: Array.isArray(r.recommendations) ? r.recommendations : [],
    warningFlags: Array.isArray(r.warningFlags) ? r.warningFlags : [],
    nextSteps: Array.isArray(r.nextSteps) ? r.nextSteps : [],
    suggestedSpecialties: Array.isArray(r.suggestedSpecialties) ? r.suggestedSpecialties : [],
  };
}

function mapRow(row: {
  id: string;
  patientId: string;
  symptoms: unknown;
  result: unknown;
  createdAt: Date;
}): SymptomAnalysisDto {
  const symptoms = Array.isArray(row.symptoms) ? (row.symptoms as SymptomInput[]) : [];
  return {
    id: row.id,
    patientId: row.patientId,
    symptoms,
    result: parseAnalysisResult(row.result),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listSymptomAnalyses(patientId: string, limit = 20) {
  const rows = await prisma.symptomAnalysis.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map(mapRow);
}

export async function getSymptomAnalysisById(patientId: string, id: string) {
  const row = await prisma.symptomAnalysis.findFirst({
    where: { id, patientId },
  });
  if (!row) return null;
  return mapRow(row);
}

export async function deleteSymptomAnalysis(patientId: string, id: string) {
  const row = await prisma.symptomAnalysis.findFirst({
    where: { id, patientId },
  });
  if (!row) throw new Error('Análise não encontrada');
  await prisma.symptomAnalysis.delete({ where: { id } });
  return { id, deleted: true };
}

export async function analyzeAndSaveSymptoms(patientId: string, symptoms: SymptomInput[]) {
  if (!symptoms.length) {
    throw new Error('Informe pelo menos um sintoma para análise');
  }

  const symptomList = symptoms
    .map(
      (s) =>
        `- ${s.name} (Gravidade: ${s.severity}, Duração: ${s.duration}, Frequência: ${s.frequency || 'ocasional'})`
    )
    .join('\n');

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

  let aiResponse = await openAIService.chat(
    [
      { role: 'system', content: 'Você é um assistente médico virtual especializado em triagem inicial.' },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.3 }
  );

  if (!aiResponse) {
    aiResponse = JSON.stringify({
      urgencyLevel: 'media',
      possibleConditions: [
        {
          name: 'Avaliação clínica recomendada',
          probability: 75,
          severity: 'media',
          description:
            'Análise gerada com apoio local. Consulte um profissional de saúde para confirmação diagnóstica.',
          recommendations: [
            'Hidrate-se adequadamente',
            'Monitore a evolução dos sintomas',
            'Procure atendimento se houver piora',
          ],
        },
      ],
      recommendations: ['Evite automedicação sem orientação', 'Registre novos sintomas no app'],
      warningFlags: ['Febre persistente acima de 38,5°C', 'Falta de ar intensa'],
      nextSteps: ['Agendar consulta se os sintomas persistirem', 'Buscar pronto-socorro se urgência'],
      suggestedSpecialties: ['Clínica Geral', 'Medicina da Família'],
    });
  }

  let parsed: SymptomAnalysisResult;
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
    parsed = parseAnalysisResult(JSON.parse(jsonStr));
  } catch {
    throw new Error(
      'Não foi possível processar a resposta da análise. Tente descrever seus sintomas com mais detalhes.'
    );
  }

  const created = await prisma.symptomAnalysis.create({
    data: {
      patientId,
      symptoms: symptoms as object,
      result: parsed as object,
    },
  });

  return mapRow(created);
}
