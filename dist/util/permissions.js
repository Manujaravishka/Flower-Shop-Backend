"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = exports.ROLE_PERMISSIONS = exports.PERMISSIONS = void 0;
exports.PERMISSIONS = {
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
};
exports.ROLE_PERMISSIONS = {
    customer: [
        exports.PERMISSIONS.ORDER_CREATE,
    ],
    admin: [
        exports.PERMISSIONS.GIFT_CREATE,
        exports.PERMISSIONS.GIFT_UPDATE,
        exports.PERMISSIONS.GIFT_DELETE,
        exports.PERMISSIONS.ORDER_READ_ALL,
        exports.PERMISSIONS.ORDER_UPDATE_STATUS,
        exports.PERMISSIONS.PAYMENT_UPDATE_STATUS,
        exports.PERMISSIONS.PAYMENT_DELETE,
        exports.PERMISSIONS.CUSTOMER_READ_ALL,
        exports.PERMISSIONS.CUSTOMER_UPDATE,
        exports.PERMISSIONS.CUSTOMER_DELETE,
        exports.PERMISSIONS.DASHBOARD_VIEW,
        exports.PERMISSIONS.LIBRARY_WRITE,
        exports.PERMISSIONS.AI_GENERATE,
    ],
    superadmin: [
        exports.PERMISSIONS.GIFT_CREATE,
        exports.PERMISSIONS.GIFT_UPDATE,
        exports.PERMISSIONS.GIFT_DELETE,
        exports.PERMISSIONS.ORDER_CREATE,
        exports.PERMISSIONS.ORDER_READ_ALL,
        exports.PERMISSIONS.ORDER_UPDATE_STATUS,
        exports.PERMISSIONS.PAYMENT_CREATE,
        exports.PERMISSIONS.PAYMENT_UPDATE_STATUS,
        exports.PERMISSIONS.PAYMENT_DELETE,
        exports.PERMISSIONS.CUSTOMER_READ_ALL,
        exports.PERMISSIONS.CUSTOMER_UPDATE,
        exports.PERMISSIONS.CUSTOMER_DELETE,
        exports.PERMISSIONS.DASHBOARD_VIEW,
        exports.PERMISSIONS.LIBRARY_WRITE,
        exports.PERMISSIONS.AI_GENERATE,
        exports.PERMISSIONS.USER_REGISTER_ADMIN,
    ],
};
const hasPermission = (role, permission) => {
    const perms = exports.ROLE_PERMISSIONS[role];
    if (!perms)
        return false;
    return perms.includes(permission);
};
exports.hasPermission = hasPermission;
