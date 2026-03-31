import { Router } from 'express';

// --- Route imports ---
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import partnerRoutes from './partner.routes.js';
import adminRoutes from './admin.routes.js';
import gamificationRoutes from './gamification.routes.js';
import loyaltyRoutes from './loyalty.routes.js';
import notificationsRoutes from './notifications.routes.js';
import churnPreventionRoutes from './churn-prevention.js';
import npsRoutes from './nps-feedback.js';
import recommendationsRoutes from './recommendations.js';
import quotesRoutes from './quotes.routes.js';
import analyticsRoutes from './analytics.routes.js';
import financialRoutes from './financial.routes.js';
import transfersRoutes from './transfers.routes.js';
import plansRoutes from './plans.routes.js';
import pricesRoutes from './prices.routes.js';
import supportRoutes from './support.routes.js';
import knowledgeRoutes from './knowledge.routes.js';
import faqRoutes from './faq.routes.js';
import auditRoutes from './audit.routes.js';
import permissionRoutes from './permission.routes.js';
import reportsRoutes from './reports.routes.js';
import medicalRoutes from './medical.routes.js';
import telemedicineRoutes from './telemedicine.routes.js';
import categoriesRoutes from './categories.routes.js';
import ocrRoutes from './ocr.routes.js';
import quotePaymentsRoutes from './quote-payments.routes.js';
import healthToolRoutes from './healthTool.routes.js';
// import chatRoutes from './chat.routes.js';

const router = Router();

// 1. API Core Routes
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/partners', partnerRoutes);

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
router.post('/errors', (req, res) => {
    console.error('[FRONTEND ERROR]', req.body);
    res.status(200).json({ success: true });
});
// router.use('/chat', chatRoutes);

export default router;
