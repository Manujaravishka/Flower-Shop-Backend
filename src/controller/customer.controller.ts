import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Customer from "../model/customer.modal";
import { sendEmail, templates } from "../util/mail";
import { AuthRequest } from "../middleware/auth";
import {
    setCustomerRefreshTokenCookie,
    clearCustomerRefreshTokenCookie,
} from "../util/cookie";
import {
    signCustomerAccessToken,
    signCustomerRefreshToken,
    verifyCustomerRefreshToken,
    buildAuthResponse,
} from "../util/token";


const BCRYPT_SALT_ROUNDS = 12;

const requireCustomerId = (req: Request, res: Response): string | null => {
    const principal = (req as AuthRequest).user;
    if (!principal || principal.type !== "customer" || !principal.sub) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return null;
    }
    return principal.sub;
};

const assertOwnershipOrAdmin = async (
    req: Request,
    res: Response,
    resourceCustomerId: string | mongoose.Types.ObjectId
): Promise<boolean> => {
    const principal = (req as AuthRequest).user;
    if (!principal) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return false;
    }
    if (principal.role === "admin" || principal.role === "superadmin") {
        return true;
    }
    if (
        principal.type === "customer" &&
        principal.sub === resourceCustomerId.toString()
    ) {
        return true;
    }
    res.status(403).json({ success: false, message: "Forbidden" });
    return false;
};

