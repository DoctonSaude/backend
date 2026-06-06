"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// --- Route imports ---
const auth_routes_1 = __importDefault(require("./auth.routes"));
const patient_routes_1 = __importDefault(require("./patient.routes"));
const partner_legacy_routes_js_1 = __importDefault(require("./partner.legacy.routes.js"));
const admin_legacy_routes_js_1 = __importDefault(require("./admin.legacy.routes.js"));
const gamification_routes_1 = __importDefault(require("./gamification.routes"));
const loyalty_routes_1 = __importDefault(require("./loyalty.routes"));
const notifications_routes_1 = __importDefault(require("./notifications.routes"));
const churn_prevention_1 = __importDefault(require("./churn-prevention"));
const nps_feedback_1 = __importDefault(require("./nps-feedback"));
const recommendations_1 = __importDefault(require("./recommendations"));
const quotes_routes_1 = __importDefault(require("./quotes.routes"));
const analytics_routes_1 = __importDefault(require("./analytics.routes"));
const financial_routes_1 = __importDefault(require("./financial.routes"));
const transfers_routes_1 = __importDefault(require("./transfers.routes"));
const plans_routes_1 = __importDefault(require("./plans.routes"));
const prices_routes_1 = __importDefault(require("./prices.routes"));
const support_routes_1 = __importDefault(require("./support.routes"));
const knowledge_routes_1 = __importDefault(require("./knowledge.routes"));
const faq_routes_1 = __importDefault(require("./faq.routes"));
const audit_routes_1 = __importDefault(require("./audit.routes"));
const permission_routes_1 = __importDefault(require("./permission.routes"));
const reports_routes_1 = __importDefault(require("./reports.routes"));
const medical_routes_1 = __importDefault(require("./medical.routes"));
const telemedicine_routes_1 = __importDefault(require("./telemedicine.routes"));
const categories_routes_1 = __importDefault(require("./categories.routes"));
const ocr_routes_1 = __importDefault(require("./ocr.routes"));
const quote_payments_routes_1 = __importDefault(require("./quote-payments.routes"));
const healthTool_routes_1 = __importDefault(require("./healthTool.routes"));
const pharmacy_routes_1 = __importDefault(require("./pharmacy.routes")); // NOVO: Farmácia Pro 2.0
const subscription_routes_1 = __importDefault(require("./subscription.routes")); // NOVO: Motor de Recorrência
const family_routes_1 = __importDefault(require("./family.routes")); // NOVO: Gestão Familiar (Onda 2)
const timeline_routes_1 = __importDefault(require("./timeline.routes")); // NOVO: Timeline de Saúde (Onda 3)
const growth_routes_1 = __importDefault(require("./growth.routes"));
const profile_routes_1 = __importDefault(require("./partner/profile.routes"));
const finance_routes_1 = __importDefault(require("./partner/finance.routes"));
const management_routes_1 = __importDefault(require("./partner/management.routes"));
const appointments_routes_1 = __importDefault(require("./partner/appointments.routes"));
const services_routes_1 = __importDefault(require("./partner/services.routes"));
const team_routes_1 = __importDefault(require("./partner/team.routes"));
const ai_routes_1 = __importDefault(require("./partner/ai.routes"));
const reviews_routes_1 = __importDefault(require("./partner/reviews.routes"));
const analytics_routes_2 = __importDefault(require("./partner/analytics.routes"));
const public_routes_1 = __importDefault(require("./partner/public.routes"));
const availability_routes_1 = __importDefault(require("./partner/availability.routes"));
const webhook_routes_1 = __importDefault(require("./webhook.routes"));
const admin_1 = __importDefault(require("./admin"));
const router = (0, express_1.Router)();
console.log('[API] Registrando rotas de Timeline (Prioridade Máxima)...');
// 1. API Core Routes
router.use('/timeline', timeline_routes_1.default);
router.use('/patients/timeline', timeline_routes_1.default);
router.use('/auth', auth_routes_1.default);
router.use('/growth', growth_routes_1.default);
router.use('/patients', patient_routes_1.default);
// Modular Partner Routes (Fase 6)
router.use('/partners', profile_routes_1.default);
router.use('/partners', finance_routes_1.default); // Transações e Dados Bancários
router.use('/partners', management_routes_1.default);
router.use('/partners', appointments_routes_1.default);
router.use('/partners', services_routes_1.default);
router.use('/partners', team_routes_1.default);
router.use('/partners', ai_routes_1.default);
router.use('/partners', reviews_routes_1.default);
router.use('/partners', analytics_routes_2.default);
router.use('/partners', availability_routes_1.default);
router.use('/partners', public_routes_1.default);
router.use('/partners', partner_legacy_routes_js_1.default); // Fallback legado
// 2. Admin & Management (Centralizado)
router.use('/admin', admin_1.default);
router.use('/admin/plans', plans_routes_1.default);
router.use('/admin/prices', prices_routes_1.default);
router.use('/admin/financial', financial_routes_1.default); // Conectando rotas financeiras avançadas
router.use('/admin/transfers', transfers_routes_1.default); // Conectando rotas de repasse
router.use('/admin/service-categories', categories_routes_1.default);
router.use('/admin/support/tickets', support_routes_1.default);
router.use('/admin/support/knowledge-base', knowledge_routes_1.default);
router.use('/admin', admin_legacy_routes_js_1.default); // Fallback legado para o que restou
// 3. Features & Modules
router.use('/gamification', gamification_routes_1.default);
router.use('/loyalty', loyalty_routes_1.default);
router.use('/notifications', notifications_routes_1.default);
router.use('/churn-prevention', churn_prevention_1.default);
router.use('/nps', nps_feedback_1.default);
router.use('/recommendations', recommendations_1.default);
router.use('/quotes', quotes_routes_1.default);
router.use('/analytics', analytics_routes_1.default);
router.use('/support', support_routes_1.default);
router.use('/kb', knowledge_routes_1.default);
router.use('/faq', faq_routes_1.default);
router.use('/audit', audit_routes_1.default);
router.use('/permissions', permission_routes_1.default);
router.use('/reports', reports_routes_1.default);
router.use('/medical', medical_routes_1.default);
router.use('/telemedicine', telemedicine_routes_1.default);
router.use('/ocr', ocr_routes_1.default);
router.use('/quote-payments', quote_payments_routes_1.default);
router.use('/health-tools', healthTool_routes_1.default);
router.use('/pharmacy', pharmacy_routes_1.default); // NOVO: Farmácia Pro 2.0
router.use('/subscriptions', subscription_routes_1.default); // NOVO: Motor de Recorrência
router.use('/family', family_routes_1.default); // NOVO: Gestão Familiar (Onda 2)
router.use('/webhooks', webhook_routes_1.default);
// router.use('/timeline', timelineRoutes); // Movido para o topo
router.post('/errors', (req, res) => {
    console.error('[FRONTEND ERROR]', req.body);
    res.status(200).json({ success: true });
});
// router.use('/chat', chatRoutes);
exports.default = router;
//# sourceMappingURL=index.js.map