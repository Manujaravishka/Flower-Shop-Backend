import { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";

export interface AppError extends Error {
    statusCode?: number;
    status?: number;
    code?: number;
    keyValue?: Record<string, unknown>;
}

const IMAGE_TYPE_ERROR = "Only image files (jpeg, jpg, png, webp, gif) are allowed";

const isAppError = (err: unknown): err is AppError =>
    typeof err === "object" && err !== null && "message" in err;

export const forbidden = (res: Response, message: string = "Forbidden") =>
    res.status(403).json({ success: false, message });

export const unauthorized = (res: Response, message: string = "Unauthorized") =>
    res.status(401).json({ success: false, message });

export const notFound = (res: Response, message: string) =>
    res.status(404).json({ success: false, message });

export const badRequest = (res: Response, message: string) =>
    res.status(400).json({ success: false, message });

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};

export const errorHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (err instanceof MulterError) {
        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`,
        });
    }

    if (!isAppError(err)) {
        console.error("Unhandled non-Error rejection:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }

    const statusCode = err.statusCode || err.status || 500;

    if (statusCode === 500) {
        console.error("Unhandled error:", err);
    }

    if (err.code === 11000) {
        const duplicateField = Object.keys(err.keyValue || {})[0] || "field";
        return res.status(409).json({
            success: false,
            message: `Duplicate ${duplicateField} detected`,
        });
    }

    if (err.message === IMAGE_TYPE_ERROR) {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    if (err.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    if (err.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: "Invalid identifier",
        });
    }

    return res.status(statusCode).json({
        success: false,
        message: err.message || "Internal server error",
    });
};
