import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
    createReview,
    getReviewsByGift,
    getMyReviews,
    updateReview,
    deleteReview,
} from "../controller/review.controller";

const router = Router();

router.post("/create", authenticate, createReview);
router.get("/product/:giftId", getReviewsByGift);
router.get("/my", authenticate, getMyReviews);
router.put("/:id", authenticate, updateReview);
router.delete("/:id", authenticate, deleteReview);

export default router;
