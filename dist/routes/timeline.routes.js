"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const patient_service_js_1 = require("../services/patient.service.js");
const logger_js_1 = require("../lib/logger.js");
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const router = (0, express_1.Router)();
/**
 * Valida a permissão do usuário atual (requesterId) sobre o paciente alvo (targetUserId)
 */
async function validateAccess(requesterId, targetUserId) {
    if (requesterId === targetUserId)
        return true;
    try {
        const requester = await prisma_js_1.default.patient.findUnique({
            where: { userId: requesterId },
            select: { familyRole: true, familyGroupId: true }
        });
        if (!requester || requester.familyRole !== 'HEAD' || !requester.familyGroupId) {
            return false;
        }
        const target = await prisma_js_1.default.patient.findUnique({
            where: { userId: targetUserId },
            select: { familyGroupId: true }
        });
        if (!target || target.familyGroupId !== requester.familyGroupId) {
            return false;
        }
        return true;
    }
    catch (error) {
        logger_js_1.logger.error('[Timeline Routes] Erro de validação de família:', error);
        return false;
    }
}
/**
 * GET /api/patient/timeline
 * Retorna a timeline médica consolidada do paciente autenticado ou seu dependente
 */
router.get('/', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const requesterId = req.user.userId;
        const targetUserId = req.query.patientId || requesterId;
        const hasAccess = await validateAccess(requesterId, targetUserId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Acesso negado ao histórico deste paciente' });
        }
        const timeline = await patient_service_js_1.patientService.getMedicalTimeline(targetUserId);
        res.json(timeline);
    }
    catch (error) {
        logger_js_1.logger.error('[Timeline Routes] Erro ao buscar timeline:', error);
        res.status(500).json({ error: 'Erro ao carregar timeline de saúde' });
    }
});
/**
 * POST /api/patient/timeline/refresh
 * Invalida o cache e força a atualização da timeline do paciente
 */
router.post('/refresh', auth_js_1.authenticate, (0, auth_js_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const requesterId = req.user.userId;
        const targetUserId = req.query.patientId || requesterId;
        const hasAccess = await validateAccess(requesterId, targetUserId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Acesso negado ao histórico deste paciente' });
        }
        await patient_service_js_1.patientService.invalidateTimeline(targetUserId);
        const timeline = await patient_service_js_1.patientService.getMedicalTimeline(targetUserId);
        res.json(timeline);
    }
    catch (error) {
        logger_js_1.logger.error('[Timeline Routes] Erro ao atualizar timeline:', error);
        res.status(500).json({ error: 'Erro ao atualizar timeline de saúde' });
    }
});
exports.default = router;
//# sourceMappingURL=timeline.routes.js.map