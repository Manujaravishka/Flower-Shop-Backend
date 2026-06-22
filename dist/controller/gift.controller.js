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
Object.defineProperty(exports, "__esModule", { value: true });
exports.newArrivals = exports.deleteGift = exports.getAllGifts = exports.getGifts = exports.deleteImage = exports.updateImages = exports.updateGift = exports.createGift = void 0;
const gift_modal_1 = __importStar(require("../model/gift.modal"));
const cloudinary_1 = __importStar(require("../config/cloudinary"));
const localUpload_1 = require("../util/localUpload");
const category_1 = require("../util/category");
const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.default.uploader.upload_stream({ folder: "gift-images" }, (error, result) => {
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
const parseStringField = (value, label) => {
    if (typeof value !== "string" || value.trim() === "") {
        return null;
    }
    return value.trim();
};
const parsePrice = (value) => {
    if (typeof value === "string") {
        value = Number(value);
    }
    if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
        return null;
    }
    return value;
};
const parseStock = (value) => {
    if (typeof value === "string") {
        value = Number(value);
    }
    if (typeof value !== "number" || Number.isNaN(value) || value < 0)
        return 0;
    return Math.floor(value);
};
const parseSize = (value) => {
    if (typeof value !== "string")
        return undefined;
    const upper = value.toUpperCase();
    if (Object.values(gift_modal_1.Size).includes(upper))
        return upper;
    return undefined;
};
const createGift = async (req, res) => {
    const name = parseStringField(req.body?.name, "name");
    const description = parseStringField(req.body?.description, "description");
    const price = parsePrice(req.body?.price);
    const colour = parseStringField(req.body?.colour, "colour");
    const size = parseSize(req.body?.size);
    const category = (0, category_1.normalizeCategories)(req.body?.category);
    const stock = parseStock(req.body?.stock);
    const slug = parseStringField(req.body?.slug, "slug");
    const files = Array.isArray(req.files)
        ? req.files
        : req.files && typeof req.files === "object"
            ? Object.values(req.files).flat()
            : [];
    if (!name || !price || !colour || !category) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields",
        });
    }
    if (files.length === 0) {
        return res.status(400).json({
            success: false,
            message: "At least one image is required",
        });
    }
    try {
        const imageURLs = [];
        for (const file of files) {
            const result = await uploadFile(file);
            imageURLs.push(result);
        }
        const newGift = new gift_modal_1.default({
            name,
            description,
            price,
            colour,
            size,
            category,
            mediaUrl: imageURLs,
            stock,
            isActive: true,
            slug: slug || undefined,
        });
        await newGift.save();
        return res.status(201).json({
            success: true,
            data: newGift,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Image upload failed";
        console.error("Create gift error:", err);
        return res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.createGift = createGift;
const updateGift = async (req, res) => {
    const giftId = req.params.id || req.body.giftId;
    const { name, description, price, colour, size, category, stock, isActive, slug } = req.body;
    if (!giftId) {
        return res.status(400).json({
            success: false,
            message: "Gift ID is required",
        });
    }
    try {
        const gift = await gift_modal_1.default.findById(giftId);
        if (!gift) {
            return res.status(404).json({
                success: false,
                message: "Gift not found",
            });
        }
        if (name !== undefined)
            gift.name = name;
        if (description !== undefined)
            gift.description = description;
        if (price !== undefined) {
            const p = parsePrice(price);
            if (p !== null)
                gift.price = p;
        }
        if (colour !== undefined)
            gift.colour = colour;
        if (size !== undefined) {
            const s = parseSize(size);
            if (s)
                gift.size = s;
        }
        if (category !== undefined) {
            const cats = (0, category_1.normalizeCategories)(category);
            if (cats.length > 0)
                gift.category = cats;
        }
        if (stock !== undefined)
            gift.stock = parseStock(stock);
        if (isActive !== undefined)
            gift.isActive = !!isActive;
        if (slug !== undefined)
            gift.slug = slug || undefined;
        await gift.save();
        return res.status(200).json({
            success: true,
            data: gift,
        });
    }
    catch (err) {
        console.error("Update gift error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.updateGift = updateGift;
const updateImages = async (req, res) => {
    const giftId = req.params.id || req.body.giftId;
    if (!giftId) {
        return res.status(400).json({
            success: false,
            message: "Gift ID is required",
        });
    }
    try {
        const gift = await gift_modal_1.default.findById(giftId);
        if (!gift) {
            return res.status(404).json({
                success: false,
                message: "Gift not found",
            });
        }
        const files = Array.isArray(req.files)
            ? req.files
            : req.files && typeof req.files === "object"
                ? Object.values(req.files).flat()
                : [];
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one image is required",
            });
        }
        const newMediaUrls = [];
        for (const file of files) {
            const result = await uploadFile(file);
            newMediaUrls.push(result);
        }
        gift.mediaUrl.push(...newMediaUrls);
        await gift.save();
        return res.status(200).json({
            success: true,
            message: "Images updated successfully",
            data: gift,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        console.error("Update images error:", err);
        return res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.updateImages = updateImages;
const deleteImage = async (req, res) => {
    const giftId = req.params.id || req.body.giftId;
    const publicId = req.query.publicId || req.body.publicId;
    if (!giftId || !publicId) {
        return res.status(400).json({
            success: false,
            message: "Gift ID and public ID are required",
        });
    }
    try {
        const gift = await gift_modal_1.default.findById(giftId);
        if (!gift) {
            return res.status(404).json({
                success: false,
                message: "Gift not found",
            });
        }
        const imageIndex = gift.mediaUrl.findIndex((media) => media.public_id === publicId);
        if (imageIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Image not found",
            });
        }
        try {
            if (publicId.startsWith("local_")) {
                (0, localUpload_1.deleteLocalFile)(publicId);
            }
            else {
                await cloudinary_1.default.uploader.destroy(publicId);
            }
        }
        catch (cloudErr) {
            console.warn("Image delete failed:", cloudErr);
        }
        gift.mediaUrl.splice(imageIndex, 1);
        await gift.save();
        return res.status(200).json({
            success: true,
            message: "Image deleted successfully",
            deletedPublicId: publicId,
            remainingImages: gift.mediaUrl.length,
        });
    }
    catch (err) {
        console.error("Delete image error:", err);
        return res.status(500).json({
            success: false,
            message: "Delete failed",
        });
    }
};
exports.deleteImage = deleteImage;
const getGifts = async (req, res) => {
    const giftId = req.params.id || req.body.giftId;
    if (!giftId) {
        return res.status(400).json({
            success: false,
            message: "Gift ID is required",
        });
    }
    try {
        const gift = await gift_modal_1.default.findById(giftId);
        if (!gift) {
            return res.status(404).json({
                success: false,
                message: "Gift not found",
            });
        }
        return res.status(200).json({
            success: true,
            data: gift,
        });
    }
    catch (err) {
        console.error("Get gift error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getGifts = getGifts;
const getAllGifts = async (req, res) => {
    try {
        const { category, size, minPrice, maxPrice, search, page, limit, includeInactive } = req.query;
        const filter = {};
        if (!includeInactive || includeInactive !== "true") {
            filter.isActive = true;
        }
        if (category) {
            const cats = (0, category_1.normalizeCategoryQueryParam)(category);
            if (cats.length > 0) {
                filter.category = { $in: cats };
            }
        }
        if (size) {
            filter.size = size.toUpperCase();
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice)
                filter.price.$gte = Number(minPrice);
            if (maxPrice)
                filter.price.$lte = Number(maxPrice);
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        const [gifts, total] = await Promise.all([
            gift_modal_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
            gift_modal_1.default.countDocuments(filter),
        ]);
        return res.status(200).json({
            success: true,
            data: gifts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (err) {
        console.error("Get all gifts error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getAllGifts = getAllGifts;
const deleteGift = async (req, res) => {
    const giftId = req.params.id || req.body.giftId;
    if (!giftId) {
        return res.status(400).json({
            success: false,
            message: "Gift ID is required",
        });
    }
    try {
        const gift = await gift_modal_1.default.findByIdAndDelete(giftId);
        if (!gift) {
            return res.status(404).json({
                success: false,
                message: "Gift not found",
            });
        }
        for (const media of gift.mediaUrl) {
            try {
                await cloudinary_1.default.uploader.destroy(media.public_id);
            }
            catch (err) {
                console.warn(`Failed to delete cloudinary asset ${media.public_id}:`, err);
            }
        }
        return res.status(200).json({
            success: true,
            message: "Gift deleted successfully",
        });
    }
    catch (err) {
        console.error("Delete gift error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.deleteGift = deleteGift;
const newArrivals = async (_req, res) => {
    try {
        const gifts = await gift_modal_1.default.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(10);
        return res.status(200).json({
            success: true,
            data: gifts,
        });
    }
    catch (err) {
        console.error("New arrivals error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.newArrivals = newArrivals;
