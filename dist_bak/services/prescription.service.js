"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prescriptionService = exports.PrescriptionService = void 0;
// @ts-nocheck
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
class PrescriptionService {
    /**
     * Cria uma receita digital associada a um parceiro e paciente
     */
    async createPrescription(params) {
        // Adaptado ao schema atual: usando 'instructions' ou 'medications' JSON
        return await prisma_js_1.default.prescription.create({
            data: {
                patientId: params.patientId,
                partnerId: params.partnerId,
                medications: params.items,
                status: 'Ativo'
            }
        });
    }
    /**
     * Assina digitalmente a receita (Stub: Campos de assinatura ausentes no schema)
     */
    async signPrescription(prescriptionId, doctorCrm) {
        // Stub: O modelo Prescription atual não possui campo 'signature' ou 'signedAt'
        return await prisma_js_1.default.prescription.update({
            where: { id: prescriptionId },
            data: {
                status: 'Concluído'
            }
        });
    }
    /**
     * Busca prescrições emitidas por um parceiro
     */
    async getPrescriptionsByPartner(partnerId) {
        return await prisma_js_1.default.prescription.findMany({
            where: { partnerId },
            include: {
                patient: {
                    select: {
                        id: true,
                        user: { select: { name: true, avatar: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
exports.PrescriptionService = PrescriptionService;
exports.prescriptionService = new PrescriptionService();
//# sourceMappingURL=prescription.service.js.map