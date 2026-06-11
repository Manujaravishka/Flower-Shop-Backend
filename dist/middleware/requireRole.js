"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAnyAuth = exports.requireCustomer = exports.requireSuperAdmin = exports.requireAdmin = exports.requireRole = void 0;
const requireRole = (...allowed) => (req, res, next) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }
    if (!allowed.includes(user.role)) {
        return res.status(403).json({
            success: false,
            message: "Insufficient permissions",
        });
    }
    return next();
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)("admin", "superadmin");
exports.requireSuperAdmin = (0, exports.requireRole)("superadmin");
exports.requireCustomer = (0, exports.requireRole)("customer");
const requireAnyAuth = (_req, _res, next) => {
    const user = _req.user;
    if (!user) {
        return _res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }
    return next();
};
exports.requireAnyAuth = requireAnyAuth;
