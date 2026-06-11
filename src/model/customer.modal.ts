import mongoose, { Document, Schema } from "mongoose";
import { IOTPMethods, otpPlugin } from "../plugin/otp_plugin";

export type CustomerRole = "customer";

export interface Cart {
    productId: mongoose.Types.ObjectId;
    quantity: number;
    discount?: number;
}

export interface ICustomer extends Document, IOTPMethods {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    phone: string;
    address: string;
    password?: string;
    cart: Cart[];
    isVerified: boolean;
    isActive: boolean;
    role: CustomerRole;
    orders: mongoose.Types.ObjectId[];
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
    {
        name: { type: String, required: false, trim: true, maxlength: 100 },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        phone: { type: String, required: false, trim: true },
        password: { type: String, required: false, trim: true, select: false },
        isVerified: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        role: {
            type: String,
            enum: ["customer"],
            default: "customer",
            required: true,
        },
        address: { type: String, required: false, maxlength: 500 },
        cart: {
            type: [
                {
                    productId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "Gift",
                        required: true,
                    },
                    quantity: { type: Number, required: true, min: 1 },
                    discount: { type: Number, default: 0, min: 0 },
                },
            ],
            required: false,
            default: [],
        },
        orders: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "Orders",
            required: false,
            default: [],
        },
        lastLoginAt: { type: Date, required: false },
    },
    { timestamps: true }
);

customerSchema.set("toJSON", {
    transform: (_doc, ret) => {
        const r = ret as unknown as Record<string, unknown>;
        delete r.__v;
        delete r.password;
        delete r.verificationCode;
        delete r.verificationCodeExpires;
        return r;
    },
});

customerSchema.index({ role: 1 });
customerSchema.index({ isActive: 1 });

customerSchema.plugin(otpPlugin);

const Customer = mongoose.model<ICustomer>("Customer", customerSchema);

export default Customer;
