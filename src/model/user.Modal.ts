import mongoose, { Document, Schema } from "mongoose";
import { otpPlugin, IOTPMethods } from "../plugin/otp_plugin";

export type UserRole = "admin" | "superadmin";

export interface IUser extends Document, IOTPMethods {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema: Schema<IUser> = new Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [100, "Name cannot exceed 100 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Invalid email format"],
        },
        phone: {
            type: String,
            required: false,
            unique: true,
            sparse: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters"],
            select: false,
        },
        role: {
            type: String,
            enum: ["admin", "superadmin"],
            default: "admin",
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLoginAt: {
            type: Date,
            required: false,
        },
    },
    { timestamps: true }
);

userSchema.set("toJSON", {
    transform: (_doc, ret) => {
        const r = ret as unknown as Record<string, unknown>;
        delete r.password;
        delete r.__v;
        delete r.verificationCode;
        delete r.verificationCodeExpires;
        return r;
    },
});

userSchema.plugin(otpPlugin);

const User = mongoose.model<IUser>("User", userSchema);

export default User;
