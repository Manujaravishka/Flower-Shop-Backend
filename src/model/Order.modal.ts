import mongoose, { Document, Schema, Types } from "mongoose";

export enum OrderStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
}

export interface OrderItem {
    productId: Types.ObjectId;
    quantity: number;
    price: number;
    discount: number;
}

export interface OrderStatusHistoryEntry {
    status: OrderStatus;
    changedBy?: Types.ObjectId;
    at: Date;
    note?: string;
}

export interface IOrder extends Document {
    _id: Types.ObjectId;
    customerId: Types.ObjectId;
    items: OrderItem[];
    totalAmount: number;
    discountAmount: number;
    orderDate: Date;
    status: OrderStatus;
    statusHistory: OrderStatusHistoryEntry[];
    shippingAddress?: string;
    notes?: string;
    cancelledAt?: Date;
    deliveredAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema: Schema = new Schema<IOrder>(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Customer",
            index: true,
        },
        items: [
            {
                _id: false,
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    ref: "Gift",
                },
                quantity: { type: Number, required: true, min: 1 },
                price: { type: Number, required: true, min: 0 },
                discount: { type: Number, default: 0, min: 0 },
            },
        ],
        totalAmount: { type: Number, required: true, min: 0 },
        discountAmount: { type: Number, default: 0, min: 0 },
        orderDate: { type: Date, default: Date.now, index: true },
        status: {
            type: String,
            enum: Object.values(OrderStatus),
            default: OrderStatus.PENDING,
            index: true,
        },
        statusHistory: {
            type: [
                {
                    _id: false,
                    status: {
                        type: String,
                        enum: Object.values(OrderStatus),
                        required: true,
                    },
                    changedBy: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "User",
                        required: false,
                    },
                    at: { type: Date, default: Date.now },
                    note: { type: String, required: false },
                },
            ],
            default: [],
        },
        shippingAddress: { type: String, required: false, maxlength: 500 },
        notes: { type: String, required: false, maxlength: 1000 },
        cancelledAt: { type: Date, required: false },
        deliveredAt: { type: Date, required: false },
    },
    { timestamps: true }
);

OrderSchema.index({ customerId: 1, orderDate: -1 });
OrderSchema.index({ status: 1, orderDate: -1 });

const OrderModel = mongoose.model<IOrder>("Orders", OrderSchema);

export default OrderModel;
