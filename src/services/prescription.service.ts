import prisma from '../lib/prisma.js';
import crypto from 'crypto';

export class PrescriptionService {
    /**
     * Cria uma receita digital associada a um atendimento
     */
    async createPrescription(params: {
        appointmentId: string
        patientId: string
        partnerId: string
        items: any[]
    }) {
        // Em produção, aqui geraríamos o PDF e aplicaríamos assinatura digital ICP-Brasil
        // Por enquanto, simulamos salvando o conteúdo estruturado
        const content = JSON.stringify(params.items);
        
        return await prisma.prescription.create({
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
    async signPrescription(prescriptionId: string, doctorCrm: string) {
        const p = await prisma.prescription.findUnique({ where: { id: prescriptionId } });
        if (!p)
            throw new Error('Receita não encontrada');

        // Simulação de Hash da assinatura digital
        const signature = crypto.createHmac('sha256', 'icp-brasil-secret-simulated')
            .update(`${prescriptionId}-${doctorCrm}-${p.content || ''}-${new Date().toISOString()}`)
            .digest('hex');

        return await prisma.prescription.update({
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
    async getPrescriptionsByPartner(partnerId: string) {
        return await prisma.prescription.findMany({
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

export const prescriptionService = new PrescriptionService();
