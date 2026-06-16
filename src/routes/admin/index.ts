import { Router } from 'express';
import dashboardRoutes from './dashboard.routes';
import usersRoutes from './users.routes';
import partnersRoutes from './partners.routes';
import pharmaciesRoutes from './pharmacies.routes';
import quotesRoutes from './quotes.routes';
import workflowRoutes from './workflow.routes';
import analyticsRoutes from './analytics.routes';
import configRoutes from './config.routes';
import reportsRoutes from './reports.routes';
import approvalsRoutes from './approvals.routes';
import challengesRoutes from './challenges.routes';
import financialRoutes from './financial.routes';
import profileRoutes from './profile.routes';
import gamificationRoutes from './gamification.routes';
import supportRoutes from './support.routes';
import securityRoutes from './security.routes';
import auditRoutes from './audit.routes';
import integrationsRoutes from './integrations.routes';
import anomaliesRoutes from './anomalies.routes';
import contentRoutes from './content.routes';
import devRoutes from './dev.routes';
import whatsappRoutes from './whatsapp.routes';
import transfersRoutes from '../transfers.routes';
import lumaRoutes from './luma.routes';
import validationRoutes from './validation.routes';
import chatbotRoutes from './chatbot.routes';
import contactsRoutes from './contacts.routes';
import marketingRoutes from './marketing.routes';

const router = Router();

// ⚠️ IMPORTANTE: profileRoutes DEVE vir antes de transfersRoutes (sem prefixo),
// pois transfersRoutes tem PUT /:id que capturaria PUT /profile como se fosse um id.
router.use(profileRoutes);
router.use(whatsappRoutes);
router.use(lumaRoutes);
router.use(validationRoutes);
router.use(contentRoutes);
router.use(dashboardRoutes);
router.use(usersRoutes);
router.use(partnersRoutes);
router.use(pharmaciesRoutes);
router.use(quotesRoutes);
router.use(workflowRoutes);
router.use(analyticsRoutes);
router.use(configRoutes);
router.use(reportsRoutes);
router.use(approvalsRoutes);
router.use(challengesRoutes);
router.use(financialRoutes);
router.use(gamificationRoutes);
router.use(supportRoutes);
router.use(securityRoutes);
router.use(auditRoutes);
router.use(integrationsRoutes);
router.use(anomaliesRoutes);
router.use('/transfers', transfersRoutes); // Rota prefixada para transfers (repasses)
router.use('/dev', devRoutes);
router.use(chatbotRoutes);
router.use(contactsRoutes);
router.use(marketingRoutes);

export default router;
