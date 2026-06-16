import { Request, Response } from "express";
import Gift, { IMediaUrl, Category, Size } from "../model/gift.modal";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary";
import { saveFileLocally, deleteLocalFile } from "../util/localUpload";
import { normalizeCategories, normalizeCategoryQueryParam } from "../util/category";
import type { UploadApiResponse } from "cloudinary";

const uploadToCloudinary = (file: Express.Multer.File): Promise<UploadApiResponse> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "gift-images" },
            (error, result) => {
                if (error) return reject(error);
                if (!result) return reject(new Error("Cloudinary upload failed"));
                return resolve(result);
            }
        );
        stream.end(file.buffer);
    });
};

const uploadFile = async (file: Express.Multer.File): Promise<IMediaUrl> => {
    if (isCloudinaryConfigured) {
        try {
            const result = await uploadToCloudinary(file);
            return { url: result.secure_url, public_id: result.public_id };
        } catch (err) {
            console.warn("Cloudinary upload failed, falling back to local storage:", err);
            return saveFileLocally(file);
        }
    }
    return saveFileLocally(file);
};

const parseStringField = (value: unknown, label: string): string | null => {
    if (typeof value !== "string" || value.trim() === "") {
        return null;
    }
    return value.trim();
};

const parsePrice = (value: unknown): number | null => {
    if (typeof value === "string") {
        value = Number(value);
    }
    if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
        return null;
    }
    return value;
};

const parseStock = (value: unknown): number => {
    if (typeof value === "string") {
        value = Number(value);
    }
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) return 0;
    return Math.floor(value);
};


const parseSize = (value: unknown): Size | undefined => {
    if (typeof value !== "string") return undefined;
    const upper = value.toUpperCase();
    if (Object.values(Size).includes(upper as Size)) return upper as Size;
    return undefined;
};

