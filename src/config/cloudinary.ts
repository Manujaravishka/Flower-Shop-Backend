import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const INVALID_VALUE = /^(replace_with_|your_|changeme_|demo)/i;

export const isCloudinaryConfigured =
    !!cloudName &&
    !!apiKey &&
    !!apiSecret &&
    !INVALID_VALUE.test(cloudName) &&
    !INVALID_VALUE.test(apiKey) &&
    !INVALID_VALUE.test(apiSecret);

if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: cloudName!,
        api_key: apiKey!,
        api_secret: apiSecret!,
        secure: true,
    });
}

export default cloudinary;