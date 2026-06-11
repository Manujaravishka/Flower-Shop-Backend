"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAddress = exports.validateRequiredFields = exports.validateObjectIdParam = exports.validateLoginPayload = exports.validateNewPassword = exports.validateStrongPassword = exports.validatePhoneLK = exports.validateEmail = exports.validateName = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRegex = /^(?:0|94|\+94)?(?:7[01245678]\d{7}|[1-9]\d{8,9})$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const validateName = (req, res, next) => {
    const { name } = req.body;
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
exports.validateName = validateName;
const validateEmail = (req, res, next) => {
    const { email } = req.body;
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
exports.validateEmail = validateEmail;
const validatePhoneLK = (req, res, next) => {
    const { phone } = req.body;
    if (phone === undefined || phone === null || phone === "") {
        return next();
    }
    if (typeof phone !== "string" || !phoneRegex.test(phone.trim())) {
        return fail(res, 400, "Invalid phone format");
    }
    req.body.phone = phone.trim();
    return next();
};
exports.validatePhoneLK = validatePhoneLK;
const strongPasswordCheck = (value, fieldLabel) => {
    if (typeof value !== "string" || value.trim() === "") {
        return `${fieldLabel} is required`;
    }
    if (!strongPasswordRegex.test(value)) {
        return `${fieldLabel} must contain: minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 symbol`;
    }
    return null;
};
const validateStrongPassword = (req, res, next) => {
    const { password } = req.body;
    const error = strongPasswordCheck(password, "Password");
    if (error) {
        return fail(res, 400, error);
    }
    return next();
};
exports.validateStrongPassword = validateStrongPassword;
const validateNewPassword = (req, res, next) => {
    const { newPassword, confirmPassword, password } = req.body;
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
exports.validateNewPassword = validateNewPassword;
const validateLoginPayload = (req, res, next) => {
    const { email, password } = req.body;
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
exports.validateLoginPayload = validateLoginPayload;
const validateObjectIdParam = (paramName = "id") => (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !mongoose_1.default.Types.ObjectId.isValid(value)) {
        return fail(res, 400, `Invalid ${paramName}`);
    }
    return next();
};
exports.validateObjectIdParam = validateObjectIdParam;
const validateRequiredFields = (fields) => (req, res, next) => {
    const missing = [];
    for (const field of fields) {
        const v = req.body[field];
        if (v === undefined || v === null || v === "") {
            missing.push(field);
        }
    }
    if (missing.length > 0) {
        return fail(res, 400, `Missing required fields: ${missing.join(", ")}`);
    }
    return next();
};
exports.validateRequiredFields = validateRequiredFields;
const validateAddress = (req, res, next) => {
    const { address } = req.body;
    if (address === undefined)
        return next();
    if (typeof address !== "string") {
        return fail(res, 400, "Address must be a string");
    }
    if (address.length > 500) {
        return fail(res, 400, "Address cannot exceed 500 characters");
    }
    req.body.address = address.trim();
    return next();
};
exports.validateAddress = validateAddress;
