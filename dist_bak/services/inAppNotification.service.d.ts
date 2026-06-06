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
    message: string;
    type: string | null;
    link: string | null;
    title: string;
    priority: string | null;
    id: string;
    personId: string | null;
    createdAt: Date;
    updatedAt: Date;
    userId: string | null;
    read: boolean;
    dataJson: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
}>;
export declare const getNotificationsByUser: (userId: string, includeSystem?: boolean) => Promise<{
    message: string;
    type: string | null;
    link: string | null;
    title: string;
    priority: string | null;
    id: string;
    personId: string | null;
    createdAt: Date;
    updatedAt: Date;
    userId: string | null;
    read: boolean;
    dataJson: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
}[]>;
export declare const markAsRead: (id: string, userId: string) => Promise<{
    message: string;
    type: string | null;
    link: string | null;
    title: string;
    priority: string | null;
    id: string;
    personId: string | null;
    createdAt: Date;
    updatedAt: Date;
    userId: string | null;
    read: boolean;
    dataJson: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
}>;
export declare const markAllAsRead: (userId: string) => Promise<boolean>;
export declare const deleteNotification: (id: string, userId: string) => Promise<boolean>;
export declare const deleteAllForUser: (userId: string) => Promise<boolean>;
declare const _default: {
    createNotification: (data: CreateInAppNotification) => Promise<{
        message: string;
        type: string | null;
        link: string | null;
        title: string;
        priority: string | null;
        id: string;
        personId: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        read: boolean;
        dataJson: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
    }>;
    getNotificationsByUser: (userId: string, includeSystem?: boolean) => Promise<{
        message: string;
        type: string | null;
        link: string | null;
        title: string;
        priority: string | null;
        id: string;
        personId: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        read: boolean;
        dataJson: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
    }[]>;
    markAsRead: (id: string, userId: string) => Promise<{
        message: string;
        type: string | null;
        link: string | null;
        title: string;
        priority: string | null;
        id: string;
        personId: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        read: boolean;
        dataJson: import("lib/generated/prisma/runtime/library.js").JsonValue | null;
    }>;
    markAllAsRead: (userId: string) => Promise<boolean>;
    deleteNotification: (id: string, userId: string) => Promise<boolean>;
    deleteAllForUser: (userId: string) => Promise<boolean>;
};
export default _default;
//# sourceMappingURL=inAppNotification.service.d.ts.map