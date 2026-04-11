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
        // Por enquanto, simulamos salvando o conteúdo estruturado
        const content = JSON.stringify(params.items);
        return await prisma_js_1.default.prescription.create({
            data: {
                appointmentId: params.appointmentId,
                patientId: params.patientId,
                partnerId: params.partnerId,
                content,
                isDigital: true,
                status: 'PENDING_SIGNATURE'
            }
        });
    }
    /**
     * Assina digitalmente a receita (MOCK ICP-Brasil simulado)
     */
    async signPrescription(prescriptionId, doctorCrm) {
        const p = await prisma_js_1.default.prescription.findUnique({ where: { id: prescriptionId } });
        if (!p)
            throw new Error('Receita não encontrada');
        // Simulação de Hash da assinatura digital
        const signature = crypto_1.default.createHmac('sha256', 'icp-brasil-secret-simulated')
            .update(`${prescriptionId}-${doctorCrm}-${p.content || ''}-${new Date().toISOString()}`)
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
                        person: { select: { name: true, avatar: true } },
                        user: { select: { name: true, avatar: true } }
                    }
                },
                appointment: {
                    select: {
                        id: true,
                        dateTime: true
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