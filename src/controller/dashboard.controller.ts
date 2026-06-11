import { Request, Response } from "express";
import Customer from "../model/customer.modal";
import Gift from "../model/gift.modal";
import OrderModel, { OrderStatus } from "../model/Order.modal";
import PaymentModel, { PaymentStatus } from "../model/payment.modal";

export const getAllStats = async (_req: Request, res: Response) => {
    try {
        const [totalCustomers, totalProducts, totalActiveOrders, totalOrders, totalPayments] = await Promise.all([
            Customer.countDocuments({ isActive: true }),
            Gift.countDocuments({ isActive: true }),
            OrderModel.countDocuments({
                status: {
                    $in: [OrderStatus.PENDING, OrderStatus.SHIPPED, OrderStatus.PROCESSING],
                },
            }),
            OrderModel.countDocuments(),
            PaymentModel.countDocuments({ status: PaymentStatus.COMPLETED }),
        ]);

        const revenueAgg = await OrderModel.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    totalDiscount: { $sum: "$discountAmount" },
                },
            },
        ]);

        const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
        const totalDiscount = revenueAgg[0]?.totalDiscount || 0;

        return res.status(200).json({
            success: true,
            data: {
                totalCustomers,
                totalProducts,
                totalActiveOrders,
                totalOrders,
                totalCompletedPayments: totalPayments,
                totalRevenue,
                totalDiscount,
            },
        });
    } catch (err) {
        console.error("Dashboard stats error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getRevenueByMonth = async (_req: Request, res: Response) => {
    try {
        const result = await OrderModel.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$orderDate" },
                        month: { $month: "$orderDate" },
                    },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 },
        ]);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        console.error("Revenue by month error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getOrderStatusBreakdown = async (_req: Request, res: Response) => {
    try {
        const result = await OrderModel.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        console.error("Order status breakdown error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getTopProducts = async (req: Request, res: Response) => {
    try {
        const limit = Math.min(20, Math.max(1, Number(req.query?.limit) || 5));

        const result = await OrderModel.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    totalSold: { $sum: "$items.quantity" },
                    revenue: {
                        $sum: { $multiply: ["$items.price", "$items.quantity"] },
                    },
                },
            },
            { $sort: { totalSold: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: "gifts",
                    localField: "_id",
                    foreignField: "_id",
                    as: "gift",
                },
            },
            {
                $project: {
                    productId: "$_id",
                    totalSold: 1,
                    revenue: 1,
                    name: { $arrayElemAt: ["$gift.name", 0] },
                },
            },
        ]);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        console.error("Top products error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
