import { Router, Request, Response, NextFunction } from "express";
import {
    createGift,
    updateGift,
    deleteImage,
    updateImages,
    getAllGifts,
    getGifts,
    deleteGift,
    newArrivals,
} from "../controller/gift.controller";
import { upload, verifyUploadedFiles } from "../middleware/upload";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireRole";
import { validateObjectIdParam } from "../middleware/validations";

const router = Router();

router.post(
    "/create",
    authenticate,
    requireAdmin,
    upload.array("image", 5),
    verifyUploadedFiles,
    createGift
);
router.put("/:id", authenticate, requireAdmin, updateGift);
router.delete("/:id", authenticate, requireAdmin, deleteGift);
router.delete("/:id/image", authenticate, requireAdmin, deleteImage);
router.put(
    "/:id/images",
    authenticate,
    requireAdmin,
    upload.array("image", 5),
    verifyUploadedFiles,
    updateImages
);

router.get("/all", getAllGifts);
router.get("/new-arrivals", newArrivals);

router.get(
    "/:id",
    validateObjectIdParam("id"),
    getGifts
);

export default router;

