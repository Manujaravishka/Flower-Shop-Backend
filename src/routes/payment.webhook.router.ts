import { Router, Request, Response } from "express";
import PaymentModel, { PaymentStatus } from "../model/payment.modal";
import OrderModel, { OrderStatus } from "../model/Order.modal";
import { sendEmail, templates } from "../util/mail";
import Customer from "../model/customer.modal";

const router = Router();

const verifyGatewaySignature = (req: Request): boolean => {
    const signature = req.headers["x-gateway-signature"];
    const expected = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!expected) return false;
    return typeof signature === "string" && signature === expected;
};

router.post("/webhook", async (req: Request, res: Response) => {
    try {
        if (!verifyGatewaySignature(req)) {
            return res.status(401).json({ success: false, message: "Invalid signature" });
        }

        const { paymentId, orderId, status, transactionId } = req.body as {
            paymentId?: string;
            orderId?: string;
            status?: string;
            transactionId?: string;
        };

        if (!paymentId && !orderId) {
            return res.status(400).json({ success: false, message: "paymentId or orderId is required" });
        }

        let payment = paymentId
            ? await PaymentModel.findById(paymentId)
            : await PaymentModel.findOne({ orderId });

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment not found" });
        }

        if (status && Object.values(PaymentStatus).includes(status as PaymentStatus)) {
            payment.status = status as PaymentStatus;
        }
        if (transactionId) payment.transactionId = transactionId;
        await payment.save();

        if (payment.status === PaymentStatus.COMPLETED) {
            await OrderModel.findByIdAndUpdate(payment.orderId, {
                status: OrderStatus.PROCESSING,
            });
        } else if (payment.status === PaymentStatus.FAILED) {
            await OrderModel.findByIdAndUpdate(payment.orderId, {
                status: OrderStatus.PENDING,
            });
        }

        if (payment.customerId) {
            const customer = await Customer.findById(payment.customerId);
            if (customer?.email) {
                try {
                    await sendEmail({
                        to: customer.email,
                        subject: "Payment Update",
                        html: `<p>Your payment for order <strong>${payment.orderId}</strong> is now: <strong>${payment.status}</strong>.</p>`,
                    });
                } catch (err) {
                    console.warn("Payment webhook email failed:", err);
                }
            }
        }

        return res.status(200).json({ success: true, message: "Webhook processed" });
    } catch (err) {
        console.error("Payment webhook error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

export default router;