export const createGift = async (req: Request, res: Response) => {
    const name = parseStringField(req.body?.name, "name");
    const description = parseStringField(req.body?.description, "description");
    const price = parsePrice(req.body?.price);
    const colour = parseStringField(req.body?.colour, "colour");
    const size = parseSize(req.body?.size);
    const category = normalizeCategories(req.body?.category);
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
        const imageURLs: IMediaUrl[] = [];

        for (const file of files) {
            const result = await uploadFile(file);
            imageURLs.push(result);
        }

        const newGift = new Gift({
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
    } catch (err) {
        const message = err instanceof Error ? err.message : "Image upload failed";
        console.error("Create gift error:", err);
        return res.status(500).json({
            success: false,
            message,
        });
    }
};

export const updateGift = async (req: Request, res: Response) => {
    const giftId = (req.params as { id?: string }).id || (req.body as { giftId?: string }).giftId;
    const { name, description, price, colour, size, category, stock, isActive, slug } = req.body as {
        name?: string;
        description?: string;
        price?: number;
        colour?: string;
        size?: string;
        category?: string[] | string;
        stock?: number;
        isActive?: boolean;
        slug?: string;
    };

    if (!giftId) {
        return res.status(400).json({
            success: false,
            message: "Gift ID is required",
        });
    }

    try {
        const gift = await Gift.findById(giftId);
        if (!gift) {
            return res.status(404).json({
                success: false,
                message: "Gift not found",
            });
        }

        if (name !== undefined) gift.name = name;
        if (description !== undefined) gift.description = description;
        if (price !== undefined) {
            const p = parsePrice(price);
            if (p !== null) gift.price = p;
        }
        if (colour !== undefined) gift.colour = colour;
        if (size !== undefined) {
            const s = parseSize(size);
            if (s) gift.size = s;
        }
        if (category !== undefined) {
            const cats = normalizeCategories(category);
            if (cats.length > 0) gift.category = cats;
        }
        if (stock !== undefined) gift.stock = parseStock(stock);
        if (isActive !== undefined) gift.isActive = !!isActive;
        if (slug !== undefined) gift.slug = slug || undefined;

        await gift.save();
        return res.status(200).json({
            success: true,
            data: gift,
        });
    } catch (err) {
        console.error("Update gift error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updateImages = async (req: Request, res: Response) => {
    const giftId = (req.params as { id?: string }).id || (req.body as { giftId?: string }).giftId;

    if (!giftId) {
        return res.status(400).json({
            success: false,
            message: "Gift ID is required",
        });
    }

    try {
        const gift = await Gift.findById(giftId);
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

        const newMediaUrls: IMediaUrl[] = [];
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
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        console.error("Update images error:", err);
        return res.status(500).json({
            success: false,
            message,
        });
    }
};

export const deleteImage = async (req: Request, res: Response) => {
    const giftId = (req.params as { id?: string }).id || (req.body as { giftId?: string }).giftId;
    const publicId = (req.query as { publicId?: string }).publicId || (req.body as { publicId?: string }).publicId;

    if (!giftId || !publicId) {
        return res.status(400).json({
            success: false,
            message: "Gift ID and public ID are required",
        });
    }

    try {
        const gift = await Gift.findById(giftId);
        if (!gift) {
            return res.status(404).json({
                success: false,
                message: "Gift not found",
            });
        }

        const imageIndex = gift.mediaUrl.findIndex(
            (media) => media.public_id === publicId
        );
        if (imageIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Image not found",
            });
        }

        try {
            if (publicId.startsWith("local_")) {
                deleteLocalFile(publicId);
            } else {
                await cloudinary.uploader.destroy(publicId);
            }
        } catch (cloudErr) {
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
    } catch (err) {
        console.error("Delete image error:", err);
        return res.status(500).json({
            success: false,
            message: "Delete failed",
        });
    }
};

export const getGifts = async (req: Request, res: Response) => {
    const giftId = (req.params as { id?: string }).id || (req.body as { giftId?: string }).giftId;

    if (!giftId) {
        return res.status(400).json({
            success: false,
            message: "Gift ID is required",
        });
    }

    try {
        const gift = await Gift.findById(giftId);
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
    } catch (err) {
        console.error("Get gift error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getAllGifts = async (req: Request, res: Response) => {
    try {
        const { category, size, minPrice, maxPrice, search, page, limit, includeInactive } = req.query as {
            category?: string;
            size?: string;
            minPrice?: string;
            maxPrice?: string;
            search?: string;
            page?: string;
            limit?: string;
            includeInactive?: string;
        };

        const filter: Record<string, unknown> = {};
        if (!includeInactive || includeInactive !== "true") {
            filter.isActive = true;
        }
        if (category) {
            const cats = normalizeCategoryQueryParam(category);
            if (cats.length > 0) {
                filter.category = { $in: cats };
            }
        }
        if (size) {
            filter.size = size.toUpperCase();
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) (filter.price as Record<string, number>).$gte = Number(minPrice);
            if (maxPrice) (filter.price as Record<string, number>).$lte = Number(maxPrice);
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
            Gift.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
            Gift.countDocuments(filter),
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
    } catch (err) {
        console.error("Get all gifts error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const deleteGift = async (req: Request, res: Response) => {
    const giftId = (req.params as { id?: string }).id || (req.body as { giftId?: string }).giftId;

    if (!giftId) {
        return res.status(400).json({
            success: false,
            message: "Gift ID is required",
        });
    }

    try {
        const gift = await Gift.findByIdAndDelete(giftId);
        if (!gift) {
            return res.status(404).json({
                success: false,
                message: "Gift not found",
            });
        }

        for (const media of gift.mediaUrl) {
            try {
                await cloudinary.uploader.destroy(media.public_id);
            } catch (err) {
                console.warn(`Failed to delete cloudinary asset ${media.public_id}:`, err);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Gift deleted successfully",
        });
    } catch (err) {
        console.error("Delete gift error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const newArrivals = async (_req: Request, res: Response) => {
    try {
        const gifts = await Gift.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(10);
        return res.status(200).json({
            success: true,
            data: gifts,
        });
    } catch (err) {
        console.error("New arrivals error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
