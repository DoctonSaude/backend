import { Router } from 'express';

// --- Route imports ---
import authRoutes from './auth.routes';
import patientRoutes from './patient.routes';
import partnerRoutes from './partner.routes';
import adminRoutes from './admin.routes';
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
// import chatRoutes from './chat.routes';

const router = Router();
console.log('[API] Registrando rotas de Timeline (Prioridade Máxima)...');

// 1. API Core Routes
router.use('/timeline', timelineRoutes);
router.use('/patients/timeline', timelineRoutes);
router.use('/auth', authRoutes);
router.use('/growth', growthRoutes);
router.use('/patients', patientRoutes);

// Modular Partner Routes (Fase 6)
router.use('/partners', partnerProfileRoutes);
router.use('/partners', partnerFinanceRoutes);
router.use('/partners', partnerManagementRoutes);
router.use('/partners', partnerRoutes); // Fallback legado para as outras 2.500 linhas

// 2. Admin & Management
router.use('/admin/financial', financialRoutes);
router.use('/admin/transfers', transfersRoutes);
router.use('/admin/plans', plansRoutes);
router.use('/admin/prices', pricesRoutes);
router.use('/admin/service-categories', categoriesRoutes);
router.use('/admin/support/tickets', supportRoutes);
router.use('/admin/support/knowledge-base', knowledgeRoutes);
router.use('/admin', adminRoutes);

// 3. Features & Modules
router.use('/gamification', gamificationRoutes);
router.use('/loyalty', loyaltyRoutes);
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
router.use('/pharmacy', pharmacyRoutes); // NOVO: Farmácia Pro 2.0
router.use('/subscriptions', subscriptionRoutes); // NOVO: Motor de Recorrência
router.use('/family', familyRoutes); // NOVO: Gestão Familiar (Onda 2)
router.use('/growth', growthRoutes); // NOVO: Impulso de Crescimento
// router.use('/timeline', timelineRoutes); // Movido para o topo
router.post('/errors', (req, res) => {
    console.error('[FRONTEND ERROR]', req.body);
    res.status(200).json({ success: true });
});
// router.use('/chat', chatRoutes);

export default router;