export const requestCode = async (req: Request, res: Response) => {
    try {
        const { email } = req.body as { email?: string };

        if (!email || typeof email !== "string" || email.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const normalized = email.trim().toLowerCase();
        const customer = await Customer.findOneAndUpdate(
            { email: normalized },
            {
                $setOnInsert: { name: "New Customer", role: "customer" },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        const code = await customer.generateOTP();

        try {
            await sendEmail({ to: normalized, ...templates.customerOtp(code) });
        } catch (mailErr) {
            console.warn("OTP email failed to send:", mailErr);
        }

        return res.status(200).json({
            success: true,
            message: "If the email is valid, an OTP has been sent.",
        });
    } catch (err) {
        console.error("Request code error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const verifyLoginOTP = async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body as { email?: string; code?: string };

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: "Email and verification code are required",
            });
        }

        const normalized = email.trim().toLowerCase();
        const customer = await Customer.findOne({ email: normalized }).select(
            "+verificationCode +verificationCodeExpires"
        );

        if (!customer) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or code",
            });
        }

        const isValid = await customer.verifyOTP(code);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification code",
            });
        }

        if (!customer.isVerified) {
            customer.isVerified = true;
        }
        customer.lastLoginAt = new Date();
        await customer.save();

        const accessToken = signCustomerAccessToken(customer);
        const refreshToken = signCustomerRefreshToken(customer);
        setCustomerRefreshTokenCookie(res, refreshToken);

        const safeCustomer = customer.toJSON() as unknown as Record<string, unknown>;

        return res.status(200).json(
            buildAuthResponse(safeCustomer, accessToken, refreshToken, "Login successful")
        );
    } catch (err) {
        console.error("Verify login OTP error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const createCustomer = async (req: Request, res: Response) => {
    try {
        const { name, email, phone, address, password } = req.body as {
            name?: string;
            email?: string;
            phone?: string;
            address?: string;
            password?: string;
        };

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const normalized = email.trim().toLowerCase();

        const existing = await Customer.findOne({ email: normalized }).select("+password");

        let customer: typeof existing extends null ? never : NonNullable<typeof existing>;
        let isNew = false;

        if (existing) {
            existing.name = name ?? existing.name;
            existing.phone = phone ?? existing.phone;
            existing.address = address ?? existing.address;
            if (password && password.length >= 8) {
                existing.password = await bcrypt.hash(password, 12);
            }
            await existing.save();
            customer = existing;
        } else {
            isNew = true;
            const hashedPassword = password && password.length >= 8
                ? await bcrypt.hash(password, 12)
                : undefined;
            const created = await Customer.create({
                name,
                email: normalized,
                phone,
                address,
                password: hashedPassword,
                role: "customer",
                isActive: true,
            });
            customer = await Customer.findById(created._id).select("+password") as NonNullable<typeof existing>;
        }

        const accessToken = signCustomerAccessToken(customer);
        const refreshToken = signCustomerRefreshToken(customer);
        setCustomerRefreshTokenCookie(res, refreshToken);

        const safeCustomer = customer.toJSON() as unknown as Record<string, unknown>;

        return res.status(isNew ? 201 : 200).json(
            buildAuthResponse(
                safeCustomer,
                accessToken,
                refreshToken,
                isNew ? "Customer created successfully" : "Customer updated successfully"
            )
        );
    } catch (err) {
        const e = err as { code?: number; keyValue?: Record<string, unknown> };
        if (e?.code === 11000) {
            const duplicateField = Object.keys(e.keyValue || {})[0] || "field";
            return res.status(409).json({
                success: false,
                message: `Duplicate ${duplicateField} detected`,
            });
        }
        console.error("Create customer error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updateCustomer = async (req: Request, res: Response) => {
    try {
        const { customerId, name, email, phone, address } = req.body as {
            customerId?: string;
            name?: string;
            email?: string;
            phone?: string;
            address?: string;
        };

        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer ID is required",
            });
        }
        if (!name && !email && !phone && !address) {
            return res.status(400).json({
                success: false,
                message: "At least one field is required to update",
            });
        }

        if (!(await assertOwnershipOrAdmin(req, res, customerId))) return;

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        if (name !== undefined) customer.name = name;
        if (email !== undefined) customer.email = email;
        if (phone !== undefined) customer.phone = phone;
        if (address !== undefined) customer.address = address;

        await customer.save();

        return res.status(200).json({
            success: true,
            data: customer,
        });
    } catch (err) {
        console.error("Update customer error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getCustomer = async (req: Request, res: Response) => {
    try {
        const customerId =
            (req.params as { customerId?: string }).customerId ||
            (req.query as { customerId?: string }).customerId ||
            (req.body as { customerId?: string }).customerId;

        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer ID is required",
            });
        }

        if (!(await assertOwnershipOrAdmin(req, res, customerId))) return;

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: customer,
        });
    } catch (err) {
        console.error("Get customer error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const deleteCustomer = async (req: Request, res: Response) => {
    try {
        const customerId =
            (req.params as { customerId?: string }).customerId ||
            (req.query as { customerId?: string }).customerId ||
            (req.body as { customerId?: string }).customerId;

        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer ID is required",
            });
        }

        if (!(await assertOwnershipOrAdmin(req, res, customerId))) return;

        const customer = await Customer.findByIdAndUpdate(
            customerId,
            { isActive: false },
            { new: true }
        );
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Customer deactivated successfully",
        });
    } catch (err) {
        console.error("Delete customer error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getAllCustomers = async (_req: Request, res: Response) => {
    try {
        const customers = await Customer.find({ isActive: true });
        return res.status(200).json({
            success: true,
            data: customers,
        });
    } catch (err) {
        console.error("Get all customers error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const addToCart = async (req: Request, res: Response) => {
    try {
        const customerId = requireCustomerId(req, res);
        if (!customerId) return;

        const { productId, quantity, discount } = req.body as {
            productId?: string;
            quantity?: number;
            discount?: number;
        };

        if (!productId || !quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Product ID and valid quantity are required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid productId" });
        }

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        const existingItemIndex = customer.cart.findIndex(
            (item) => item.productId.toString() === productId
        );
        if (existingItemIndex >= 0) {
            const existing = customer.cart[existingItemIndex];
            if (existing) {
                existing.quantity += quantity;
                if (discount !== undefined) existing.discount = discount;
            }
        } else {
            customer.cart.push({
                productId: new mongoose.Types.ObjectId(productId),
                quantity,
                discount,
            });
        }

        await customer.save();
        return res.status(200).json({
            success: true,
            data: customer.cart,
        });
    } catch (err) {
        console.error("Add to cart error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const removeFromCart = async (req: Request, res: Response) => {
    try {
        const customerId = requireCustomerId(req, res);
        if (!customerId) return;

        const { productId } = req.body as { productId?: string };

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required",
            });
        }

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        customer.cart = customer.cart.filter(
            (item) => item.productId.toString() !== productId
        );
        await customer.save();

        return res.status(200).json({
            success: true,
            data: customer.cart,
        });
    } catch (err) {
        console.error("Remove from cart error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const qtyChange = async (req: Request, res: Response) => {
    try {
        const customerId = requireCustomerId(req, res);
        if (!customerId) return;

        const { productId, quantity } = req.body as {
            productId?: string;
            quantity?: number;
        };

        if (!productId || quantity === undefined || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Product ID and quantity (>= 1) are required",
            });
        }

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        const itemIndex = customer.cart.findIndex(
            (item) => item.productId.toString() === productId
        );
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in cart",
            });
        }

        const item = customer.cart[itemIndex];
        if (item) {
            item.quantity = quantity;
        }
        await customer.save();

        return res.status(200).json({
            success: true,
            data: customer.cart,
        });
    } catch (err) {
        console.error("Quantity change error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const handleCustomerRefreshToken = async (req: Request, res: Response) => {
    try {
        const cookieToken = (req as Request & { cookies?: Record<string, string> })
            .cookies?.customerRefreshToken;
        const bodyToken = (req.body as { refreshToken?: string })?.refreshToken;
        const refreshToken = cookieToken || bodyToken;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token is required",
            });
        }

        const payload = verifyCustomerRefreshToken(refreshToken);
        const customer = await Customer.findById(payload.sub);
        if (!customer || !customer.isActive) {
            return res.status(403).json({
                success: false,
                message: "Invalid refresh token",
            });
        }

        const newAccessToken = signCustomerAccessToken(customer);
        const newRefreshToken = signCustomerRefreshToken(customer);
        setCustomerRefreshTokenCookie(res, newRefreshToken);

        return res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
        });
    } catch (err: unknown) {
        const e = err as { name?: string };
        if (e?.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Refresh token expired",
            });
        }
        return res.status(403).json({
            success: false,
            message: "Invalid or expired refresh token",
        });
    }
};

