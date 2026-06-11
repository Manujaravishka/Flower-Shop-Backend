"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGiftImage = void 0;
exports.uploadBufferToCloudinary = uploadBufferToCloudinary;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const dotenv_1 = __importDefault(require("dotenv"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const cloudinary_2 = require("../config/cloudinary");
dotenv_1.default.config();
const downloadImageAsBuffer = async (imageUrl) => {
    const response = await axios_1.default.get(imageUrl, {
        responseType: "arraybuffer",
    });
    return Buffer.from(response.data);
};
function uploadBufferToCloudinary(buffer, folder = "gift-images") {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.default.uploader.upload_stream({
            folder,
            resource_type: "image",
            format: "webp",
        }, (error, result) => {
            if (error) {
                return reject(error);
            }
            if (!result?.secure_url) {
                return reject(new Error("Cloudinary upload failed"));
            }
            return resolve(result.secure_url);
        });
        stream.end(buffer);
    });
}
const generateGiftImage = async (req, res) => {
    try {
        const { imageUrls, prompt } = req.body;
        const apiKey = process.env.STABILITY_API_KEY;
        if (!apiKey) {
            return res.status(503).json({
                success: false,
                message: "Stability AI is not configured on this server",
            });
        }
        if (!cloudinary_2.isCloudinaryConfigured) {
            return res.status(503).json({
                success: false,
                message: "Cloudinary is not configured on this server",
            });
        }
        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({
                success: false,
                message: "prompt is required",
            });
        }
        const form = new form_data_1.default();
        if (Array.isArray(imageUrls) && imageUrls.length > 0) {
            const imageBuffer = await downloadImageAsBuffer(imageUrls[0]);
            form.append("image", imageBuffer, {
                filename: "input-image.png",
                contentType: "image/png",
            });
            form.append("select_prompt", "flowers");
        }
        form.append("prompt", prompt);
        form.append("output_format", "webp");
        const response = await axios_1.default.post("https://api.stability.ai/v2beta/stable-image/edit/search-and-recolor", form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${apiKey}`,
                Accept: "image/*",
            },
            responseType: "arraybuffer",
            validateStatus: () => true,
        });
        const contentTypeHeader = response.headers["content-type"];
        const contentType = typeof contentTypeHeader === "string" ? contentTypeHeader : undefined;
        if (response.status === 200) {
            const generatedImageBuffer = Buffer.from(response.data);
            const imageUrl = await uploadBufferToCloudinary(generatedImageBuffer);
            return res.status(200).json({
                success: true,
                message: "Image generated and uploaded successfully",
                imageUrl,
            });
        }
        if (contentType && contentType.includes("application/json")) {
            const errorText = Buffer.from(response.data).toString("utf8");
            return res.status(response.status).json({
                success: false,
                message: "Stability API returned an error",
                error: JSON.parse(errorText),
            });
        }
        return res.status(response.status).json({
            success: false,
            message: "Stability API returned a non-JSON error response",
            contentType,
        });
    }
    catch (err) {
        const e = err;
        console.error("generateGiftImage error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: e?.message,
        });
    }
};
exports.generateGiftImage = generateGiftImage;
