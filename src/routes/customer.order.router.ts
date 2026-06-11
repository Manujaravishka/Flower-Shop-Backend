import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import {
    getMyOrders,
    getMyOrderById,
    cancelMyOrder,
} from "../controller/customer.order.controller";
import { validateObjectIdParam } from "../middleware/validations";

const router = Router();

router.get("/orders", authenticate, requireRole("customer"), getMyOrders);
router.get(
    "/orders/:orderId",
    authenticate,
    requireRole("customer"),
    validateObjectIdParam("orderId"),
    getMyOrderById
);
router.post(
    "/orders/:orderId/cancel",
    authenticate,
    requireRole("customer"),
    validateObjectIdParam("orderId"),
    cancelMyOrder
);

export default router;
