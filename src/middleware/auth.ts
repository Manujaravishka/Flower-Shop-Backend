import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import {
    verifyUserAccessToken,
    verifyCustomerAccessToken,
    ITokenPayload,
    PrincipalType,
    Role,
} from "../util/token";
import User from "../model/user.Modal";
import Customer from "../model/customer.modal";

export interface AuthRequest extends Request {
    user?: AuthenticatedPrincipal;
}

export interface AuthenticatedPrincipal {
    sub: string;
    email: string;
    role: Role;
    type: PrincipalType;
}

const fetchPrincipal = async (
    sub: string,
    type: PrincipalType
): Promise<AuthenticatedPrincipal | null> => {
    if (type === "user") {
        const user = await User.findById(sub);
        if (user && user.isActive) {
            return {
                sub: user._id.toString(),
                email: user.email,
                role: (user.role as Role) || "admin",
                type: "user",
            };
        }
    } else {
        const customer = await Customer.findById(sub);
        if (customer && customer.isActive) {
            return {
                sub: customer._id.toString(),
                email: customer.email,
                role: "customer",
                type: "customer",
            };
        }
    }
    return null;
};

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const header = req.headers.authorization;

        if (!header) {
            return res.status(401).json({
                success: false,
                message: "Authorization token missing",
            });
        }

        const parts = header.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization header format. Use: Bearer <token>",
            });
        }

        const token = parts[1];
        let payload: ITokenPayload;
        try {
            payload = verifyUserAccessToken(token);
        } catch (err) {
            try {
                payload = verifyCustomerAccessToken(token);
            } catch {
                if (err instanceof jwt.TokenExpiredError) {
                    return res.status(401).json({
                        success: false,
                        message: "Access token expired",
                    });
                }
                return res.status(401).json({
                    success: false,
                    message: "Invalid access token",
                });
            }
        }

        const principal = await fetchPrincipal(payload.sub, payload.type);
        if (!principal) {
            return res.status(401).json({
                success: false,
                message: "Account not found or inactive",
            });
        }

        (req as AuthRequest).user = principal;
        return next();
    } catch (err: unknown) {
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                message: "Access token expired",
            });
        }
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: "Invalid access token",
            });
        }
        console.error("Authentication error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error during authentication",
        });
    }
};
