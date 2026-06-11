"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = exports.badRequest = exports.notFound = exports.unauthorized = exports.forbidden = void 0;
const multer_1 = require("multer");
const IMAGE_TYPE_ERROR = "Only image files (jpeg, jpg, png, webp, gif) are allowed";
const isAppError = (err) => typeof err === "object" && err !== null && "message" in err;
const forbidden = (res, message = "Forbidden") => res.status(403).json({ success: false, message });
exports.forbidden = forbidden;
const unauthorized = (res, message = "Unauthorized") => res.status(401).json({ success: false, message });
exports.unauthorized = unauthorized;
const notFound = (res, message) => res.status(404).json({ success: false, message });
exports.notFound = notFound;
const badRequest = (res, message) => res.status(400).json({ success: false, message });
exports.badRequest = badRequest;
const notFoundHandler = (req, res, _next) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof multer_1.MulterError) {
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
exports.errorHandler = errorHandler;
