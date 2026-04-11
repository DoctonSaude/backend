"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const growth_controller_js_1 = __importDefault(require("../controllers/growth.controller.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Estatísticas de crescimento (Apenas para o parceiro autenticado)
router.get('/stats', auth_js_1.authenticate, growth_controller_js_1.default.getStats);
// Ativação de Boost (Apenas parceiros)
router.post('/activate-boost', auth_js_1.authenticate, growth_controller_js_1.default.activateBoost);
// Registro de Clique (Público - chamado quando um paciente clica no perfil)
router.post('/click/:partnerId', growth_controller_js_1.default.recordClick);
exports.default = router;
//# sourceMappingURL=growth.routes.js.map