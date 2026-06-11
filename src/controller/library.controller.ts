import { Request, Response } from "express";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary";
import LibraryModel from "../model/library.modal";
import { IMediaUrl } from "../model/gift.modal";
import { AuthRequest } from "../middleware/auth";
import { saveFileLocally, deleteLocalFile } from "../util/localUpload";
import type { UploadApiResponse } from "cloudinary";

const uploadToCloudinary = (file: Express.Multer.File): Promise<UploadApiResponse> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "library-images" },
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

export const createLibrary = async (req: Request, res: Response) => {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (!title) {
        return res.status(400).json({
            success: false,
            message: "Title is required",
        });
    }

    try {
        const files = req.files as Express.Multer.File[] | undefined;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one image is required",
            });
        }

        const imgUrl: IMediaUrl[] = [];
        for (const file of files) {
            const result = await uploadFile(file);
            imgUrl.push(result);
        }

        const principal = (req as AuthRequest).user;
        const newLibrary = new LibraryModel({
            title,
            mediaUrl: imgUrl,
            createdBy: principal?.sub ? (principal.sub as unknown as string) : undefined,
        });

        await newLibrary.save();
        return res.status(201).json({
            success: true,
            data: newLibrary,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        console.error("Create library error:", err);
        return res.status(500).json({
            success: false,
            message,
        });
    }
};

export const getLibraries = async (req: Request, res: Response) => {
    const imageId = (req.params as { id?: string }).id || (req.body as { imageId?: string }).imageId;

    if (!imageId) {
        return res.status(400).json({
            success: false,
            message: "Library ID is required",
        });
    }

    try {
        const library = await LibraryModel.findById(imageId);
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
    } catch (err) {
        console.error("Get library error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getAllLibraries = async (_req: Request, res: Response) => {
    try {
        const libraries = await LibraryModel.find().sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: libraries,
        });
    } catch (err) {
        console.error("Get all libraries error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updateTitle = async (req: Request, res: Response) => {
    const libraryId = (req.params as { id?: string }).id || (req.body as { libraryId?: string }).libraryId;
    const { title } = req.body as {
        title?: string;
    };

    if (!libraryId) {
        return res.status(400).json({
            success: false,
            message: "Library ID is required",
        });
    }

    try {
        const library = await LibraryModel.findById(libraryId);
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
    } catch (err) {
        console.error("Update title error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const deleteLibrary = async (req: Request, res: Response) => {
    const libraryId = (req.params as { id?: string }).id || (req.body as { libraryId?: string }).libraryId;

    if (!libraryId) {
        return res.status(400).json({
            success: false,
            message: "Library ID is required",
        });
    }

    try {
        const library = await LibraryModel.findByIdAndDelete(libraryId);
        if (!library) {
            return res.status(404).json({
                success: false,
                message: "Library not found",
            });
        }

        for (const media of library.mediaUrl) {
            try {
                if (media.public_id.startsWith("local_")) {
                    deleteLocalFile(media.public_id);
                } else {
                    await cloudinary.uploader.destroy(media.public_id);
                }
            } catch (err) {
                console.warn(`Failed to delete asset ${media.public_id}:`, err);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Library deleted successfully",
        });
    } catch (err) {
        console.error("Delete library error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const deleteImageFromLibrary = async (req: Request, res: Response) => {
    const libraryId = (req.params as { id?: string }).id || (req.body as { libraryId?: string }).libraryId;
    const publicId = (req.query as { publicId?: string }).publicId || (req.body as { publicId?: string }).publicId;

    if (!libraryId) {
        return res.status(400).json({
            success: false,
            message: "Library ID is required",
        });
    }

    try {
        const library = await LibraryModel.findById(libraryId);
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
                deleteLocalFile(target.public_id);
            } else {
                await cloudinary.uploader.destroy(target.public_id);
            }
        } catch (err) {
            console.warn(`Failed to delete asset ${target.public_id}:`, err);
        }

        library.mediaUrl = library.mediaUrl.filter(
            (m) => m.public_id !== target.public_id
        );
        await library.save();

        return res.status(200).json({
            success: true,
            message: "Image deleted successfully from library",
        });
    } catch (err) {
        console.error("Delete image from library error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updateImagesToLibrary = async (req: Request, res: Response) => {
    const libraryId = (req.params as { id?: string }).id || (req.body as { libraryId?: string }).libraryId;

    if (!libraryId) {
        return res.status(400).json({
            success: false,
            message: "Library ID is required",
        });
    }

    try {
        const library = await LibraryModel.findById(libraryId);
        if (!library) {
            return res.status(404).json({
                success: false,
                message: "Library not found",
            });
        }

        const files = req.files as Express.Multer.File[] | undefined;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No images provided for upload",
            });
        }

        const newMediaUrls: IMediaUrl[] = [];
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
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        console.error("Update images to library error:", err);
        return res.status(500).json({
            success: false,
            message,
        });
    }
};

export const findByName = async (req: Request, res: Response) => {
    const { title } = req.body as { title?: string };

    if (!title || typeof title !== "string" || title.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Title is required",
        });
    }

    try {
        const libraries = await LibraryModel.find({
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
    } catch (err) {
        console.error("Find by name error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