export const customerLogout = async (_req: Request, res: Response) => {
    clearCustomerRefreshTokenCookie(res);
    return res.status(200).json({
        success: true,
        message: "Customer logged out successfully",
    });
};

export const registerCustomer = async (req: Request, res: Response) => {
    try {
        const { name, email, phone, password } = req.body as {
            name?: string;
            email?: string;
            phone?: string;
            password?: string;
        };

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }
        if (!password || typeof password !== "string" || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters",
            });
        }

        const normalized = email.trim().toLowerCase();
        const existing = await Customer.findOne({ email: normalized });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }

        const hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        const customer = await Customer.create({
            name: name?.trim() || "New Customer",
            email: normalized,
            phone: phone?.trim() || undefined,
            password: hashed,
            role: "customer",
            isVerified: true,
            isActive: true,
        });

        const accessToken = signCustomerAccessToken(customer);
        const refreshToken = signCustomerRefreshToken(customer);
        setCustomerRefreshTokenCookie(res, refreshToken);

        const safeCustomer = customer.toJSON() as unknown as Record<string, unknown>;

        try {
            await sendEmail({ to: normalized, ...templates.welcome(name?.trim() || "Customer") });
        } catch (mailErr) {
            console.warn("Welcome email failed to send:", mailErr);
        }

        return res.status(201).json(
            buildAuthResponse(safeCustomer, accessToken, refreshToken, "Customer registered successfully")
        );
    } catch (err: unknown) {
        const e = err as { code?: number; keyValue?: Record<string, unknown> };
        if (e?.code === 11000) {
            const duplicateField = Object.keys(e.keyValue || {})[0] || "field";
            return res.status(409).json({
                success: false,
                message: `Duplicate ${duplicateField} detected`,
            });
        }
        console.error("Register customer error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const loginCustomer = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body as {
            email?: string;
            password?: string;
        };

        if (!email || typeof email !== "string" || email.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }
        if (!password || typeof password !== "string" || password.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Password is required",
            });
        }

        const normalized = email.trim().toLowerCase();
        const customer = await Customer.findOne({ email: normalized }).select("+password");
        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (!customer.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account is disabled",
            });
        }

        if (!customer.password) {
            return res.status(401).json({
                success: false,
                message: "Password login is not enabled for this account. Please use OTP login.",
            });
        }

        const isValid = await bcrypt.compare(password, customer.password);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        customer.lastLoginAt = new Date();
        await customer.save();

        const accessToken = signCustomerAccessToken(customer);
        const refreshToken = signCustomerRefreshToken(customer);
        setCustomerRefreshTokenCookie(res, refreshToken);

        const safeCustomer = customer.toJSON() as unknown as Record<string, unknown>;

        return res.status(200).json(
            buildAuthResponse(safeCustomer, accessToken, refreshToken, "Login successful")
        );
    } catch (err) {
        console.error("Login customer error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const changeCustomerPassword = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const { password, newPassword, confirmPassword } = req.body as {
            password?: string;
            newPassword?: string;
            confirmPassword?: string;
        };

        if (!password || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All password fields are required",
            });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New password and confirm password do not match",
            });
        }
        if (password === newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from current password",
            });
        }

        const customer = await Customer.findById(principal.sub).select("+password");
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }
        if (!customer.password) {
            return res.status(400).json({
                success: false,
                message: "Password login is not enabled for this account",
            });
        }

        const valid = await bcrypt.compare(password, customer.password);
        if (!valid) {
            return res.status(400).json({ success: false, message: "Current password is incorrect" });
        }

        customer.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
        await customer.save();

        return res.status(200).json({
            success: true,
            message: "Password updated successfully",
        });
    } catch (err) {
        console.error("Change customer password error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getAllCustomersPaged = async (req: Request, res: Response) => {
    try {
        const { page, limit } = req.query as { page?: string; limit?: string };
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [customers, total] = await Promise.all([
            Customer.find({ isActive: true })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Customer.countDocuments({ isActive: true }),
        ]);

        return res.status(200).json({
            success: true,
            data: customers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        });
    } catch (err) {
        console.error("Get all customers paged error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
