import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const INVALID_VALUE = /^(replace_with_|your_|changeme_|demo)/i;

const isValid =
    !!cloudName &&
    !!apiKey &&
    !!apiSecret &&
    !INVALID_VALUE.test(cloudName) &&
    !INVALID_VALUE.test(apiKey) &&
    !INVALID_VALUE.test(apiSecret);

if (!isValid) {
    throw new Error(
        "❌ Cloudinary is not properly configured. Check your .env values."
    );
}

cloudinary.config({
    cloud_name: cloudName!,
    api_key: apiKey!,
    api_secret: apiSecret!,
    secure: true, // ✅ important for production
});

export default cloudinary;