import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import {
    getMyProfile,
    updateMyProfile,
    deleteMyAccount,
    getMyCart,
    clearMyCart,
} from "../controller/customer.profile.controller";
import {
    validateName,
    validatePhoneLK,
    validateAddress,
} from "../middleware/validations";

const router = Router();

router.get("/me", authenticate, requireRole("customer"), getMyProfile);
router.put(
    "/me",
    authenticate,
    requireRole("customer"),
    validateName,
    validatePhoneLK,
    validateAddress,
    updateMyProfile
);
router.delete("/me", authenticate, requireRole("customer"), deleteMyAccount);
router.get("/me/cart", authenticate, requireRole("customer"), getMyCart);
router.delete("/me/cart", authenticate, requireRole("customer"), clearMyCart);

export default router;
