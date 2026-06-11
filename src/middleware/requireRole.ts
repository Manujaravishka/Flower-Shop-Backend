import { Request, Response, NextFunction, RequestHandler } from "express";
import { AuthRequest } from "./auth";

export const requireRole =
    (...allowed: string[]): RequestHandler =>
    (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthRequest).user;
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

export const requireAdmin: RequestHandler = requireRole("admin", "superadmin");
export const requireSuperAdmin: RequestHandler = requireRole("superadmin");
export const requireCustomer: RequestHandler = requireRole("customer");
export const requireAnyAuth: RequestHandler = (
    _req: Request,
    _res: Response,
    next: NextFunction
) => {
    const user = (_req as AuthRequest).user;
    if (!user) {
        return _res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }
    return next();
};
