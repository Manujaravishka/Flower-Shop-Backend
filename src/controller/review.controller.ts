import { Request, Response } from "express";
import Review from "../model/review.modal";
import Order from "../model/Order.modal";
import { AuthRequest } from "../middleware/auth";

export const createReview = async (req: Request, res: Response) => {
    const { productId, rating, title, comment } = req.body as {
        productId?: string;
        rating?: number;
        title?: string;
        comment?: string;
    };

    if (!productId || !rating) {
        return res.status(400).json({
            success: false,
            message: "Product ID and rating are required",
        });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({
            success: false,
            message: "Rating must be between 1 and 5",
        });
    }

    const principal = (req as AuthRequest).user;
    if (!principal) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    try {
        const existing = await Review.findOne({
            productId,
            customerId: principal.sub,
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "You have already reviewed this product",
            });
        }

        const hasPurchased = await Order.findOne({
            customerId: principal.sub,
            "items.productId": productId,
            status: "delivered",
        });

        const review = new Review({
            productId,
            customerId: principal.sub,
            rating,
            title: title || "",
            comment: comment || "",
            isVerifiedPurchase: !!hasPurchased,
            isApproved: true,
        });

        await review.save();
        return res.status(201).json({
            success: true,
            data: review,
        });
    } catch (err) {
        console.error("Create review error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getReviewsByGift = async (req: Request, res: Response) => {
    const { giftId } = req.params as { giftId?: string };

    if (!giftId) {
        return res.status(400).json({
            success: false,
            message: "Gift ID is required",
        });
    }

    try {
        const reviews = await Review.find({
            productId: giftId,
            isApproved: true,
        })
            .populate("customerId", "name")
            .sort({ createdAt: -1 });

        const stats = await Review.aggregate([
            { $match: { productId: giftId as any, isApproved: true } },
            {
                $group: {
                    _id: null,
                    average: { $avg: "$rating" },
                    count: { $sum: 1 },
                    distribution: {
                        $push: "$rating",
                    },
                },
            },
        ]);

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        if (stats.length > 0) {
            for (const r of stats[0].distribution || []) {
                if (distribution[r as keyof typeof distribution] !== undefined) {
                    distribution[r as keyof typeof distribution]++;
                }
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                reviews,
                stats: {
                    average: stats.length > 0 ? Math.round(stats[0].average * 10) / 10 : 0,
                    count: stats.length > 0 ? stats[0].count : 0,
                    distribution,
                },
            },
        });
    } catch (err) {
        console.error("Get reviews error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getMyReviews = async (req: Request, res: Response) => {
    const principal = (req as AuthRequest).user;
    if (!principal) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    try {
        const reviews = await Review.find({ customerId: principal.sub })
            .populate("productId", "name mediaUrl")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: reviews,
        });
    } catch (err) {
        console.error("Get my reviews error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updateReview = async (req: Request, res: Response) => {
    const { id } = req.params as { id?: string };
    const { rating, title, comment } = req.body as {
        rating?: number;
        title?: string;
        comment?: string;
    };

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Review ID is required",
        });
    }

    const principal = (req as AuthRequest).user;
    if (!principal) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    try {
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found",
            });
        }

        if (review.customerId.toString() !== principal.sub) {
            return res.status(403).json({
                success: false,
                message: "You can only edit your own reviews",
            });
        }

        if (rating !== undefined) {
            if (rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    message: "Rating must be between 1 and 5",
                });
            }
            review.rating = rating;
        }
        if (title !== undefined) review.title = title;
        if (comment !== undefined) review.comment = comment;

        await review.save();
        return res.status(200).json({
            success: true,
            data: review,
        });
    } catch (err) {
        console.error("Update review error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const deleteReview = async (req: Request, res: Response) => {
    const { id } = req.params as { id?: string };

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Review ID is required",
        });
    }

    try {
        const review = await Review.findByIdAndDelete(id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Review deleted successfully",
        });
    } catch (err) {
        console.error("Delete review error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
