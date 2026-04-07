"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// --- Route imports ---
const auth_routes_js_1 = __importDefault(require("./auth.routes.js"));
const patient_routes_js_1 = __importDefault(require("./patient.routes.js"));
const partner_routes_js_1 = __importDefault(require("./partner.routes.js"));
const admin_routes_js_1 = __importDefault(require("./admin.routes.js"));
const gamification_routes_js_1 = __importDefault(require("./gamification.routes.js"));
const loyalty_routes_js_1 = __importDefault(require("./loyalty.routes.js"));
const notifications_routes_js_1 = __importDefault(require("./notifications.routes.js"));
const churn_prevention_js_1 = __importDefault(require("./churn-prevention.js"));
const nps_feedback_js_1 = __importDefault(require("./nps-feedback.js"));
const recommendations_js_1 = __importDefault(require("./recommendations.js"));
const quotes_routes_js_1 = __importDefault(require("./quotes.routes.js"));
const analytics_routes_js_1 = __importDefault(require("./analytics.routes.js"));
const financial_routes_js_1 = __importDefault(require("./financial.routes.js"));
const transfers_routes_js_1 = __importDefault(require("./transfers.routes.js"));
const plans_routes_js_1 = __importDefault(require("./plans.routes.js"));
const prices_routes_js_1 = __importDefault(require("./prices.routes.js"));
const support_routes_js_1 = __importDefault(require("./support.routes.js"));
const knowledge_routes_js_1 = __importDefault(require("./knowledge.routes.js"));
const faq_routes_js_1 = __importDefault(require("./faq.routes.js"));
const audit_routes_js_1 = __importDefault(require("./audit.routes.js"));
const permission_routes_js_1 = __importDefault(require("./permission.routes.js"));
const reports_routes_js_1 = __importDefault(require("./reports.routes.js"));
const medical_routes_js_1 = __importDefault(require("./medical.routes.js"));
const telemedicine_routes_js_1 = __importDefault(require("./telemedicine.routes.js"));
const categories_routes_js_1 = __importDefault(require("./categories.routes.js"));
const ocr_routes_js_1 = __importDefault(require("./ocr.routes.js"));
const quote_payments_routes_js_1 = __importDefault(require("./quote-payments.routes.js"));
const healthTool_routes_js_1 = __importDefault(require("./healthTool.routes.js"));
const pharmacy_routes_js_1 = __importDefault(require("./pharmacy.routes.js")); // NOVO: Farmácia Pro 2.0
const subscription_routes_js_1 = __importDefault(require("./subscription.routes.js")); // NOVO: Motor de Recorrência
const family_routes_js_1 = __importDefault(require("./family.routes.js")); // NOVO: Gestão Familiar (Onda 2)
const timeline_routes_js_1 = __importDefault(require("./timeline.routes.js")); // NOVO: Timeline de Saúde (Onda 3)
// import chatRoutes from './chat.routes.js';
const router = (0, express_1.Router)();
console.log('[API] Registrando rotas de Timeline (Prioridade Máxima)...');
// 1. API Core Routes
router.use('/timeline', timeline_routes_js_1.default); // Prioridade máxima (Fallback + Onda 3)
router.use('/patients/timeline', timeline_routes_js_1.default); // Alias padronizado
router.use('/auth', auth_routes_js_1.default);
router.use('/patients', patient_routes_js_1.default);
router.use('/partners', partner_routes_js_1.default);
// 2. Admin & Management
router.use('/admin/financial', financial_routes_js_1.default);
router.use('/admin/transfers', transfers_routes_js_1.default);
router.use('/admin/plans', plans_routes_js_1.default);
router.use('/admin/prices', prices_routes_js_1.default);
router.use('/admin/service-categories', categories_routes_js_1.default);
router.use('/admin/support/tickets', support_routes_js_1.default);
router.use('/admin/support/knowledge-base', knowledge_routes_js_1.default);
router.use('/admin', admin_routes_js_1.default);
// 3. Features & Modules
router.use('/gamification', gamification_routes_js_1.default);
router.use('/loyalty', loyalty_routes_js_1.default);
router.use('/notifications', notifications_routes_js_1.default);
router.use('/churn-prevention', churn_prevention_js_1.default);
router.use('/nps', nps_feedback_js_1.default);
router.use('/recommendations', recommendations_js_1.default);
router.use('/quotes', quotes_routes_js_1.default);
router.use('/analytics', analytics_routes_js_1.default);
router.use('/support', support_routes_js_1.default);
router.use('/kb', knowledge_routes_js_1.default);
router.use('/faq', faq_routes_js_1.default);
router.use('/audit', audit_routes_js_1.default);
router.use('/permissions', permission_routes_js_1.default);
router.use('/reports', reports_routes_js_1.default);
router.use('/medical', medical_routes_js_1.default);
router.use('/telemedicine', telemedicine_routes_js_1.default);
router.use('/ocr', ocr_routes_js_1.default);
router.use('/quote-payments', quote_payments_routes_js_1.default);
router.use('/health-tools', healthTool_routes_js_1.default);
router.use('/pharmacy', pharmacy_routes_js_1.default); // NOVO: Farmácia Pro 2.0
router.use('/subscriptions', subscription_routes_js_1.default); // NOVO: Motor de Recorrência
router.use('/family', family_routes_js_1.default); // NOVO: Gestão Familiar (Onda 2)
// router.use('/timeline', timelineRoutes); // Movido para o topo
router.post('/errors', (req, res) => {
    console.error('[FRONTEND ERROR]', req.body);
    res.status(200).json({ success: true });
});
// router.use('/chat', chatRoutes);
exports.default = router;
//# sourceMappingURL=index.js.map