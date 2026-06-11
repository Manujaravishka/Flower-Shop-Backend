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
const express_1 = require("express");
const payment_modal_1 = __importStar(require("../model/payment.modal"));
const Order_modal_1 = __importStar(require("../model/Order.modal"));
const mail_1 = require("../util/mail");
const customer_modal_1 = __importDefault(require("../model/customer.modal"));
const router = (0, express_1.Router)();
const verifyGatewaySignature = (req) => {
    const signature = req.headers["x-gateway-signature"];
    const expected = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!expected)
        return false;
    return typeof signature === "string" && signature === expected;
};
router.post("/webhook", async (req, res) => {
    try {
        if (!verifyGatewaySignature(req)) {
            return res.status(401).json({ success: false, message: "Invalid signature" });
        }
        const { paymentId, orderId, status, transactionId } = req.body;
        if (!paymentId && !orderId) {
            return res.status(400).json({ success: false, message: "paymentId or orderId is required" });
        }
        let payment = paymentId
            ? await payment_modal_1.default.findById(paymentId)
            : await payment_modal_1.default.findOne({ orderId });
        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment not found" });
        }
        if (status && Object.values(payment_modal_1.PaymentStatus).includes(status)) {
            payment.status = status;
        }
        if (transactionId)
            payment.transactionId = transactionId;
        await payment.save();
        if (payment.status === payment_modal_1.PaymentStatus.COMPLETED) {
            await Order_modal_1.default.findByIdAndUpdate(payment.orderId, {
                status: Order_modal_1.OrderStatus.PROCESSING,
            });
        }
        else if (payment.status === payment_modal_1.PaymentStatus.FAILED) {
            await Order_modal_1.default.findByIdAndUpdate(payment.orderId, {
                status: Order_modal_1.OrderStatus.PENDING,
            });
        }
        if (payment.customerId) {
            const customer = await customer_modal_1.default.findById(payment.customerId);
            if (customer?.email) {
                try {
                    await (0, mail_1.sendEmail)({
                        to: customer.email,
                        subject: "Payment Update",
                        html: `<p>Your payment for order <strong>${payment.orderId}</strong> is now: <strong>${payment.status}</strong>.</p>`,
                    });
                }
                catch (err) {
                    console.warn("Payment webhook email failed:", err);
                }
            }
        }
        return res.status(200).json({ success: true, message: "Webhook processed" });
    }
    catch (err) {
        console.error("Payment webhook error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.default = router;
