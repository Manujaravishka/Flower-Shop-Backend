"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCloudinaryConfigured = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const cloudinary_1 = require("cloudinary");
dotenv_1.default.config();
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const INVALID_VALUE = /^(replace_with_|your_|changeme_|demo)/i;
exports.isCloudinaryConfigured = !!cloudName &&
    !!apiKey &&
    !!apiSecret &&
    !INVALID_VALUE.test(cloudName) &&
    !INVALID_VALUE.test(apiKey) &&
    !INVALID_VALUE.test(apiSecret);
if (exports.isCloudinaryConfigured) {
    cloudinary_1.v2.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });
}
exports.default = cloudinary_1.v2;
