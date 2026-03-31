"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const logger_js_1 = require("../lib/logger.js");
class AuditService {
    static async log(params) {
        try {
            const log = await prisma_js_1.default.auditLog.create({
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
        }
        catch (error) {
            logger_js_1.logger.error('❌ Failed to create AuditLog:', error);
            // Não lançamos o erro para não quebrar o fluxo principal da aplicação
            return null;
        }
    }
    /**
     * Atalho para registrar logins
     */
    static async logAuth(userId, action, ip, status = 'SUCCESS') {
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
exports.AuditService = AuditService;
//# sourceMappingURL=audit.service.js.map