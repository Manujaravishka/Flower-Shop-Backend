import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { getMyCart, clearMyCart } from "../controller/customer.profile.controller";
import { addToCart, removeFromCart, qtyChange } from "../controller/customer.controller";

const router = Router();

router.get("/get", authenticate, requireRole("customer"), getMyCart);
router.post("/add", authenticate, requireRole("customer"), addToCart);
router.put("/update", authenticate, requireRole("customer"), qtyChange);
router.delete("/remove", authenticate, requireRole("customer"), removeFromCart);
router.delete("/clear", authenticate, requireRole("customer"), clearMyCart);

export default router;
