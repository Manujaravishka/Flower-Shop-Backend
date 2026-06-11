import { Request, Response } from "express";
import mongoose from "mongoose";
import PaymentModel, {
    PaymentStatus,
    PaymentMethod,
    PaymentGateway,
} from "../model/payment.modal";
import OrderModel from "../model/Order.modal";
import { AuthRequest } from "../middleware/auth";

const assertPaymentOwnership = async (
    req: Request,
    res: Response,
    paymentCustomerId?: mongoose.Types.ObjectId | null
): Promise<boolean> => {
    const principal = (req as AuthRequest).user;
    if (!principal) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return false;
    }
    if (principal.role === "admin" || principal.role === "superadmin") return true;
    if (principal.type === "customer" &&
        paymentCustomerId &&
        paymentCustomerId.toString() === principal.sub) {
        return true;
    }
    res.status(403).json({ success: false, message: "Forbidden" });
    return false;
};

export const processPayment = async (req: Request, res: Response) => {
    const { orderId, amount: rawAmount, discount, paymentMethod, transactionId, gateway, notes } = req.body as {
        orderId?: string;
        amount?: unknown;
        discount?: number;
        paymentMethod?: string;
        transactionId?: string;
        gateway?: string;
        notes?: string;
    };

    const amount = typeof rawAmount === "string" ? parseFloat(rawAmount) : (rawAmount as number);

    if (!orderId || !amount || !paymentMethod) {
        return res.status(400).json({
            success: false,
            message: "Missing required payment fields",
        });
    }

    if (!Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) {
        return res.status(400).json({
            success: false,
            message: `Invalid payment method. Allowed: ${Object.values(PaymentMethod).join(", ")}`,
        });
    }

    if (amount <= 0) {
        return res.status(400).json({
            success: false,
            message: "Amount must be positive",
        });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ success: false, message: "Invalid orderId" });
    }

    try {
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (!(await assertPaymentOwnership(req, res, order.customerId))) return;

        const principal = (req as AuthRequest).user;
        const isAdmin = principal?.role === "admin" || principal?.role === "superadmin";

        const payment = await PaymentModel.create({
            orderId: new mongoose.Types.ObjectId(orderId),
            customerId: order.customerId,
            processedBy: isAdmin && principal?.sub
                ? new mongoose.Types.ObjectId(principal.sub)
                : undefined,
            amount,
            discount: discount ?? 0,
            status: PaymentStatus.PENDING,
            paymentMethod: paymentMethod as PaymentMethod,
            gateway: (gateway as PaymentGateway) || PaymentGateway.MANUAL,
            transactionId: transactionId || undefined,
            notes,
        });

        return res.status(201).json({
            success: true,
            message: "Payment processed successfully",
            data: payment,
        });
    } catch (err) {
        console.error("Process payment error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updatePaymentStatus = async (req: Request, res: Response) => {
    const paymentId = (req.params as { id?: string }).id || (req.body as { paymentId?: string }).paymentId;
    const { status } = req.body as {
        status?: string;
    };

    if (!paymentId) {
        return res.status(404).json({
            success: false,
            message: "Payment ID is required",
        });
    }

    if (!status || !Object.values(PaymentStatus).includes(status as PaymentStatus)) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Allowed: ${Object.values(PaymentStatus).join(", ")}`,
        });
    }

    try {
        const payment = await PaymentModel.findById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }

        payment.status = status as PaymentStatus;
        await payment.save();

        return res.status(200).json({
            success: true,
            message: "Payment status updated successfully",
            data: payment,
        });
    } catch (err) {
        console.error("Update payment status error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const deletePayment = async (req: Request, res: Response) => {
    const paymentId = (req.params as { id?: string }).id || (req.body as { paymentId?: string }).paymentId;

    if (!paymentId) {
        return res.status(400).json({
            success: false,
            message: "Payment ID is required",
        });
    }

    try {
        const payment = await PaymentModel.findByIdAndDelete(paymentId);
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
    } catch (err) {
        console.error("Delete payment error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getMyPayments = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const { page, limit } = req.query as { page?: string; limit?: string };
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [payments, total] = await Promise.all([
            PaymentModel.find({ customerId: principal.sub })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            PaymentModel.countDocuments({ customerId: principal.sub }),
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
    } catch (err) {
        console.error("Get my payments error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
