import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User, { IUser } from "../model/user.Modal";
import Customer, { ICustomer } from "../model/customer.modal";
import {
    signUserAccessToken,
    signUserRefreshToken,
    signCustomerAccessToken,
    signCustomerRefreshToken,
    verifyUserRefreshToken,
    verifyCustomerRefreshToken,
    buildAuthResponse,
} from "../util/token";
import { AuthRequest } from "../middleware/auth";
import { sendEmail, templates } from "../util/mail";
import {
    setRefreshTokenCookie,
    clearRefreshTokenCookie,
    setCustomerRefreshTokenCookie,
    clearCustomerRefreshTokenCookie,
} from "../util/cookie";
import { issueResetToken, verifyResetToken } from "../util/resetToken";


const BCRYPT_SALT_ROUNDS = 12;
const RESET_TOKEN_RESPONSE_COOKIE = "resetToken";

const issueCustomerTokens = (res: Response, customer: ICustomer, accessToken: string, refreshToken: string) => {
    setCustomerRefreshTokenCookie(res, refreshToken);
    return { accessToken, refreshToken };
};

const issueUserTokens = (res: Response, _user: IUser, accessToken: string, refreshToken: string) => {
    setRefreshTokenCookie(res, refreshToken);
    return { accessToken, refreshToken };
};

