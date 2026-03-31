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
export declare class AuditService {
    static log(params: AuditLogParams): Promise<{
        status: string | null;
        timestamp: Date;
        id: string;
        createdAt: Date;
        userId: string | null;
        userName: string | null;
        userRole: string | null;
        action: string;
        resource: string;
        resourceId: string | null;
        payload: string | null;
        details: import("../../lib/generated/prisma/runtime/library.js").JsonValue | null;
        ipAddress: string;
        userAgent: string | null;
        severity: string | null;
        category: string | null;
    }>;
    /**
     * Atalho para registrar logins
     */
    static logAuth(userId: string, action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE', ip: string, status?: 'SUCCESS' | 'FAILURE'): Promise<{
        status: string | null;
        timestamp: Date;
        id: string;
        createdAt: Date;
        userId: string | null;
        userName: string | null;
        userRole: string | null;
        action: string;
        resource: string;
        resourceId: string | null;
        payload: string | null;
        details: import("../../lib/generated/prisma/runtime/library.js").JsonValue | null;
        ipAddress: string;
        userAgent: string | null;
        severity: string | null;
        category: string | null;
    }>;
}
//# sourceMappingURL=audit.service.d.ts.map