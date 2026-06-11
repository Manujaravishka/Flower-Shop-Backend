import mongoose, { Document, Schema, Types } from "mongoose";

export interface PaymentDocument extends Document {
    _id: Types.ObjectId;
    orderId: Types.ObjectId;
    customerId?: Types.ObjectId;
    processedBy?: Types.ObjectId;
    amount: number;
    discount: number;
    status: string;
    paymentMethod: string;
    gateway?: string;
    transactionId?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export enum PaymentStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED",
}

export enum PaymentMethod {
    CREDIT_CARD = "CARD",
    CASH = "CASH",
    BANK_TRANSFER = "BANK",
}

export enum PaymentGateway {
    STRIPE = "STRIPE",
    PAYHERE = "PAYHERE",
    MANUAL = "MANUAL",
}

const PaymentSchema = new Schema<PaymentDocument>(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Orders",
            required: true,
            index: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: false,
            index: true,
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        amount: { type: Number, required: true, min: 0 },
        discount: { type: Number, default: 0, min: 0 },
        status: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.PENDING,
            index: true,
        },
        paymentMethod: {
            type: String,
            enum: Object.values(PaymentMethod),
            required: true,
        },
        gateway: {
            type: String,
            enum: Object.values(PaymentGateway),
            default: PaymentGateway.MANUAL,
        },
        transactionId: { type: String, required: false, trim: true },
        notes: { type: String, required: false, maxlength: 1000 },
    },
    { timestamps: true }
);

PaymentSchema.index({ customerId: 1, createdAt: -1 });

const PaymentModel = mongoose.model<PaymentDocument>("Payment", PaymentSchema);

export default PaymentModel;
