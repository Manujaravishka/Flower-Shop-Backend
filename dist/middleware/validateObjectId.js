"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateObjectId = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const validateObjectId = (field = "id") => (req, res, next) => {
    const value = req.params[field] || req.body?.[field];
    if (!value || !mongoose_1.default.Types.ObjectId.isValid(value)) {
        return res.status(400).json({
            success: false,
            message: `Invalid ${field}`,
        });
    }
    return next();
};
exports.validateObjectId = validateObjectId;
