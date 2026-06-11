import { Request, Response } from "express";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import { UploadApiResponse } from "cloudinary";
import cloudinary from "../config/cloudinary";
import { isCloudinaryConfigured } from "../config/cloudinary";

dotenv.config();

const downloadImageAsBuffer = async (imageUrl: string): Promise<Buffer> => {
    const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
    });
    return Buffer.from(response.data);
};

export function uploadBufferToCloudinary(
    buffer: Buffer,
    folder: string = "gift-images"
): Promise<string> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
                format: "webp",
            },
            (error, result: UploadApiResponse | undefined) => {
                if (error) {
                    return reject(error);
                }
                if (!result?.secure_url) {
                    return reject(new Error("Cloudinary upload failed"));
                }
                return resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
}

export const generateGiftImage = async (req: Request, res: Response) => {
    try {
        const { imageUrls, prompt } = req.body as {
            imageUrls: string[];
            prompt: string;
        };

        const apiKey = process.env.STABILITY_API_KEY;
        if (!apiKey) {
            return res.status(503).json({
                success: false,
                message: "Stability AI is not configured on this server",
            });
        }

        if (!isCloudinaryConfigured) {
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

        const form = new FormData();
        if (Array.isArray(imageUrls) && imageUrls.length > 0) {
            const imageBuffer = await downloadImageAsBuffer(imageUrls[0] as string);
            form.append("image", imageBuffer, {
                filename: "input-image.png",
                contentType: "image/png",
            });
            form.append("select_prompt", "flowers");
        }
        form.append("prompt", prompt);
        form.append("output_format", "webp");

        const response = await axios.post(
            "https://api.stability.ai/v2beta/stable-image/edit/search-and-recolor",
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    Authorization: `Bearer ${apiKey}`,
                    Accept: "image/*",
                },
                responseType: "arraybuffer",
                validateStatus: () => true,
            }
        );

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
    } catch (err: unknown) {
        const e = err as { message?: string };
        console.error("generateGiftImage error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: e?.message,
        });
    }
};
