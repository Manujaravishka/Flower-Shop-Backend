"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReview = exports.updateReview = exports.getMyReviews = exports.getReviewsByGift = exports.createReview = void 0;
const review_modal_1 = __importDefault(require("../model/review.modal"));
const Order_modal_1 = __importDefault(require("../model/Order.modal"));
const createReview = async (req, res) => {
    const { productId, rating, title, comment } = req.body;
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
    const principal = req.user;
    if (!principal) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }
    try {
        const existing = await review_modal_1.default.findOne({
            productId,
            customerId: principal.sub,
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "You have already reviewed this product",
            });
        }
        const hasPurchased = await Order_modal_1.default.findOne({
            customerId: principal.sub,
            "items.productId": productId,
            status: "delivered",
        });
        const review = new review_modal_1.default({
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
    }
    catch (err) {
        console.error("Create review error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.createReview = createReview;
const getReviewsByGift = async (req, res) => {
    const { giftId } = req.params;
    if (!giftId) {
        return res.status(400).json({
            success: false,
            message: "Gift ID is required",
        });
    }
    try {
        const reviews = await review_modal_1.default.find({
            productId: giftId,
            isApproved: true,
        })
            .populate("customerId", "name")
            .sort({ createdAt: -1 });
        const stats = await review_modal_1.default.aggregate([
            { $match: { productId: giftId, isApproved: true } },
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
                if (distribution[r] !== undefined) {
                    distribution[r]++;
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
    }
    catch (err) {
        console.error("Get reviews error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getReviewsByGift = getReviewsByGift;
const getMyReviews = async (req, res) => {
    const principal = req.user;
    if (!principal) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }
    try {
        const reviews = await review_modal_1.default.find({ customerId: principal.sub })
            .populate("productId", "name mediaUrl")
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: reviews,
        });
    }
    catch (err) {
        console.error("Get my reviews error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getMyReviews = getMyReviews;
const updateReview = async (req, res) => {
    const { id } = req.params;
    const { rating, title, comment } = req.body;
    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Review ID is required",
        });
    }
    const principal = req.user;
    if (!principal) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }
    try {
        const review = await review_modal_1.default.findById(id);
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
        if (title !== undefined)
            review.title = title;
        if (comment !== undefined)
            review.comment = comment;
        await review.save();
        return res.status(200).json({
            success: true,
            data: review,
        });
    }
    catch (err) {
        console.error("Update review error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.updateReview = updateReview;
const deleteReview = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Review ID is required",
        });
    }
    try {
        const review = await review_modal_1.default.findByIdAndDelete(id);
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
    }
    catch (err) {
        console.error("Delete review error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.deleteReview = deleteReview;
