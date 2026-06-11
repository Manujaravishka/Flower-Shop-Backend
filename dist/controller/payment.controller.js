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
exports.getMyPayments = exports.deletePayment = exports.updatePaymentStatus = exports.processPayment = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const payment_modal_1 = __importStar(require("../model/payment.modal"));
const Order_modal_1 = __importDefault(require("../model/Order.modal"));
const assertPaymentOwnership = async (req, res, paymentCustomerId) => {
    const principal = req.user;
    if (!principal) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return false;
    }
    if (principal.role === "admin" || principal.role === "superadmin")
        return true;
    if (principal.type === "customer" &&
        paymentCustomerId &&
        paymentCustomerId.toString() === principal.sub) {
        return true;
    }
    res.status(403).json({ success: false, message: "Forbidden" });
    return false;
};
const processPayment = async (req, res) => {
    const { orderId, amount: rawAmount, discount, paymentMethod, transactionId, gateway, notes } = req.body;
    const amount = typeof rawAmount === "string" ? parseFloat(rawAmount) : rawAmount;
    if (!orderId || !amount || !paymentMethod) {
        return res.status(400).json({
            success: false,
            message: "Missing required payment fields",
        });
    }
    if (!Object.values(payment_modal_1.PaymentMethod).includes(paymentMethod)) {
        return res.status(400).json({
            success: false,
            message: `Invalid payment method. Allowed: ${Object.values(payment_modal_1.PaymentMethod).join(", ")}`,
        });
    }
    if (amount <= 0) {
        return res.status(400).json({
            success: false,
            message: "Amount must be positive",
        });
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ success: false, message: "Invalid orderId" });
    }
    try {
        const order = await Order_modal_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        if (!(await assertPaymentOwnership(req, res, order.customerId)))
            return;
        const principal = req.user;
        const isAdmin = principal?.role === "admin" || principal?.role === "superadmin";
        const payment = await payment_modal_1.default.create({
            orderId: new mongoose_1.default.Types.ObjectId(orderId),
            customerId: order.customerId,
            processedBy: isAdmin && principal?.sub
                ? new mongoose_1.default.Types.ObjectId(principal.sub)
                : undefined,
            amount,
            discount: discount ?? 0,
            status: payment_modal_1.PaymentStatus.PENDING,
            paymentMethod: paymentMethod,
            gateway: gateway || payment_modal_1.PaymentGateway.MANUAL,
            transactionId: transactionId || undefined,
            notes,
        });
        return res.status(201).json({
            success: true,
            message: "Payment processed successfully",
            data: payment,
        });
    }
    catch (err) {
        console.error("Process payment error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.processPayment = processPayment;
const updatePaymentStatus = async (req, res) => {
    const paymentId = req.params.id || req.body.paymentId;
    const { status } = req.body;
    if (!paymentId) {
        return res.status(404).json({
            success: false,
            message: "Payment ID is required",
        });
    }
    if (!status || !Object.values(payment_modal_1.PaymentStatus).includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Allowed: ${Object.values(payment_modal_1.PaymentStatus).join(", ")}`,
        });
    }
    try {
        const payment = await payment_modal_1.default.findById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }
        payment.status = status;
        await payment.save();
        return res.status(200).json({
            success: true,
            message: "Payment status updated successfully",
            data: payment,
        });
    }
    catch (err) {
        console.error("Update payment status error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.updatePaymentStatus = updatePaymentStatus;
const deletePayment = async (req, res) => {
    const paymentId = req.params.id || req.body.paymentId;
    if (!paymentId) {
        return res.status(400).json({
            success: false,
            message: "Payment ID is required",
        });
    }
    try {
        const payment = await payment_modal_1.default.findByIdAndDelete(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Payment deleted successfully",
        });
    }
    catch (err) {
        console.error("Delete payment error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.deletePayment = deletePayment;
const getMyPayments = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const { page, limit } = req.query;
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        const [payments, total] = await Promise.all([
            payment_modal_1.default.find({ customerId: principal.sub })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            payment_modal_1.default.countDocuments({ customerId: principal.sub }),
        ]);
        return res.status(200).json({
            success: true,
            data: payments,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (err) {
        console.error("Get my payments error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getMyPayments = getMyPayments;
