import { Router, Request, Response, NextFunction } from "express";
import {
    createOrder,
    getAllOrders,
    getOrders,
    updateOrderStatus,
    deleteOrder,
    getMyOrders,
} from "../controller/order.controller";
import { authenticate } from "../middleware/auth";
import { requireAdmin, requireRole } from "../middleware/requireRole";
import { validateObjectIdParam } from "../middleware/validations";
import { upload } from "../middleware/upload";

const orderRouter = Router();

const conditionalFormData = (req: Request, _res: Response, next: NextFunction) => {
    if (req.headers["content-type"]?.includes("multipart/form-data")) {
        upload.none()(req, _res, (err) => {
            if (err) return next(err);
            next();
        });
    } else {
        next();
    }
};

orderRouter.post("/create", authenticate, requireRole("customer"), conditionalFormData, createOrder);
orderRouter.put("/:id/status", authenticate, requireAdmin, validateObjectIdParam("id"), updateOrderStatus);
orderRouter.get("/all", authenticate, requireAdmin, getAllOrders);
orderRouter.get("/mine", authenticate, getMyOrders);
orderRouter.get("/:id", authenticate, validateObjectIdParam("id"), getOrders);
orderRouter.delete("/:id", authenticate, requireAdmin, validateObjectIdParam("id"), deleteOrder);

export default orderRouter;

