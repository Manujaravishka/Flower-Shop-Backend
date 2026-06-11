"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findByName = exports.updateImagesToLibrary = exports.deleteImageFromLibrary = exports.deleteLibrary = exports.updateTitle = exports.getAllLibraries = exports.getLibraries = exports.createLibrary = void 0;
const cloudinary_1 = __importStar(require("../config/cloudinary"));
const library_modal_1 = __importDefault(require("../model/library.modal"));
const localUpload_1 = require("../util/localUpload");
const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.default.uploader.upload_stream({ folder: "library-images" }, (error, result) => {
            if (error)
                return reject(error);
            if (!result)
                return reject(new Error("Cloudinary upload failed"));
            return resolve(result);
        });
        stream.end(file.buffer);
    });
};
const uploadFile = async (file) => {
    if (cloudinary_1.isCloudinaryConfigured) {
        try {
            const result = await uploadToCloudinary(file);
            return { url: result.secure_url, public_id: result.public_id };
        }
        catch (err) {
            console.warn("Cloudinary upload failed, falling back to local storage:", err);
            return (0, localUpload_1.saveFileLocally)(file);
        }
    }
    return (0, localUpload_1.saveFileLocally)(file);
};
const createLibrary = async (req, res) => {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (!title) {
        return res.status(400).json({
            success: false,
            message: "Title is required",
        });
    }
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one image is required",
            });
        }
        const imgUrl = [];
        for (const file of files) {
            const result = await uploadFile(file);
            imgUrl.push(result);
        }
        const principal = req.user;
        const newLibrary = new library_modal_1.default({
            title,
            mediaUrl: imgUrl,
            createdBy: principal?.sub ? principal.sub : undefined,
        });
        await newLibrary.save();
        return res.status(201).json({
            success: true,
            data: newLibrary,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        console.error("Create library error:", err);
        return res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.createLibrary = createLibrary;
const getLibraries = async (req, res) => {
    const imageId = req.params.id || req.body.imageId;
    if (!imageId) {
        return res.status(400).json({
            success: false,
            message: "Library ID is required",
        });
    }
    try {
        const library = await library_modal_1.default.findById(imageId);
        if (!library) {
            return res.status(404).json({
                success: false,
                message: "Library not found",
            });
        }
        return res.status(200).json({
            success: true,
            data: library,
        });
    }
    catch (err) {
        console.error("Get library error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getLibraries = getLibraries;
const getAllLibraries = async (_req, res) => {
    try {
        const libraries = await library_modal_1.default.find().sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: libraries,
        });
    }
    catch (err) {
        console.error("Get all libraries error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getAllLibraries = getAllLibraries;
const updateTitle = async (req, res) => {
    const libraryId = req.params.id || req.body.libraryId;
    const { title } = req.body;
    if (!libraryId) {
        return res.status(400).json({
            success: false,
            message: "Library ID is required",
        });
    }
    try {
        const library = await library_modal_1.default.findById(libraryId);
        if (!library) {
            return res.status(404).json({
                success: false,
                message: "Library not found",
            });
        }
        if (typeof title === "string" && title.trim() !== "") {
            library.title = title.trim();
        }
        await library.save();
        return res.status(200).json({
            success: true,
            data: library,
        });
    }
    catch (err) {
        console.error("Update title error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.updateTitle = updateTitle;
const deleteLibrary = async (req, res) => {
    const libraryId = req.params.id || req.body.libraryId;
    if (!libraryId) {
        return res.status(400).json({
            success: false,
            message: "Library ID is required",
        });
    }
    try {
        const library = await library_modal_1.default.findByIdAndDelete(libraryId);
        if (!library) {
            return res.status(404).json({
                success: false,
                message: "Library not found",
            });
        }
        for (const media of library.mediaUrl) {
            try {
                if (media.public_id.startsWith("local_")) {
                    (0, localUpload_1.deleteLocalFile)(media.public_id);
                }
                else {
                    await cloudinary_1.default.uploader.destroy(media.public_id);
                }
            }
            catch (err) {
                console.warn(`Failed to delete asset ${media.public_id}:`, err);
            }
        }
        return res.status(200).json({
            success: true,
            message: "Library deleted successfully",
        });
    }
    catch (err) {
        console.error("Delete library error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.deleteLibrary = deleteLibrary;
const deleteImageFromLibrary = async (req, res) => {
    const libraryId = req.params.id || req.body.libraryId;
    const publicId = req.query.publicId || req.body.publicId;
    if (!libraryId) {
        return res.status(400).json({
            success: false,
            message: "Library ID is required",
        });
    }
    try {
        const library = await library_modal_1.default.findById(libraryId);
        if (!library) {
            return res.status(404).json({
                success: false,
                message: "Library not found",
            });
        }
        const target = publicId
            ? library.mediaUrl.find((m) => m.public_id === publicId)
            : library.mediaUrl[0];
        if (!target) {
            return res.status(404).json({
                success: false,
                message: "Image not found in library",
            });
        }
        try {
            if (target.public_id.startsWith("local_")) {
                (0, localUpload_1.deleteLocalFile)(target.public_id);
            }
            else {
                await cloudinary_1.default.uploader.destroy(target.public_id);
            }
        }
        catch (err) {
            console.warn(`Failed to delete asset ${target.public_id}:`, err);
        }
        library.mediaUrl = library.mediaUrl.filter((m) => m.public_id !== target.public_id);
        await library.save();
        return res.status(200).json({
            success: true,
            message: "Image deleted successfully from library",
        });
    }
    catch (err) {
        console.error("Delete image from library error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.deleteImageFromLibrary = deleteImageFromLibrary;
const updateImagesToLibrary = async (req, res) => {
    const libraryId = req.params.id || req.body.libraryId;
    if (!libraryId) {
        return res.status(400).json({
            success: false,
            message: "Library ID is required",
        });
    }
    try {
        const library = await library_modal_1.default.findById(libraryId);
        if (!library) {
            return res.status(404).json({
                success: false,
                message: "Library not found",
            });
        }
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No images provided for upload",
            });
        }
        const newMediaUrls = [];
        for (const file of files) {
            const result = await uploadFile(file);
            newMediaUrls.push(result);
        }
        library.mediaUrl.push(...newMediaUrls);
        await library.save();
        return res.status(200).json({
            success: true,
            message: "Images added successfully to library",
            data: library,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        console.error("Update images to library error:", err);
        return res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.updateImagesToLibrary = updateImagesToLibrary;
const findByName = async (req, res) => {
    const { title } = req.body;
    if (!title || typeof title !== "string" || title.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Title is required",
        });
    }
    try {
        const libraries = await library_modal_1.default.find({
            title: { $regex: title.trim(), $options: "i" },
        });
        if (libraries.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Library not found",
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                count: libraries.length,
                libraries,
            },
        });
    }
    catch (err) {
        console.error("Find by name error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.findByName = findByName;