export const registerUser = async (req: Request, res: Response) => {
    try {
        const { name, email, phone, password } = req.body as {
            name: string;
            email: string;
            phone?: string;
            password: string;
        };

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingCustomer = await Customer.findOne({ email: normalizedEmail });
        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        const customer = await Customer.create({
            name,
            email: normalizedEmail,
            phone,
            password: hashedPassword,
            role: "customer",
            isVerified: true,
            isActive: true,
        });

        const accessToken = signCustomerAccessToken(customer);
        const refreshToken = signCustomerRefreshToken(customer);
        setCustomerRefreshTokenCookie(res, refreshToken);

        try {
            await sendEmail({ to: normalizedEmail, ...templates.welcome(name) });
        } catch (mailErr) {
            console.warn("Welcome email failed to send:", mailErr);
        }

        return res.status(201).json(
            buildAuthResponse(
                customer.toJSON() as unknown as Record<string, unknown>,
                accessToken,
                refreshToken,
                "Customer registered successfully"
            )
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

export const registerAdmin = async (req: Request, res: Response) => {
    try {
        const { name, email, phone, password, role } = req.body as {
            name: string;
            email: string;
            phone?: string;
            password: string;
            role?: "admin" | "superadmin";
        };

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }
        const existingCustomer = await Customer.findOne({ email: normalizedEmail });
        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }

        if (phone) {
            const phoneExists = await User.findOne({ phone });
            if (phoneExists) {
                return res.status(409).json({
                    success: false,
                    message: "Phone number is already registered",
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        const assignedRole: "admin" | "superadmin" =
            role === "superadmin" ? "superadmin" : "admin";

        const user = await User.create({
            name,
            email: normalizedEmail,
            phone,
            password: hashedPassword,
            role: assignedRole,
        });

        const accessToken = signUserAccessToken(user);
        const refreshToken = signUserRefreshToken(user);
        setRefreshTokenCookie(res, refreshToken);

        try {
            await sendEmail({ to: normalizedEmail, ...templates.welcome(name) });
        } catch (mailErr) {
            console.warn("Welcome email failed to send:", mailErr);
        }

        return res.status(201).json(
            buildAuthResponse(
                user.toJSON() as unknown as Record<string, unknown>,
                accessToken,
                refreshToken,
                "Admin registered successfully"
            )
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
        console.error("Register admin error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body as { email: string; password: string };

        const normalizedEmail = email.trim().toLowerCase();

        const customer = await Customer.findOne({ email: normalizedEmail })
            .select("+password");

        if (customer) {
            if (!customer.isActive) {
                return res.status(403).json({
                    success: false,
                    message: "Account is disabled",
                });
            }

            if (customer.password) {
                const isValid = await bcrypt.compare(password, customer.password);
                if (!isValid) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid email or password",
                    });
                }
            } else {
                return res.status(401).json({
                    success: false,
                    message: "Password login not available for this account. Please use OTP login or reset your password.",
                });
            }

            customer.lastLoginAt = new Date();
            await customer.save();

            const accessToken = signCustomerAccessToken(customer);
            const refreshToken = signCustomerRefreshToken(customer);
            issueCustomerTokens(res, customer, accessToken, refreshToken);

            return res.status(200).json(
                buildAuthResponse(
                    customer.toJSON() as unknown as Record<string, unknown>,
                    accessToken,
                    refreshToken,
                    "Login successful"
                )
            );
        }

        const user = await User.findOne({ email: normalizedEmail }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account is disabled",
            });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        user.lastLoginAt = new Date();
        await user.save();

        const accessToken = signUserAccessToken(user);
        const refreshToken = signUserRefreshToken(user);
        issueUserTokens(res, user, accessToken, refreshToken);

        return res.status(200).json(
            buildAuthResponse(
                user.toJSON() as unknown as Record<string, unknown>,
                accessToken,
                refreshToken,
                "Login successful"
            )
        );
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const UpdateUser = async (req: Request, res: Response) => {
    try {
        const { name, email, phone, address } = req.body as {
            name?: string;
            email?: string;
            phone?: string;
            address?: string;
        };

        const principal = (req as AuthRequest).user;
        if (!principal) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (principal.type === "customer") {
            const customer = await Customer.findById(principal.sub);
            if (!customer) {
                return res.status(404).json({ success: false, message: "Account not found" });
            }
            if (name !== undefined) customer.name = name;
            if (email !== undefined) customer.email = email.trim().toLowerCase();
            if (phone !== undefined) customer.phone = phone;
            if (address !== undefined) customer.address = address;
            await customer.save();
            return res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                data: customer.toJSON(),
            });
        }

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Name and email are required",
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            principal.sub,
            { name, email: email.trim().toLowerCase(), phone },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: updatedUser.toJSON(),
        });
    } catch (err: unknown) {
        const e = err as { code?: number };
        if (e?.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email or phone already in use",
            });
        }
        console.error("Update user error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getData = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (principal.type === "customer") {
            const customer = await Customer.findById(principal.sub);
            if (!customer) {
                return res.status(404).json({ success: false, message: "Account not found" });
            }
            return res.status(200).json({
                success: true,
                data: customer.toJSON(),
            });
        }

        const user = await User.findById(principal.sub);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: user.toJSON(),
        });
    } catch (err) {
        console.error("Get data error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const { password, newPassword, confirmPassword } = req.body as {
            password: string;
            newPassword: string;
            confirmPassword: string;
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

        const principal = (req as AuthRequest).user;
        if (!principal) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (principal.type === "customer") {
            const customer = await Customer.findById(principal.sub).select("+password");
            if (!customer) {
                return res.status(404).json({ success: false, message: "Account not found" });
            }
            if (!customer.password) {
                return res.status(400).json({
                    success: false,
                    message: "No password set for this account",
                });
            }
            const valid = await bcrypt.compare(password, customer.password);
            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Current password is incorrect",
                });
            }
            if (password === newPassword) {
                return res.status(400).json({
                    success: false,
                    message: "New password must be different from current password",
                });
            }
            customer.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
            await customer.save();
            return res.status(200).json({
                success: true,
                message: "Password updated successfully",
            });
        }

        const user = await User.findById(principal.sub).select("+password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect",
            });
        }

        if (password === newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from current password",
            });
        }

        const hashedNew = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
        user.password = hashedNew;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password updated successfully",
        });
    } catch (err) {
        console.error("Change password error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
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

        let target: { generateOTP: () => Promise<string>; email: string; type: string } | null = null;
        const user = await User.findOne({ email: normalized });
        if (user) {
            target = {
                generateOTP: () => user.generateOTP(),
                email: user.email,
                type: "user",
            };
        } else {
            const customer = await Customer.findOne({ email: normalized });
            if (customer) {
                target = {
                    generateOTP: () => customer.generateOTP(),
                    email: customer.email,
                    type: "customer",
                };
            }
        }

        if (!target) {
            return res.status(200).json({
                success: true,
                message: "If the email is registered, a code has been sent.",
            });
        }

        const code = await target.generateOTP();

        try {
            await sendEmail({
                to: normalized,
                ...templates.passwordResetCode(code),
            });
        } catch (mailErr) {
            console.warn("Reset email failed to send:", mailErr);
        }

        return res.status(200).json({
            success: true,
            message: "If the email is registered, a code has been sent.",
        });
    } catch (err) {
        console.error("Request code error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const forgetPasswordVerifyCode = async (req: Request, res: Response) => {
    try {
        const { enteredCode, email, otp } = req.body as {
            enteredCode?: string;
            email?: string;
            otp?: string;
        };
        const code = enteredCode || otp;

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: "Email and verification code are required",
            });
        }

        const normalized = email.trim().toLowerCase();

        let account: (IUser | ICustomer) | null = null;
        let accountType: "user" | "customer" | null = null;
        const user = await User.findOne({ email: normalized }).select(
            "+verificationCode +verificationCodeExpires +password"
        );
        if (user) {
            account = user;
            accountType = "user";
        } else {
            const customer = await Customer.findOne({ email: normalized }).select(
                "+verificationCode +verificationCodeExpires +password"
            );
            if (customer) {
                account = customer;
                accountType = "customer";
            }
        }

        if (!account) {
            return res.status(400).json({
                success: false,
                message: "Invalid code or email",
            });
        }

        const isValid = await account.verifyOTP(code);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification code",
            });
        }

        const { token } = issueResetToken(account._id.toString(), account.email);
        res.cookie(RESET_TOKEN_RESPONSE_COOKIE, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60 * 1000,
            path: "/",
        });

        return res.status(200).json({
            success: true,
            message: "Code verified. Use the reset token to set a new password.",
            data: { resetToken: token, accountType },
        });
    } catch (err) {
        console.error("Verify code error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const setNewPassword = async (req: Request, res: Response) => {
    try {
        const { resetToken: bodyToken, newPassword, confirmPassword, email } = req.body as {
            resetToken?: string;
            newPassword?: string;
            confirmPassword?: string;
            email?: string;
        };

        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New password and confirm password are required",
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match",
            });
        }

        const cookieToken = (req as Request & { cookies?: Record<string, string> })
            .cookies?.[RESET_TOKEN_RESPONSE_COOKIE];
        const token = cookieToken || bodyToken;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Reset token is required",
            });
        }

        const payload = verifyResetToken(token);
        if (!payload) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token",
            });
        }

        if (email && email.trim().toLowerCase() !== payload.email) {
            return res.status(400).json({
                success: false,
                message: "Email does not match reset token",
            });
        }

        let updated = false;
        const customer = await Customer.findById(payload.sub).select("+password");
        if (customer) {
            customer.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
            await customer.save();
            updated = true;
        } else {
            const user = await User.findById(payload.sub).select("+password");
            if (user) {
                user.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
                await user.save();
                updated = true;
            }
        }

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Account not found",
            });
        }

        res.clearCookie(RESET_TOKEN_RESPONSE_COOKIE, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
        });

        return res.status(200).json({
            success: true,
            message: "Password has been reset successfully",
        });
    } catch (err) {
        console.error("Set new password error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const handleRefreshToken = async (req: Request, res: Response) => {
    try {
        const cookieToken = (req as Request & { cookies?: Record<string, string> })
            .cookies?.refreshToken;
        const customerCookie = (req as Request & { cookies?: Record<string, string> })
            .cookies?.customerRefreshToken;
        const bodyToken = (req.body as { refreshToken?: string })?.refreshToken;
        const refreshToken = cookieToken || customerCookie || bodyToken;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token is required",
            });
        }

        try {
            const payload = verifyUserRefreshToken(refreshToken);
            const user = await User.findById(payload.sub);
            if (user) {
                if (!user.isActive) {
                    return res.status(403).json({
                        success: false,
                        message: "Account is disabled",
                    });
                }
                const newAccessToken = signUserAccessToken(user);
                const newRefreshToken = signUserRefreshToken(user);
                setRefreshTokenCookie(res, newRefreshToken);

                return res.status(200).json({
                    success: true,
                    message: "Token refreshed successfully",
                    data: {
                        accessToken: newAccessToken,
                        refreshToken: newRefreshToken,
                    },
                });
            }
            // Not a user token — fall through to customer refresh
        } catch {
            // fall through to customer
        }

        try {
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
        } catch (innerErr) {
            const e = innerErr as { name?: string };
            if (e?.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Refresh token expired",
                });
            }
            return res.status(403).json({
                success: false,
                message: "Invalid refresh token",
            });
        }
    } catch (err: unknown) {
        console.error("Refresh token error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error during token refresh",
        });
    }
};

export const logout = async (_req: Request, res: Response) => {
    clearRefreshTokenCookie(res);
    clearCustomerRefreshTokenCookie(res);
    return res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
};
