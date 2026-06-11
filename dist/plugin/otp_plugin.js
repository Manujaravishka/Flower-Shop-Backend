"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpPlugin = void 0;
const crypto_1 = __importDefault(require("crypto"));
const otpPlugin = (schema) => {
    schema.add({
        verificationCode: {
            type: String,
            select: false,
        },
        verificationCodeExpires: {
            type: Date,
            select: false,
        },
    });
    schema.methods.generateOTP = async function () {
        const code = crypto_1.default.randomInt(100000, 999999).toString();
        this.verificationCode = code;
        this.verificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
        await this.save();
        return code;
    };
    schema.methods.verifyOTP = async function (inputCode) {
        if (!this.verificationCode || this.verificationCode !== inputCode) {
            return false;
        }
        if (!this.verificationCodeExpires || this.verificationCodeExpires < new Date()) {
            return false;
        }
        this.verificationCode = undefined;
        this.verificationCodeExpires = undefined;
        await this.save();
        return true;
    };
};
exports.otpPlugin = otpPlugin;
