"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const token_1 = require("../util/token");
const user_Modal_1 = __importDefault(require("../model/user.Modal"));
const customer_modal_1 = __importDefault(require("../model/customer.modal"));
const fetchPrincipal = async (sub, type) => {
    if (type === "user") {
        const user = await user_Modal_1.default.findById(sub);
        if (user && user.isActive) {
            return {
                sub: user._id.toString(),
                email: user.email,
                role: user.role || "admin",
                type: "user",
            };
        }
    }
    else {
        const customer = await customer_modal_1.default.findById(sub);
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
const authenticate = async (req, res, next) => {
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
        let payload;
        try {
            payload = (0, token_1.verifyUserAccessToken)(token);
        }
        catch (err) {
            try {
                payload = (0, token_1.verifyCustomerAccessToken)(token);
            }
            catch {
                if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
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
        req.user = principal;
        return next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                message: "Access token expired",
            });
        }
        if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
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
exports.authenticate = authenticate;
