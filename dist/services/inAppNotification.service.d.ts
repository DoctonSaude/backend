export interface CreateInAppNotification {
    userId?: string | null;
    type: string;
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    link?: string;
    data?: any;
}
export declare const createNotification: (data: CreateInAppNotification) => Promise<{
    id: string;
    personId: string | null;
    userId: string | null;
    type: string | null;
    createdAt: Date;
    updatedAt: Date;
    message: string;
    link: string | null;
    data: import("@prisma/client/runtime/library.js").JsonValue | null;
    title: string;
    priority: string | null;
    read: boolean;
}>;
export declare const getNotificationsByUser: (userId: string, includeSystem?: boolean) => Promise<{
    id: string;
    personId: string | null;
    userId: string | null;
    type: string | null;
    createdAt: Date;
    updatedAt: Date;
    message: string;
    link: string | null;
    data: import("@prisma/client/runtime/library.js").JsonValue | null;
    title: string;
    priority: string | null;
    read: boolean;
}[]>;
export declare const markAsRead: (id: string, userId: string) => Promise<{
    id: string;
    personId: string | null;
    userId: string | null;
    type: string | null;
    createdAt: Date;
    updatedAt: Date;
    message: string;
    link: string | null;
    data: import("@prisma/client/runtime/library.js").JsonValue | null;
    title: string;
    priority: string | null;
    read: boolean;
}>;
export declare const markAllAsRead: (userId: string) => Promise<boolean>;
export declare const deleteNotification: (id: string, userId: string) => Promise<boolean>;
export declare const deleteAllForUser: (userId: string) => Promise<boolean>;
declare const _default: {
    createNotification: (data: CreateInAppNotification) => Promise<{
        id: string;
        personId: string | null;
        userId: string | null;
        type: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        link: string | null;
        data: import("@prisma/client/runtime/library.js").JsonValue | null;
        title: string;
        priority: string | null;
        read: boolean;
    }>;
    getNotificationsByUser: (userId: string, includeSystem?: boolean) => Promise<{
        id: string;
        personId: string | null;
        userId: string | null;
        type: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        link: string | null;
        data: import("@prisma/client/runtime/library.js").JsonValue | null;
        title: string;
        priority: string | null;
        read: boolean;
    }[]>;
    markAsRead: (id: string, userId: string) => Promise<{
        id: string;
        personId: string | null;
        userId: string | null;
        type: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        link: string | null;
        data: import("@prisma/client/runtime/library.js").JsonValue | null;
        title: string;
        priority: string | null;
        read: boolean;
    }>;
    markAllAsRead: (userId: string) => Promise<boolean>;
    deleteNotification: (id: string, userId: string) => Promise<boolean>;
    deleteAllForUser: (userId: string) => Promise<boolean>;
};
export default _default;
//# sourceMappingURL=inAppNotification.service.d.ts.map