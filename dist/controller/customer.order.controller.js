"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelMyOrder = exports.getMyOrderById = exports.getMyOrders = void 0;
const Order_modal_1 = __importStar(require("../model/Order.modal"));
const getMyOrders = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const { page, limit, status } = req.query;
        const filter = { customerId: principal.sub };
        if (status && Object.values(Order_modal_1.OrderStatus).includes(status)) {
            filter.status = status;
        }
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        const [orders, total] = await Promise.all([
            Order_modal_1.default.find(filter).sort({ orderDate: -1 }).skip(skip).limit(limitNum),
            Order_modal_1.default.countDocuments(filter),
        ]);
        return res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (err) {
        console.error("Get my orders error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.getMyOrders = getMyOrders;
const getMyOrderById = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required" });
        }
        const order = await Order_modal_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        if (order.customerId.toString() !== principal.sub) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }
        return res.status(200).json({
            success: true,
            data: order,
        });
    }
    catch (err) {
        console.error("Get my order by id error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.getMyOrderById = getMyOrderById;
const cancelMyOrder = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required" });
        }
        const order = await Order_modal_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        if (order.customerId.toString() !== principal.sub) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }
        if (order.status !== Order_modal_1.OrderStatus.PENDING && order.status !== Order_modal_1.OrderStatus.PROCESSING) {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled in status: ${order.status}`,
            });
        }
        order.status = Order_modal_1.OrderStatus.CANCELLED;
        order.cancelledAt = new Date();
        order.statusHistory.push({
            status: Order_modal_1.OrderStatus.CANCELLED,
            at: new Date(),
            note: "Cancelled by customer",
        });
        await order.save();
        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            data: order,
        });
    }
    catch (err) {
        console.error("Cancel my order error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.cancelMyOrder = cancelMyOrder;
