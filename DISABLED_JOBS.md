# Notas sobre Jobs/Workers Desativados

Este documento descreve os jobs e workers que estão desativados no código e as razões.

---

## 1. `FinanceJob.start()`
- **Arquivo**: `backend/src/server.ts:258`
- **Status**: Comentado
- **Observação**: Job de processamento financeiro diário. Pode ser reativado se houver necessidade de processar pagamentos automaticamente.

---

## 2. Cron Jobs (n8n)
- **Arquivo**: `backend/src/server.ts:298-312`
- **Jobs**:
  - `ChurnPreventionJobs.startAllJobs()`
  - `NPSAnalysisJobs.startAllJobs()`
  - `startAutomatedReportsJob()`
  - `startWeeklyJobs()`
  - `startHealthJourneyJob()`
  - `medicationSubscriptionService.processDueSubscriptions()`
- **Status**: Comentados
- **Observação**: "CRON JOBS DELEGADOS PARA O N8N (MOTOR DE ORQUESTRAÇÃO)". Se não houver n8n, esses jobs podem ser reativados configurando `ENABLE_CRON_JOBS=true`.

---

## 3. Redis Workers (Pharmacy Quotes)
- **Arquivo**: `backend/src/server.ts:276-289`
- **Status**: Comentados
- **Observação**: "Temporarily disabled due to Redis version incompatibility". Para reativar:
  1. Certifique-se de que a versão do Redis é compatível
  2. Configure `REDIS_URL` no `.env`
  3. Remova `DISABLE_REDIS_WORKERS=true` se estiver definido
  4. Descomente o código

---

## 4. Jobs Adicionais (Performance, Drug Learning, OCR)
- **Arquivo**: `backend/src/server.ts:336-369`
- **Jobs**:
  - `performanceSnapshotJob.start()`
  - `drugLearningJob.start()`
  - `ocrMaintenanceJob.start()`
- **Status**: Comentados
- **Observação**: Jobs de manutenção e treinamento de ML. Podem ser reativados se houver necessidade.

---

## Como Reativar

1. Para Cron Jobs:
   ```env
   # backend/.env
   ENABLE_CRON_JOBS=true
   ```

2. Para Redis Workers:
   ```env
   # backend/.env
   REDIS_URL=redis://localhost:6379
   # REMOVA ou defina como false: DISABLE_REDIS_WORKERS
   ```

3. Descomente o código relevante no `server.ts`
