import { Request, Response } from "express";
import mongoose from "mongoose";
import OrderModel, { OrderStatus, IOrder } from "../model/Order.modal";
import Customer from "../model/customer.modal";
import { sendEmail, templates } from "../util/mail";
import Gift from "../model/gift.modal";
import { AuthRequest } from "../middleware/auth";

const assertOrderOwnership = async (
    req: Request,
    res: Response,
    order: IOrder
): Promise<boolean> => {
    const principal = (req as AuthRequest).user;
    if (!principal) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return false;
    }
    if (principal.role === "admin" || principal.role === "superadmin") return true;
    if (principal.type === "customer" && order.customerId.toString() === principal.sub) {
        return true;
    }
    res.status(403).json({ success: false, message: "Forbidden" });
    return false;
};

const computeOrderTotals = async (
    items: Array<{ productId: string; quantity: number; discount?: number }>
): Promise<{ items: IOrder["items"]; totalAmount: number; discountAmount: number } | null> => {
    const resolved: IOrder["items"] = [];
    let totalAmount = 0;
    let discountAmount = 0;

    for (const item of items) {
        if (!mongoose.Types.ObjectId.isValid(item.productId)) return null;
        const qty = typeof item.quantity === "string" ? parseInt(item.quantity, 10) : item.quantity;
        if (!Number.isInteger(qty) || qty < 1) return null;

        const gift = await Gift.findById(item.productId);
        if (!gift || !gift.isActive) return null;

        const linePrice = gift.price;
        const lineDiscount = item.discount ?? 0;
        const lineTotal = (linePrice - lineDiscount) * qty;

        if (lineTotal < 0) return null;

        totalAmount += lineTotal;
        discountAmount += lineDiscount * qty;

        resolved.push({
            productId: new mongoose.Types.ObjectId(item.productId),
            quantity: qty,
            price: linePrice,
            discount: lineDiscount,
        });
    }

    return { items: resolved, totalAmount, discountAmount };
};

export const createOrder = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const { items, shippingAddress, notes, customerId: bodyCustomerId, totalAmount: totalAmountHint } = req.body as {
            items?: Array<{ productId: string; quantity: number; discount?: number }>;
            shippingAddress?: string;
            notes?: string;
            customerId?: string;
            totalAmount?: number;
        };

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

        if (
            typeof totalAmountHint === "number" &&
            Math.abs(totalAmountHint - computed.totalAmount) > 0.01
        ) {
            return res.status(400).json({
                success: false,
                message: "Provided totalAmount does not match computed total",
            });
        }

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const order = await OrderModel.create({
            customerId: new mongoose.Types.ObjectId(customerId),
            items: computed.items,
            totalAmount: computed.totalAmount,
            discountAmount: computed.discountAmount,
            orderDate: new Date(),
            status: OrderStatus.PENDING,
            statusHistory: [
                {
                    status: OrderStatus.PENDING,
                    at: new Date(),
                    note: "Order created",
                },
            ],
            shippingAddress,
            notes,
        });

        customer.orders.push(order._id as mongoose.Types.ObjectId);
        await customer.save();

        try {
            await sendEmail({
                to: customer.email,
                ...templates.orderConfirmation(order._id.toString(), computed.totalAmount),
            });
        } catch (mailErr) {
            console.warn("Order confirmation email failed:", mailErr);
        }

        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: order,
        });
    } catch (err) {
        console.error("Create order error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getOrders = async (req: Request, res: Response) => {
    const orderId =
        (req.params as { id?: string }).id ||
        (req.query as { orderId?: string }).orderId ||
        (req.body as { orderId?: string }).orderId;

    if (!orderId) {
        return res.status(400).json({
            success: false,
            message: "Order ID is required",
        });
    }

    try {
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        if (!(await assertOrderOwnership(req, res, order))) return;

        return res.status(200).json({
            success: true,
            data: order,
        });
    } catch (err) {
        console.error("Get order error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    const orderId = (req.params as { id?: string }).id || (req.body as { orderId?: string }).orderId;
    const { status, note } = req.body as {
        status?: string;
        note?: string;
    };

    if (!orderId || !status) {
        return res.status(400).json({
            success: false,
            message: "Order ID and status are required",
        });
    }

    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Allowed: ${Object.values(OrderStatus).join(", ")}`,
        });
    }

    try {
        const principal = (req as AuthRequest).user;
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        const currentStatus = order.status;
        const newStatus = status as OrderStatus;

        const validTransitions: Record<string, string[]> = {
            [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
            [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
            [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
            [OrderStatus.DELIVERED]: [],
            [OrderStatus.CANCELLED]: [],
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
                ? new mongoose.Types.ObjectId(principal.sub)
                : undefined,
            at: new Date(),
            note,
        });

        if (newStatus === OrderStatus.CANCELLED) order.cancelledAt = new Date();
        if (newStatus === OrderStatus.DELIVERED) order.deliveredAt = new Date();

        const newOrder = await order.save();

        const cus = await Customer.findById(newOrder.customerId);
        if (cus && cus.email) {
            try {
                await sendEmail({
                    to: cus.email,
                    ...templates.orderStatusUpdate(orderId, newStatus),
                });
            } catch (mailErr) {
                console.warn("Status email failed to send:", mailErr);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            data: newOrder,
        });
    } catch (err) {
        console.error("Update order status error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const deleteOrder = async (req: Request, res: Response) => {
    try {
        const orderId =
            (req.params as { id?: string }).id ||
            (req.query as { orderId?: string }).orderId ||
            (req.body as { orderId?: string }).orderId;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required",
            });
        }
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid orderId" });
        }

        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        if (!(await assertOrderOwnership(req, res, order))) return;

        await OrderModel.findByIdAndDelete(orderId);
        return res.status(200).json({
            success: true,
            message: "Order deleted successfully",
        });
    } catch (err) {
        console.error("Delete order error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getMyOrders = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        if (principal.type === "customer") {
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
        }

        return getAllOrders(req, res);
    } catch (err) {
        console.error("Get my orders error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getAllOrders = async (_req: Request, res: Response) => {
    try {
        const { page, limit, status } = _req.query as {
            page?: string;
            limit?: string;
            status?: string;
        };

        const filter: Record<string, unknown> = {};
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

        const allGiftIds = [
            ...new Set(
                orders.flatMap((o) =>
                    o.items.map((i) => i.productId.toString())
                )
            ),
        ];
        const gifts = await Gift.find({ _id: { $in: allGiftIds } });
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
    } catch (err) {
        console.error("Get all orders error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
