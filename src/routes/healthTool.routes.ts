// @ts-nocheck
import { Router } from 'express';
import { z } from 'zod';
import healthToolController from '../controllers/healthTool.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { SocketService } from '../lib/socket.js';
import prisma from '../lib/prisma.js';
import {
  analyzeAndSaveSymptoms,
  listSymptomAnalyses,
  getSymptomAnalysisById,
  deleteSymptomAnalysis,
} from '../services/symptom-analysis.service.js';

const router = Router();
const patientAuth = [authenticate, authorize('PATIENT')] as const;

const SymptomInputSchema = z.object({
  name: z.string().min(1),
  severity: z.string().min(1),
  duration: z.string().min(1),
  frequency: z.string(),
  category: z.string().optional(),
  description: z.string().optional(),
});

const AnalyzeSymptomsSchema = z.object({
  patientId: z.string().optional(),
  symptoms: z.array(SymptomInputSchema).min(1, 'Informe pelo menos um sintoma'),
});

async function resolvePatientIdFromReq(req: any): Promise<string | null> {
  const userId = req.user?.userId;
  if (!userId) return req.body?.patientId || (req.query?.patientId as string) || null;
  const patient = await prisma.patient.findUnique({ where: { userId }, select: { id: true } });
  return patient?.id ?? null;
}

function emitSymptomUpdate(userId: string, payload?: unknown) {
  SocketService.sendToUser(userId, 'symptomAnalysisUpdate', payload ?? { refresh: true });
}

// --- Análises de sintomas (CRUD Supabase / SymptomAnalysis) ---

router.get('/symptom-analyses', ...patientAuth, async (req, res) => {
  try {
    const patientId = await resolvePatientIdFromReq(req);
    if (!patientId) return res.status(404).json({ error: 'Paciente não encontrado' });

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const analyses = await listSymptomAnalyses(patientId, limit);
    res.json(analyses);
  } catch (error) {
    console.error('[SymptomAnalyses GET]', error);
    res.status(500).json({ error: 'Erro ao listar análises de sintomas' });
  }
});

router.get('/symptom-analyses/:id', ...patientAuth, async (req, res) => {
  try {
    const patientId = await resolvePatientIdFromReq(req);
    if (!patientId) return res.status(404).json({ error: 'Paciente não encontrado' });

    const analysis = await getSymptomAnalysisById(patientId, req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada' });
    res.json(analysis);
  } catch (error) {
    console.error('[SymptomAnalyses GET :id]', error);
    res.status(500).json({ error: 'Erro ao buscar análise' });
  }
});

router.post('/analyze-symptoms', ...patientAuth, async (req, res) => {
  try {
    const parsed = AnalyzeSymptomsSchema.parse(req.body);
    const patientId = await resolvePatientIdFromReq(req);
    if (!patientId) {
      return res.status(400).json({ error: 'Paciente não encontrado ou não vinculado ao usuário.' });
    }

    const analysis = await analyzeAndSaveSymptoms(patientId, parsed.symptoms);
    emitSymptomUpdate(req.user!.userId, analysis);
    res.status(201).json(analysis);
  } catch (error: any) {
    console.error('[analyze-symptoms]', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Dados inválidos' });
    }
    const msg = error?.message || 'Erro ao analisar sintomas';
    const status = msg.includes('processar') ? 422 : 400;
    res.status(status).json({ error: msg });
  }
});

router.delete('/symptom-analyses/:id', ...patientAuth, async (req, res) => {
  try {
    const patientId = await resolvePatientIdFromReq(req);
    if (!patientId) return res.status(404).json({ error: 'Paciente não encontrado' });

    const result = await deleteSymptomAnalysis(patientId, req.params.id);
    emitSymptomUpdate(req.user!.userId, result);
    res.json(result);
  } catch (error: any) {
    console.error('[SymptomAnalyses DELETE]', error);
    const status = error?.message === 'Análise não encontrada' ? 404 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao excluir análise' });
  }
});

// --- Demais ferramentas ---

router.post('/check-interactions', ...patientAuth, healthToolController.checkInteractions);
router.get('/history', ...patientAuth, healthToolController.getHistory);
router.get('/calculations', ...patientAuth, healthToolController.getCalculations);
router.post('/save-calculation', ...patientAuth, healthToolController.saveCalculation);
router.put('/calculations/:id', ...patientAuth, healthToolController.updateCalculation);
router.delete('/calculations/:id', ...patientAuth, healthToolController.deleteCalculation);

export default router;



