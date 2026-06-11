"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = require("../controller/order.controller");
const auth_1 = require("../middleware/auth");
const requireRole_1 = require("../middleware/requireRole");
const validations_1 = require("../middleware/validations");
const upload_1 = require("../middleware/upload");
const orderRouter = (0, express_1.Router)();
const conditionalFormData = (req, _res, next) => {
    if (req.headers["content-type"]?.includes("multipart/form-data")) {
        upload_1.upload.none()(req, _res, (err) => {
            if (err)
                return next(err);
            next();
        });
    }
    else {
        next();
    }
};
orderRouter.post("/create", auth_1.authenticate, (0, requireRole_1.requireRole)("customer"), conditionalFormData, order_controller_1.createOrder);
orderRouter.put("/:id/status", auth_1.authenticate, requireRole_1.requireAdmin, (0, validations_1.validateObjectIdParam)("id"), order_controller_1.updateOrderStatus);
orderRouter.get("/all", auth_1.authenticate, requireRole_1.requireAdmin, order_controller_1.getAllOrders);
orderRouter.get("/mine", auth_1.authenticate, order_controller_1.getMyOrders);
orderRouter.get("/:id", auth_1.authenticate, (0, validations_1.validateObjectIdParam)("id"), order_controller_1.getOrders);
orderRouter.delete("/:id", auth_1.authenticate, requireRole_1.requireAdmin, (0, validations_1.validateObjectIdParam)("id"), order_controller_1.deleteOrder);
exports.default = orderRouter;
