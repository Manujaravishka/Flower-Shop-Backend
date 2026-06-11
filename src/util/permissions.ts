export const PERMISSIONS = {
    GIFT_CREATE: "gift:create",
    GIFT_UPDATE: "gift:update",
    GIFT_DELETE: "gift:delete",
    ORDER_CREATE: "order:create",
    ORDER_READ_ALL: "order:read:all",
    ORDER_UPDATE_STATUS: "order:update:status",
    PAYMENT_CREATE: "payment:create",
    PAYMENT_UPDATE_STATUS: "payment:update:status",
    PAYMENT_DELETE: "payment:delete",
    CUSTOMER_READ_ALL: "customer:read:all",
    CUSTOMER_UPDATE: "customer:update",
    CUSTOMER_DELETE: "customer:delete",
    DASHBOARD_VIEW: "dashboard:view",
    LIBRARY_WRITE: "library:write",
    AI_GENERATE: "ai:generate",
    USER_REGISTER_ADMIN: "user:register:admin",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    customer: [
        PERMISSIONS.ORDER_CREATE,
    ],
    admin: [
        PERMISSIONS.GIFT_CREATE,
        PERMISSIONS.GIFT_UPDATE,
        PERMISSIONS.GIFT_DELETE,
        PERMISSIONS.ORDER_READ_ALL,
        PERMISSIONS.ORDER_UPDATE_STATUS,
        PERMISSIONS.PAYMENT_UPDATE_STATUS,
        PERMISSIONS.PAYMENT_DELETE,
        PERMISSIONS.CUSTOMER_READ_ALL,
        PERMISSIONS.CUSTOMER_UPDATE,
        PERMISSIONS.CUSTOMER_DELETE,
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.LIBRARY_WRITE,
        PERMISSIONS.AI_GENERATE,
    ],
    superadmin: [
        PERMISSIONS.GIFT_CREATE,
        PERMISSIONS.GIFT_UPDATE,
        PERMISSIONS.GIFT_DELETE,
        PERMISSIONS.ORDER_CREATE,
        PERMISSIONS.ORDER_READ_ALL,
        PERMISSIONS.ORDER_UPDATE_STATUS,
        PERMISSIONS.PAYMENT_CREATE,
        PERMISSIONS.PAYMENT_UPDATE_STATUS,
        PERMISSIONS.PAYMENT_DELETE,
        PERMISSIONS.CUSTOMER_READ_ALL,
        PERMISSIONS.CUSTOMER_UPDATE,
        PERMISSIONS.CUSTOMER_DELETE,
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.LIBRARY_WRITE,
        PERMISSIONS.AI_GENERATE,
        PERMISSIONS.USER_REGISTER_ADMIN,
    ],
};

export const hasPermission = (role: string, permission: Permission): boolean => {
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return false;
    return perms.includes(permission);
};
