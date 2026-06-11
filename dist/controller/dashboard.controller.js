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
exports.getTopProducts = exports.getOrderStatusBreakdown = exports.getRevenueByMonth = exports.getAllStats = void 0;
const customer_modal_1 = __importDefault(require("../model/customer.modal"));
const gift_modal_1 = __importDefault(require("../model/gift.modal"));
const Order_modal_1 = __importStar(require("../model/Order.modal"));
const payment_modal_1 = __importStar(require("../model/payment.modal"));
const getAllStats = async (_req, res) => {
    try {
        const [totalCustomers, totalProducts, totalActiveOrders, totalOrders, totalPayments] = await Promise.all([
            customer_modal_1.default.countDocuments({ isActive: true }),
            gift_modal_1.default.countDocuments({ isActive: true }),
            Order_modal_1.default.countDocuments({
                status: {
                    $in: [Order_modal_1.OrderStatus.PENDING, Order_modal_1.OrderStatus.SHIPPED, Order_modal_1.OrderStatus.PROCESSING],
                },
            }),
            Order_modal_1.default.countDocuments(),
            payment_modal_1.default.countDocuments({ status: payment_modal_1.PaymentStatus.COMPLETED }),
        ]);
        const revenueAgg = await Order_modal_1.default.aggregate([
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
    }
    catch (err) {
        console.error("Dashboard stats error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getAllStats = getAllStats;
const getRevenueByMonth = async (_req, res) => {
    try {
        const result = await Order_modal_1.default.aggregate([
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
    }
    catch (err) {
        console.error("Revenue by month error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getRevenueByMonth = getRevenueByMonth;
const getOrderStatusBreakdown = async (_req, res) => {
    try {
        const result = await Order_modal_1.default.aggregate([
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
    }
    catch (err) {
        console.error("Order status breakdown error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getOrderStatusBreakdown = getOrderStatusBreakdown;
const getTopProducts = async (req, res) => {
    try {
        const limit = Math.min(20, Math.max(1, Number(req.query?.limit) || 5));
        const result = await Order_modal_1.default.aggregate([
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
    }
    catch (err) {
        console.error("Top products error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getTopProducts = getTopProducts;
