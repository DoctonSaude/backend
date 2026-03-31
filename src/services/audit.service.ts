import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export interface AuditLogParams {
    userId?: string;
    userName?: string;
    userRole?: string;
    action: string;
    resource: string;
    resourceId?: string;
    payload?: any;
    ipAddress: string;
    userAgent?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category?: 'AUTH' | 'DATA_CHANGE' | 'ACCESS' | 'SYSTEM';
    status?: 'SUCCESS' | 'FAILURE';
}

export class AuditService {
    static async log(params: AuditLogParams) {
        try {
            const log = await prisma.auditLog.create({
                data: {
                    userId: params.userId,
                    userName: params.userName,
                    userRole: params.userRole,
                    action: params.action,
                    resource: params.resource,
                    resourceId: params.resourceId,
                    payload: params.payload ? JSON.stringify(params.payload) : null,
                    ipAddress: params.ipAddress,
                    userAgent: params.userAgent,
                    severity: params.severity || 'LOW',
                    category: params.category || 'DATA_CHANGE',
                    status: params.status || 'SUCCESS',
                    timestamp: new Date(),
                },
            });
            return log;
        } catch (error) {
            logger.error('❌ Failed to create AuditLog:', error);
            // Não lançamos o erro para não quebrar o fluxo principal da aplicação
            return null;
        }
    }

    /**
     * Atalho para registrar logins
     */
    static async logAuth(userId: string, action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE', ip: string, status: 'SUCCESS' | 'FAILURE' = 'SUCCESS') {
        return this.log({
            userId,
            action,
            resource: 'USER',
            ipAddress: ip,
            category: 'AUTH',
            severity: status === 'FAILURE' ? 'MEDIUM' : 'LOW',
            status,
        });
    }
}
