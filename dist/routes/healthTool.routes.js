"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthTool_controller_js_1 = __importDefault(require("../controllers/healthTool.controller.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Todas as rotas de ferramentas de saúde exigem autenticação
router.post('/analyze-symptoms', auth_js_1.authenticate, healthTool_controller_js_1.default.analyzeSymptoms);
router.post('/check-interactions', auth_js_1.authenticate, healthTool_controller_js_1.default.checkInteractions);
router.get('/history', auth_js_1.authenticate, healthTool_controller_js_1.default.getHistory);
router.post('/save-calculation', auth_js_1.authenticate, healthTool_controller_js_1.default.saveCalculation);
exports.default = router;
//# sourceMappingURL=healthTool.routes.js.map