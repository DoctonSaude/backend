"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllForUser = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotificationsByUser = exports.createNotification = void 0;
const prisma_js_1 = __importDefault(require("../lib/prisma.js"));
const createNotification = async (data) => {
    try {
        const created = await prisma_js_1.default.notification.create({
            data: {
                userId: data.userId || null,
                type: data.type,
                title: data.title,
                message: data.message,
                priority: data.priority || 'medium',
                link: data.link || null,
                data: data.data || {},
                read: false
            }
        });
        return created;
    }
    catch (error) {
        console.error('Erro ao criar notificação:', error);
        throw error;
    }
};
exports.createNotification = createNotification;
const getNotificationsByUser = async (userId, includeSystem = false) => {
    try {
        const whereCondition = { userId };
        if (includeSystem) {
            // Fetch notifications for usage OR system-wide (null user)
            // Using OR syntax for Prisma
            delete whereCondition.userId;
            whereCondition['OR'] = [
                { userId },
                { userId: null }
            ];
        }
        const data = await prisma_js_1.default.notification.findMany({
            where: whereCondition,
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return data;
    }
    catch (error) {
        console.error('Erro ao buscar notificações:', error);
        throw error;
    }
};
exports.getNotificationsByUser = getNotificationsByUser;
const markAsRead = async (id, userId) => {
    try {
        const data = await prisma_js_1.default.notification.update({
            where: { id },
            data: { read: true }
        });
        return data;
    }
    catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        throw error;
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (userId) => {
    try {
        await prisma_js_1.default.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
        return true;
    }
    catch (error) {
        console.error('Erro ao marcar todas as notificações como lidas:', error);
        throw error;
    }
};
exports.markAllAsRead = markAllAsRead;
const deleteNotification = async (id, userId) => {
    try {
        await prisma_js_1.default.notification.delete({
            where: { id }
        });
        return true;
    }
    catch (error) {
        console.error('Erro ao deletar notificação:', error);
        throw error;
    }
};
exports.deleteNotification = deleteNotification;
const deleteAllForUser = async (userId) => {
    try {
        await prisma_js_1.default.notification.deleteMany({
            where: { userId }
        });
        return true;
    }
    catch (error) {
        console.error('Erro ao deletar todas as notificações:', error);
        throw error;
    }
};
exports.deleteAllForUser = deleteAllForUser;
exports.default = {
    createNotification: exports.createNotification,
    getNotificationsByUser: exports.getNotificationsByUser,
    markAsRead: exports.markAsRead,
    markAllAsRead: exports.markAllAsRead,
    deleteNotification: exports.deleteNotification,
    deleteAllForUser: exports.deleteAllForUser
};
//# sourceMappingURL=inAppNotification.service.js.map