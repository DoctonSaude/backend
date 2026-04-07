import prisma from '../lib/prisma.js';
import { SocketService } from '../lib/socket.js';

export interface CreateInAppNotification {
    userId?: string | null;
    type: string;
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    link?: string;
    data?: any;
}

export const createNotification = async (data: CreateInAppNotification) => {
    try {
        const created = await prisma.notification.create({
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

        // Enviar via Socket para tempo real
        if (created.userId) {
            SocketService.sendToUser(created.userId, 'new_notification', created);
        } else {
            // Notificações de sistema/admin (userId null) vão para todos os admins
            SocketService.sendToAdmins('new_notification', created);
        }

        return created;
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
        throw error;
    }
};

export const getNotificationsByUser = async (userId: string, includeSystem = false) => {
    try {
        const whereCondition: any = { userId };

        if (includeSystem) {
            // Fetch notifications for usage OR system-wide (null user)
            // Using OR syntax for Prisma
            delete whereCondition.userId;
            whereCondition['OR'] = [
                { userId },
                { userId: null }
            ];
        }

        const data = await prisma.notification.findMany({
            where: whereCondition,
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return data;
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        throw error;
    }
};

export const markAsRead = async (id: string, userId: string) => {
    try {
        const data = await prisma.notification.update({
            where: { id },
            data: { read: true }
        });
        return data;
    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        throw error;
    }
};

export const markAllAsRead = async (userId: string) => {
    try {
        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
        return true;
    } catch (error) {
        console.error('Erro ao marcar todas as notificações como lidas:', error);
        throw error;
    }
};

export const deleteNotification = async (id: string, userId: string) => {
    try {
        await prisma.notification.delete({
            where: { id }
        });
        return true;
    } catch (error) {
        console.error('Erro ao deletar notificação:', error);
        throw error;
    }
};

export const deleteAllForUser = async (userId: string) => {
    try {
        await prisma.notification.deleteMany({
            where: { userId }
        });
        return true;
    } catch (error) {
        console.error('Erro ao deletar todas as notificações:', error);
        throw error;
    }
};

export default {
    createNotification,
    getNotificationsByUser,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllForUser
};
