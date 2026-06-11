import { Router } from "express";
import {
    getAllStats,
    getRevenueByMonth,
    getOrderStatusBreakdown,
    getTopProducts,
} from "../controller/dashboard.controller";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireRole";

const router = Router();

router.get("/stats", authenticate, requireAdmin, getAllStats);
router.get("/revenue-by-month", authenticate, requireAdmin, getRevenueByMonth);
router.get("/order-status-breakdown", authenticate, requireAdmin, getOrderStatusBreakdown);
router.get("/top-products", authenticate, requireAdmin, getTopProducts);

export default router;
