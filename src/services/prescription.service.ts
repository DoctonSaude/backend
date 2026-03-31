import prisma from '../lib/prisma.js';
import crypto from 'crypto';

export class PrescriptionService {
    /**
     * Cria uma receita digital associada a um atendimento
     */
    async createPrescription(params: {
        appointmentId: string
        patientId: string
        items: any[]
    }) {
        // Em produção, aqui geraríamos o PDF e aplicaríamos assinatura digital ICP-Brasil
        const content = JSON.stringify(params.items);
        return await (prisma as any).prescription.create({
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
    async signPrescription(prescriptionId: string, doctorCrm: string) {
        const p = await prisma.prescription.findUnique({ where: { id: prescriptionId } });
        if (!p)
            throw new Error('Receita não encontrada');

        const signature = crypto.createHmac('sha256', 'icp-brasil-secret')
            .update(`${prescriptionId}-${doctorCrm}-${(p as any).content || ''}`)
            .digest('hex');

        return await (prisma as any).prescription.update({
            where: { id: prescriptionId },
            data: {
                signature,
                status: 'SIGNED',
                signedAt: new Date()
            }
        });
    }
}

export const prescriptionService = new PrescriptionService();
