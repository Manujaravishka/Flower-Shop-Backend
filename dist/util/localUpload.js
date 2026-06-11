"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = exports.deleteLocalFile = exports.saveFileLocally = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const UPLOAD_DIR = path_1.default.resolve(process.cwd(), "uploads");
const ensureDir = () => {
    if (!fs_1.default.existsSync(UPLOAD_DIR)) {
        fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
};
const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
]);
const MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
};
const saveFileLocally = (file) => {
    ensureDir();
    const ext = MIME_TO_EXT[file.mimetype] || ".bin";
    const uniqueName = crypto_1.default.randomUUID() + ext;
    const filePath = path_1.default.join(UPLOAD_DIR, uniqueName);
    fs_1.default.writeFileSync(filePath, file.buffer);
    return {
        url: `/uploads/${uniqueName}`,
        public_id: `local_${uniqueName}`,
    };
};
exports.saveFileLocally = saveFileLocally;
const deleteLocalFile = (publicId) => {
    if (!publicId.startsWith("local_"))
        return;
    const fileName = publicId.replace("local_", "");
    const filePath = path_1.default.join(UPLOAD_DIR, fileName);
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
    }
};
exports.deleteLocalFile = deleteLocalFile;
const uploadMiddleware = (_req, res, next) => {
    ensureDir();
    next();
};
exports.uploadMiddleware = uploadMiddleware;
