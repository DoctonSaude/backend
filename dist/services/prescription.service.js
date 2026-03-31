"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prescriptionService = exports.PrescriptionService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const crypto_1 = __importDefault(require("crypto"));
class PrescriptionService {
    /**
     * Cria uma receita digital associada a um atendimento
     */
    async createPrescription(params) {
        // Em produção, aqui geraríamos o PDF e aplicaríamos assinatura digital ICP-Brasil
        const content = JSON.stringify(params.items);
        return await prisma_js_1.default.prescription.create({
            data: {
                appointmentId: params.appointmentId,
                patientId: params.patientId,
                content,
                isDigital: true,
                status: 'PENDING_SIGNATURE'
            }
        });
    }
    /**
     * Assina digitalmente a receita (MOCK ICP-Brasil)
     */
    async signPrescription(prescriptionId, doctorCrm) {
        const p = await prisma_js_1.default.prescription.findUnique({ where: { id: prescriptionId } });
        if (!p)
            throw new Error('Receita não encontrada');
        const signature = crypto_1.default.createHmac('sha256', 'icp-brasil-secret')
            .update(`${prescriptionId}-${doctorCrm}-${p.content || ''}`)
            .digest('hex');
        return await prisma_js_1.default.prescription.update({
            where: { id: prescriptionId },
            data: {
                signature,
                status: 'SIGNED',
                signedAt: new Date()
            }
        });
    }
}
exports.PrescriptionService = PrescriptionService;
exports.prescriptionService = new PrescriptionService();
//# sourceMappingURL=prescription.service.js.map