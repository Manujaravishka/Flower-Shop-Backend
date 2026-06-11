import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

const ensureDir = () => {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
};

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
]);

const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
};

export interface LocalUploadResult {
    url: string;
    public_id: string;
}

export const saveFileLocally = (file: Express.Multer.File): LocalUploadResult => {
    ensureDir();
    const ext = MIME_TO_EXT[file.mimetype] || ".bin";
    const uniqueName = crypto.randomUUID() + ext;
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    fs.writeFileSync(filePath, file.buffer);
    return {
        url: `/uploads/${uniqueName}`,
        public_id: `local_${uniqueName}`,
    };
};

export const deleteLocalFile = (publicId: string): void => {
    if (!publicId.startsWith("local_")) return;
    const fileName = publicId.replace("local_", "");
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

export const uploadMiddleware = (_req: Request, res: Response, next: () => void) => {
    ensureDir();
    next();
};
