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
        id: string;
        userId: string | null;
        createdAt: Date;
        status: string | null;
        timestamp: Date;
        userName: string | null;
        userRole: string | null;
        action: string;
        resource: string;
        resourceId: string | null;
        payload: string | null;
        details: import("@prisma/client/runtime/library.js").JsonValue | null;
        ipAddress: string;
        userAgent: string | null;
        severity: string | null;
        category: string | null;
    }>;
    /**
     * Atalho para registrar logins
     */
    static logAuth(userId: string, action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE', ip: string, status?: 'SUCCESS' | 'FAILURE'): Promise<{
        id: string;
        userId: string | null;
        createdAt: Date;
        status: string | null;
        timestamp: Date;
        userName: string | null;
        userRole: string | null;
        action: string;
        resource: string;
        resourceId: string | null;
        payload: string | null;
        details: import("@prisma/client/runtime/library.js").JsonValue | null;
        ipAddress: string;
        userAgent: string | null;
        severity: string | null;
        category: string | null;
    }>;
}
//# sourceMappingURL=audit.service.d.ts.map