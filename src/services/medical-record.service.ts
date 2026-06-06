import prisma from '../lib/prisma.js';
import crypto from 'crypto';
import { blockchainAuditService } from './blockchain-audit.service.js';

export class MedicalRecordService {
    /**
     * Cria um prontuário estruturado baseado em template
     */
    async createMedicalRecord(params: {
        appointmentId: string,
        patientId: string,
        partnerId: string,
        diagnosis?: string,
        symptoms?: string,
        treatment?: string,
        observations?: string,
        structuredData?
    }) {
        return await prisma.$transaction(async (tx) => {
            // 1. Criar o registro básico
            // @ts-ignore - Prisma schema mismatch
            const record = await tx.medicalRecord.create({
                data: {
                    appointmentId: params.appointmentId,
                    patientId: params.patientId,
                    partnerId: params.partnerId,
                    diagnosis: params.diagnosis,
                    symptoms: params.symptoms,
                    treatment: params.treatment,
                    observations: params.observations,
                    attachments: params.structuredData ? JSON.stringify(params.structuredData) : null
                }
            });

            // 2. Assinatura Digital & Hashing Real (Blockchain Hardening)
            const recordContent = JSON.stringify({
                id: record.id,
                appointmentId: record.appointmentId,
                patientId: record.patientId,
                partnerId: record.partnerId,
                diagnosis: record.diagnosis,
                treatment: record.treatment,
                timestamp: record.createdAt
            });

            const realHash = crypto.createHash('sha256')
                .update(recordContent)
                .digest('hex');

            await tx.medicalRecord.update({
                where: { id: record.id },
                data: {
                    isSealed: true, // "Fecha" o prontuário para edição
                    txHash: realHash // "Impressão Digital" real
                }
            });

            // 3. Registro no Auditor Blockchain (Fase 3)
            await (blockchainAuditService as any).logEvent({
                type: 'MEDICAL_RECORD_SEALING',
                targetId: record.id,
                hash: realHash,
                metadata: {
                    appointmentId: record.appointmentId,
                    partnerId: record.partnerId
                }
            });

            console.log(`[Blockchain Hardening] Registro imutável gerado: ${realHash}`);
            return record;
        });
    }

    /**
     * Busca o histórico completo do paciente (Lock-in Emocional/Dados)
     */
    async getPatientHistory(patientId: string, accessor?: { id: string, role: string }) {
        const records = await prisma.medicalRecord.findMany({
            where: { patientId },
            include: {
                partner: { include: { person: true } },
                appointment: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Log access for each record if accessor is provided
        if (accessor) {
            for (const record of records) {
                await this.logAccess({
                    medicalRecordId: record.id,
                    accessorId: accessor.id,
                    accessorRole: accessor.role,
                    action: 'VIEW'
                });
            }
        }

        return records;
    }

    /**
     * Sistema de Auditoria Médica (Conformidade CFM/LGPD)
     */
    async logAccess(params: {
        medicalRecordId: string,
        accessorId: string,
        accessorRole: string,
        action: string,
        metadata?
    }) {
        try {
            await prisma.medicalRecordAuditLog.create({
                data: {
                    medicalRecordId: params.medicalRecordId,
                    accessorId: params.accessorId,
                    accessorRole: params.accessorRole,
                    action: params.action,
                    metadata: params.metadata ? JSON.stringify(params.metadata) : null
                }
            });
        }
        catch (error) {
            console.error('Erro ao logar acesso ao prontuário Médicos:', error);
        }
    }
}

export const medicalRecordService = new MedicalRecordService();
