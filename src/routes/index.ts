import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';

// --- Route imports ---
import authRoutes from './auth.routes';
import patientRoutes from './patient.routes';
import partnerLegacyRoutes from './partner.legacy.routes.js';
import adminLegacyRoutes from './admin.legacy.routes.js';
import gamificationRoutes from './gamification.routes';
import loyaltyRoutes from './loyalty.routes';
import notificationsRoutes from './notifications.routes';
import churnPreventionRoutes from './churn-prevention';
import npsRoutes from './nps-feedback';
import recommendationsRoutes from './recommendations';
import quotesRoutes from './quotes.routes';
import analyticsRoutes from './analytics.routes';
import financialRoutes from './financial.routes';
import transfersRoutes from './transfers.routes';
import plansRoutes from './plans.routes';
import pricesRoutes from './prices.routes';
import supportRoutes from './support.routes';
import knowledgeRoutes from './knowledge.routes';
import faqRoutes from './faq.routes';
import auditRoutes from './audit.routes';
import permissionRoutes from './permission.routes';
import reportsRoutes from './reports.routes';
import medicalRoutes from './medical.routes';
import telemedicineRoutes from './telemedicine.routes';
import categoriesRoutes from './categories.routes';
import ocrRoutes from './ocr.routes';
import quotePaymentsRoutes from './quote-payments.routes';
import healthToolRoutes from './healthTool.routes';
import pharmacyRoutes from './pharmacy.routes'; // NOVO: Farmácia Pro 2.0
import subscriptionRoutes from './subscription.routes'; // NOVO: Motor de Recorrência
import familyRoutes from './family.routes'; // NOVO: Gestão Familiar (Onda 2)
import timelineRoutes from './timeline.routes'; // NOVO: Timeline de Saúde (Onda 3)
import growthRoutes from './growth.routes';
import partnerProfileRoutes from './partner/profile.routes';
import partnerFinanceRoutes from './partner/finance.routes';
import partnerManagementRoutes from './partner/management.routes';
import partnerAppointmentRoutes from './partner/appointments.routes';
import partnerServiceRoutes from './partner/services.routes';
import partnerTeamRoutes from './partner/team.routes';
import partnerAIRoutes from './partner/ai.routes';
import partnerReviewRoutes from './partner/reviews.routes';
import partnerAnalyticsRoutes from './partner/analytics.routes';
import partnerPublicRoutes from './partner/public.routes';
import partnerAvailabilityRoutes from './partner/availability.routes';
import webhookRoutes from './webhook.routes';
import patientGamificationRoutes from './patient-gamification.routes';
import lumaRoutes from './luma.routes';
import coachRoutes from './coach.routes';

import adminRoutes from './admin';

const router = Router();
console.log('[API] Registrando rotas de Timeline (Prioridade Máxima)...');

// 1. API Core Routes
router.use('/timeline', timelineRoutes);
router.use('/patients/timeline', timelineRoutes);
router.use('/auth', authRoutes);
router.use('/growth', growthRoutes);
router.use('/patients', patientRoutes);
router.use('/patients/family', familyRoutes); // Família (alias alinhado ao módulo paciente)
router.use('/patients', patientGamificationRoutes); // Gamificação: Streak, Missões, Economia

// Modular Partner Routes (Fase 6)
router.use('/partners', partnerProfileRoutes);
router.use('/partners', partnerFinanceRoutes); // Transações e Dados Bancários
router.use('/partners', partnerManagementRoutes);
router.use('/partners', partnerAppointmentRoutes);
router.use('/partners', partnerServiceRoutes);
router.use('/partners', partnerTeamRoutes);
router.use('/partners', partnerAIRoutes);
router.use('/partners', partnerReviewRoutes);
router.use('/partners', partnerAnalyticsRoutes);
router.use('/partners', partnerAvailabilityRoutes);
router.use('/partners', partnerPublicRoutes); 
router.use('/partners', partnerLegacyRoutes); // Fallback legado

// 2. Admin & Management (Centralizado)
router.use('/admin/plans', plansRoutes);
router.use('/admin/prices', pricesRoutes);
router.use('/admin/financial', financialRoutes); // Conectando rotas financeiras avançadas
router.use('/admin/transfers', transfersRoutes); // Conectando rotas de repasse
router.use('/admin/service-categories', categoriesRoutes);
router.use('/admin', adminRoutes);
router.use('/admin', adminLegacyRoutes); // Fallback legado para o que restou

// 3. Features & Modules
router.use('/gamification', gamificationRoutes);
router.use('/loyalty', loyaltyRoutes);
router.use('/coach', coachRoutes);
router.use('/patients/coach', coachRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/churn-prevention', churnPreventionRoutes);
router.use('/nps', npsRoutes);
router.use('/recommendations', recommendationsRoutes);
router.use('/quotes', quotesRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/support', supportRoutes);
router.use('/kb', knowledgeRoutes);
router.use('/faq', faqRoutes);
router.use('/audit', auditRoutes);
router.use('/permissions', permissionRoutes);
router.use('/reports', reportsRoutes);
router.use('/medical', medicalRoutes);
router.use('/telemedicine', telemedicineRoutes);
router.use('/ocr', ocrRoutes);
router.use('/quote-payments', quotePaymentsRoutes);
router.use('/health-tools', healthToolRoutes);
router.use('/pharmacy', pharmacyRoutes); // Farmácia Pro 2.0
router.use('/patients/pharmacy', pharmacyRoutes); // Alias: frontend usa /patients/pharmacy/quotations
router.use('/subscriptions', subscriptionRoutes); // NOVO: Motor de Recorrência
router.use('/family', familyRoutes); // NOVO: Gestão Familiar (Onda 2)
router.use('/webhooks', webhookRoutes);
router.use('/luma', lumaRoutes);
// router.use('/timeline', timelineRoutes); // Movido para o topo
router.post('/errors', (req, res) => {
    console.error('[FRONTEND ERROR]', req.body);
    res.status(200).json({ success: true });
});
// router.use('/chat', chatRoutes);

export default router;
