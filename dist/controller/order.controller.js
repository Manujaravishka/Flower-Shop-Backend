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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllOrders = exports.getMyOrders = exports.deleteOrder = exports.updateOrderStatus = exports.getOrders = exports.createOrder = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Order_modal_1 = __importStar(require("../model/Order.modal"));
const customer_modal_1 = __importDefault(require("../model/customer.modal"));
const mail_1 = require("../util/mail");
const gift_modal_1 = __importDefault(require("../model/gift.modal"));
const assertOrderOwnership = async (req, res, order) => {
    const principal = req.user;
    if (!principal) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return false;
    }
    if (principal.role === "admin" || principal.role === "superadmin")
        return true;
    if (principal.type === "customer" && order.customerId.toString() === principal.sub) {
        return true;
    }
    res.status(403).json({ success: false, message: "Forbidden" });
    return false;
};
const computeOrderTotals = async (items) => {
    const resolved = [];
    let totalAmount = 0;
    let discountAmount = 0;
    for (const item of items) {
        if (!mongoose_1.default.Types.ObjectId.isValid(item.productId))
            return null;
        const qty = typeof item.quantity === "string" ? parseInt(item.quantity, 10) : item.quantity;
        if (!Number.isInteger(qty) || qty < 1)
            return null;
        const gift = await gift_modal_1.default.findById(item.productId);
        if (!gift || !gift.isActive)
            return null;
        const linePrice = gift.price;
        const lineDiscount = item.discount ?? 0;
        const lineTotal = (linePrice - lineDiscount) * qty;
        if (lineTotal < 0)
            return null;
        totalAmount += lineTotal;
        discountAmount += lineDiscount * qty;
        resolved.push({
            productId: new mongoose_1.default.Types.ObjectId(item.productId),
            quantity: qty,
            price: linePrice,
            discount: lineDiscount,
        });
    }
    return { items: resolved, totalAmount, discountAmount };
};
const createOrder = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const { items, shippingAddress, notes, customerId: bodyCustomerId, totalAmount: totalAmountHint } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Item details are required",
            });
        }
        const customerId = bodyCustomerId || principal.sub;
        if (principal.type === "customer" && bodyCustomerId && bodyCustomerId !== principal.sub) {
            return res.status(403).json({ success: false, message: "Cannot create order for another customer" });
        }
        const computed = await computeOrderTotals(items);
        if (!computed) {
            return res.status(400).json({
                success: false,
                message: "Invalid items or product not available",
            });
        }
        if (typeof totalAmountHint === "number" &&
            Math.abs(totalAmountHint - computed.totalAmount) > 0.01) {
            return res.status(400).json({
                success: false,
                message: "Provided totalAmount does not match computed total",
            });
        }
        const customer = await customer_modal_1.default.findById(customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }
        const order = await Order_modal_1.default.create({
            customerId: new mongoose_1.default.Types.ObjectId(customerId),
            items: computed.items,
            totalAmount: computed.totalAmount,
            discountAmount: computed.discountAmount,
            orderDate: new Date(),
            status: Order_modal_1.OrderStatus.PENDING,
            statusHistory: [
                {
                    status: Order_modal_1.OrderStatus.PENDING,
                    at: new Date(),
                    note: "Order created",
                },
            ],
            shippingAddress,
            notes,
        });
        customer.orders.push(order._id);
        await customer.save();
        try {
            await (0, mail_1.sendEmail)({
                to: customer.email,
                ...mail_1.templates.orderConfirmation(order._id.toString(), computed.totalAmount),
            });
        }
        catch (mailErr) {
            console.warn("Order confirmation email failed:", mailErr);
        }
        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: order,
        });
    }
    catch (err) {
        console.error("Create order error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.createOrder = createOrder;
const getOrders = async (req, res) => {
    const orderId = req.params.id ||
        req.query.orderId ||
        req.body.orderId;
    if (!orderId) {
        return res.status(400).json({
            success: false,
            message: "Order ID is required",
        });
    }
    try {
        const order = await Order_modal_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }
        if (!(await assertOrderOwnership(req, res, order)))
            return;
        return res.status(200).json({
            success: true,
            data: order,
        });
    }
    catch (err) {
        console.error("Get order error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getOrders = getOrders;
const updateOrderStatus = async (req, res) => {
    const orderId = req.params.id || req.body.orderId;
    const { status, note } = req.body;
    if (!orderId || !status) {
        return res.status(400).json({
            success: false,
            message: "Order ID and status are required",
        });
    }
    if (!Object.values(Order_modal_1.OrderStatus).includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Allowed: ${Object.values(Order_modal_1.OrderStatus).join(", ")}`,
        });
    }
    try {
        const principal = req.user;
        const order = await Order_modal_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }
        const currentStatus = order.status;
        const newStatus = status;
        const validTransitions = {
            [Order_modal_1.OrderStatus.PENDING]: [Order_modal_1.OrderStatus.PROCESSING, Order_modal_1.OrderStatus.CANCELLED],
            [Order_modal_1.OrderStatus.PROCESSING]: [Order_modal_1.OrderStatus.SHIPPED, Order_modal_1.OrderStatus.CANCELLED],
            [Order_modal_1.OrderStatus.SHIPPED]: [Order_modal_1.OrderStatus.DELIVERED],
            [Order_modal_1.OrderStatus.DELIVERED]: [],
            [Order_modal_1.OrderStatus.CANCELLED]: [],
        };
        const allowed = validTransitions[currentStatus];
        if (!allowed || !allowed.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: `Cannot transition from '${currentStatus}' to '${newStatus}'`,
            });
        }
        order.status = newStatus;
        order.statusHistory.push({
            status: newStatus,
            changedBy: principal?.sub
                ? new mongoose_1.default.Types.ObjectId(principal.sub)
                : undefined,
            at: new Date(),
            note,
        });
        if (newStatus === Order_modal_1.OrderStatus.CANCELLED)
            order.cancelledAt = new Date();
        if (newStatus === Order_modal_1.OrderStatus.DELIVERED)
            order.deliveredAt = new Date();
        const newOrder = await order.save();
        const cus = await customer_modal_1.default.findById(newOrder.customerId);
        if (cus && cus.email) {
            try {
                await (0, mail_1.sendEmail)({
                    to: cus.email,
                    ...mail_1.templates.orderStatusUpdate(orderId, newStatus),
                });
            }
            catch (mailErr) {
                console.warn("Status email failed to send:", mailErr);
            }
        }
        return res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            data: newOrder,
        });
    }
    catch (err) {
        console.error("Update order status error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const deleteOrder = async (req, res) => {
    try {
        const orderId = req.params.id ||
            req.query.orderId ||
            req.body.orderId;
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required",
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid orderId" });
        }
        const order = await Order_modal_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }
        if (!(await assertOrderOwnership(req, res, order)))
            return;
        await Order_modal_1.default.findByIdAndDelete(orderId);
        return res.status(200).json({
            success: true,
            message: "Order deleted successfully",
        });
    }
    catch (err) {
        console.error("Delete order error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.deleteOrder = deleteOrder;
const getMyOrders = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        if (principal.type === "customer") {
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
        return (0, exports.getAllOrders)(req, res);
    }
    catch (err) {
        console.error("Get my orders error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getMyOrders = getMyOrders;
const getAllOrders = async (_req, res) => {
    try {
        const { page, limit, status } = _req.query;
        const filter = {};
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
        const allGiftIds = [
            ...new Set(orders.flatMap((o) => o.items.map((i) => i.productId.toString()))),
        ];
        const gifts = await gift_modal_1.default.find({ _id: { $in: allGiftIds } });
        const giftMap = new Map(gifts.map((g) => [g._id.toString(), g.name]));
        const ordersDetails = orders.map((order) => {
            const itemsDetails = order.items.map((item) => ({
                giftName: giftMap.get(item.productId.toString()) ?? "[deleted product]",
                giftQty: item.quantity,
            }));
            return {
                _id: order._id,
                customerId: order.customerId,
                items: itemsDetails,
                totalAmount: order.totalAmount,
                orderDate: order.orderDate,
                status: order.status,
            };
        });
        return res.status(200).json({
            success: true,
            data: ordersDetails,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (err) {
        console.error("Get all orders error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getAllOrders = getAllOrders;
