import prisma from '../lib/prisma.js';

export class PrescriptionService {
    /**
     * Cria uma receita digital associada a um parceiro e paciente
     */
    async createPrescription(params: {
        patientId: string
        partnerId: string
        items: any[]
    }) {
        // Adaptado ao schema atual: usando 'instructions' ou 'medications' JSON
        return await prisma.prescription.create({
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
    async signPrescription(prescriptionId: string, doctorCrm: string) {
        // Stub: O modelo Prescription atual não possui campo 'signature' ou 'signedAt'
        return await prisma.prescription.update({
            where: { id: prescriptionId },
            data: {
                status: 'Concluído'
            }
        });
    }

    /**
     * Busca prescrições emitidas por um parceiro
     */
    async getPrescriptionsByPartner(partnerId: string) {
        return await prisma.prescription.findMany({
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

export const prescriptionService = new PrescriptionService();
