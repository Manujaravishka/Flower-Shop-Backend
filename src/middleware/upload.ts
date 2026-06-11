import multer, { FileFilterCallback } from "multer";
import { Request, Response } from "express";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 10;

const ALLOWED_MIME_TYPES = new Set<string>([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
]);

const MAGIC_BYTES: Record<string, number[]> = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/jpg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/gif": [0x47, 0x49, 0x46],
    "image/webp": [0x52, 0x49, 0x46, 0x46],
};

const checkMagicBytes = (buffer: Buffer, mime: string): boolean => {
    const sig = MAGIC_BYTES[mime];
    if (!sig) return false;
    if (buffer.length < sig.length) return false;
    for (let i = 0; i < sig.length; i++) {
        if (buffer[i] !== sig[i]) return false;
    }
    return true;
};

const storage = multer.memoryStorage();

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(new Error("Only image files (jpeg, jpg, png, webp, gif) are allowed"));
    }
    return cb(null, true);
};

export const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: MAX_FILES,
    },
    fileFilter,
});

export const verifyUploadedFiles = (
    req: Request,
    _res: Response,
    next: (err?: unknown) => void
) => {
    const files = Array.isArray(req.files)
        ? req.files
        : req.files && typeof req.files === "object"
        ? Object.values(req.files).flat()
        : [];

    for (const file of files) {
        if (!checkMagicBytes(file.buffer, file.mimetype)) {
            return next(new Error("File content does not match its declared type"));
        }
    }
    return next();
};
