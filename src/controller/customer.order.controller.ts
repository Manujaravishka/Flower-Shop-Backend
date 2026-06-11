import { Request, Response } from "express";
import OrderModel, { OrderStatus } from "../model/Order.modal";
import { AuthRequest } from "../middleware/auth";

export const getMyOrders = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const { page, limit, status } = req.query as {
            page?: string;
            limit?: string;
            status?: string;
        };

        const filter: Record<string, unknown> = { customerId: principal.sub };
        if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
            filter.status = status;
        }

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [orders, total] = await Promise.all([
            OrderModel.find(filter).sort({ orderDate: -1 }).skip(skip).limit(limitNum),
            OrderModel.countDocuments(filter),
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
    } catch (err) {
        console.error("Get my orders error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getMyOrderById = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const { orderId } = req.params as { orderId?: string };
        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required" });
        }

        const order = await OrderModel.findById(orderId);
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
    } catch (err) {
        console.error("Get my order by id error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const cancelMyOrder = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const { orderId } = req.params as { orderId?: string };
        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required" });
        }

        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.customerId.toString() !== principal.sub) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PROCESSING) {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled in status: ${order.status}`,
            });
        }

        order.status = OrderStatus.CANCELLED;
        order.cancelledAt = new Date();
        order.statusHistory.push({
            status: OrderStatus.CANCELLED,
            at: new Date(),
            note: "Cancelled by customer",
        });
        await order.save();

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            data: order,
        });
    } catch (err) {
        console.error("Cancel my order error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
