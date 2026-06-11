import { Router } from "express";
import {
    deletePayment,
    processPayment,
    updatePaymentStatus,
    getMyPayments,
} from "../controller/payment.controller";
import { authenticate } from "../middleware/auth";
import { requireAdmin, requireRole } from "../middleware/requireRole";

const paymentRouter = Router();

paymentRouter.post(
    "/process",
    authenticate,
    requireRole("customer", "admin", "superadmin"),
    processPayment
);
paymentRouter.put("/:id/status", authenticate, requireAdmin, updatePaymentStatus);
paymentRouter.put("/update-status", authenticate, requireAdmin, updatePaymentStatus);
paymentRouter.delete("/:id", authenticate, requireAdmin, deletePayment);
paymentRouter.get("/me", authenticate, requireRole("customer"), getMyPayments);

export default paymentRouter;

