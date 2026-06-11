import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRegex = /^(?:0|94|\+94)?(?:7[01245678]\d{7}|[1-9]\d{8,9})$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const fail = (res: Response, status: number, message: string) =>
    res.status(status).json({ success: false, message });

export const validateName = (req: Request, res: Response, next: NextFunction) => {
    const { name } = req.body as { name?: string };

    if (name !== undefined) {
        if (typeof name !== "string" || name.trim() === "") {
            return fail(res, 400, "Name cannot be empty");
        }
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            return fail(res, 400, "Name must be at least 2 characters");
        }
        if (trimmed.length > 100) {
            return fail(res, 400, "Name cannot exceed 100 characters");
        }
        req.body.name = trimmed;
    }
    return next();
};

export const validateEmail = (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body as { email?: string };

    if (email === undefined) {
        return next();
    }

    if (typeof email !== "string" || email.trim() === "") {
        return fail(res, 400, "Email cannot be empty");
    }

    const normalized = email.trim().toLowerCase();
    if (!emailRegex.test(normalized)) {
        return fail(res, 400, "Invalid email format");
    }

    req.body.email = normalized;
    return next();
};

export const validatePhoneLK = (req: Request, res: Response, next: NextFunction) => {
    const { phone } = req.body as { phone?: string };

    if (phone === undefined || phone === null || phone === "") {
        return next();
    }

    if (typeof phone !== "string" || !phoneRegex.test(phone.trim())) {
        return fail(res, 400, "Invalid phone format");
    }

    req.body.phone = phone.trim();
    return next();
};

const strongPasswordCheck = (value: unknown, fieldLabel: string): string | null => {
    if (typeof value !== "string" || value.trim() === "") {
        return `${fieldLabel} is required`;
    }
    if (!strongPasswordRegex.test(value)) {
        return `${fieldLabel} must contain: minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 symbol`;
    }
    return null;
};

export const validateStrongPassword = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { password } = req.body as { password?: string };

    const error = strongPasswordCheck(password, "Password");
    if (error) {
        return fail(res, 400, error);
    }

    return next();
};

export const validateNewPassword = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { newPassword, confirmPassword, password } = req.body as {
        newPassword?: string;
        confirmPassword?: string;
        password?: string;
    };

    const error = strongPasswordCheck(newPassword, "New password");
    if (error) {
        return fail(res, 400, error);
    }

    if (typeof confirmPassword !== "string" || confirmPassword.trim() === "") {
        return fail(res, 400, "Confirm password is required");
    }

    if (newPassword !== confirmPassword) {
        return fail(res, 400, "New password and confirm password do not match");
    }

    if (password !== undefined && password === newPassword) {
        return fail(res, 400, "New password must be different from current password");
    }

    return next();
};

export const validateLoginPayload = (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || typeof email !== "string" || email.trim() === "") {
        return fail(res, 400, "Email is required");
    }

    if (typeof password !== "string" || password.length === 0) {
        return fail(res, 400, "Password is required");
    }

    if (!emailRegex.test(email.trim().toLowerCase())) {
        return fail(res, 400, "Invalid email format");
    }

    req.body.email = email.trim().toLowerCase();
    return next();
};

export const validateObjectIdParam =
    (paramName: string = "id") =>
    (req: Request, res: Response, next: NextFunction) => {
        const value = req.params[paramName];
        if (!value || !mongoose.Types.ObjectId.isValid(value)) {
            return fail(res, 400, `Invalid ${paramName}`);
        }
        return next();
    };

export const validateRequiredFields =
    (fields: string[]) =>
    (req: Request, res: Response, next: NextFunction) => {
        const missing: string[] = [];
        for (const field of fields) {
            const v = (req.body as Record<string, unknown>)[field];
            if (v === undefined || v === null || v === "") {
                missing.push(field);
            }
        }
        if (missing.length > 0) {
            return fail(res, 400, `Missing required fields: ${missing.join(", ")}`);
        }
        return next();
    };

export const validateAddress = (req: Request, res: Response, next: NextFunction) => {
    const { address } = req.body as { address?: string };
    if (address === undefined) return next();
    if (typeof address !== "string") {
        return fail(res, 400, "Address must be a string");
    }
    if (address.length > 500) {
        return fail(res, 400, "Address cannot exceed 500 characters");
    }
    req.body.address = address.trim();
    return next();
};
