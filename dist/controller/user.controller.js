"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.handleRefreshToken = exports.setNewPassword = exports.forgetPasswordVerifyCode = exports.requestCode = exports.changePassword = exports.getData = exports.UpdateUser = exports.login = exports.registerAdmin = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_Modal_1 = __importDefault(require("../model/user.Modal"));
const customer_modal_1 = __importDefault(require("../model/customer.modal"));
const token_1 = require("../util/token");
const mail_1 = require("../util/mail");
const cookie_1 = require("../util/cookie");
const resetToken_1 = require("../util/resetToken");
const BCRYPT_SALT_ROUNDS = 12;
const RESET_TOKEN_RESPONSE_COOKIE = "resetToken";
const issueCustomerTokens = (res, customer, accessToken, refreshToken) => {
    (0, cookie_1.setCustomerRefreshTokenCookie)(res, refreshToken);
    return { accessToken, refreshToken };
};
const issueUserTokens = (res, _user, accessToken, refreshToken) => {
    (0, cookie_1.setRefreshTokenCookie)(res, refreshToken);
    return { accessToken, refreshToken };
};
const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required",
            });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const existingCustomer = await customer_modal_1.default.findOne({ email: normalizedEmail });
        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }
        const existingUser = await user_Modal_1.default.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, BCRYPT_SALT_ROUNDS);
        const customer = await customer_modal_1.default.create({
            name,
            email: normalizedEmail,
            phone,
            password: hashedPassword,
            role: "customer",
            isVerified: true,
            isActive: true,
        });
        const accessToken = (0, token_1.signCustomerAccessToken)(customer);
        const refreshToken = (0, token_1.signCustomerRefreshToken)(customer);
        (0, cookie_1.setCustomerRefreshTokenCookie)(res, refreshToken);
        try {
            await (0, mail_1.sendEmail)({ to: normalizedEmail, ...mail_1.templates.welcome(name) });
        }
        catch (mailErr) {
            console.warn("Welcome email failed to send:", mailErr);
        }
        return res.status(201).json((0, token_1.buildAuthResponse)(customer.toJSON(), accessToken, refreshToken, "Customer registered successfully"));
    }
    catch (err) {
        const e = err;
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
exports.registerUser = registerUser;
const registerAdmin = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required",
            });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await user_Modal_1.default.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }
        const existingCustomer = await customer_modal_1.default.findOne({ email: normalizedEmail });
        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }
        if (phone) {
            const phoneExists = await user_Modal_1.default.findOne({ phone });
            if (phoneExists) {
                return res.status(409).json({
                    success: false,
                    message: "Phone number is already registered",
                });
            }
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, BCRYPT_SALT_ROUNDS);
        const assignedRole = role === "superadmin" ? "superadmin" : "admin";
        const user = await user_Modal_1.default.create({
            name,
            email: normalizedEmail,
            phone,
            password: hashedPassword,
            role: assignedRole,
        });
        const accessToken = (0, token_1.signUserAccessToken)(user);
        const refreshToken = (0, token_1.signUserRefreshToken)(user);
        (0, cookie_1.setRefreshTokenCookie)(res, refreshToken);
        try {
            await (0, mail_1.sendEmail)({ to: normalizedEmail, ...mail_1.templates.welcome(name) });
        }
        catch (mailErr) {
            console.warn("Welcome email failed to send:", mailErr);
        }
        return res.status(201).json((0, token_1.buildAuthResponse)(user.toJSON(), accessToken, refreshToken, "Admin registered successfully"));
    }
    catch (err) {
        const e = err;
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
exports.registerAdmin = registerAdmin;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.trim().toLowerCase();
        const customer = await customer_modal_1.default.findOne({ email: normalizedEmail })
            .select("+password");
        if (customer) {
            if (!customer.isActive) {
                return res.status(403).json({
                    success: false,
                    message: "Account is disabled",
                });
            }
            if (customer.password) {
                const isValid = await bcryptjs_1.default.compare(password, customer.password);
                if (!isValid) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid email or password",
                    });
                }
            }
            else {
                return res.status(401).json({
                    success: false,
                    message: "Password login not available for this account. Please use OTP login or reset your password.",
                });
            }
            customer.lastLoginAt = new Date();
            await customer.save();
            const accessToken = (0, token_1.signCustomerAccessToken)(customer);
            const refreshToken = (0, token_1.signCustomerRefreshToken)(customer);
            issueCustomerTokens(res, customer, accessToken, refreshToken);
            return res.status(200).json((0, token_1.buildAuthResponse)(customer.toJSON(), accessToken, refreshToken, "Login successful"));
        }
        const user = await user_Modal_1.default.findOne({ email: normalizedEmail }).select("+password");
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
        const isValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }
        user.lastLoginAt = new Date();
        await user.save();
        const accessToken = (0, token_1.signUserAccessToken)(user);
        const refreshToken = (0, token_1.signUserRefreshToken)(user);
        issueUserTokens(res, user, accessToken, refreshToken);
        return res.status(200).json((0, token_1.buildAuthResponse)(user.toJSON(), accessToken, refreshToken, "Login successful"));
    }
    catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.login = login;
const UpdateUser = async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        const principal = req.user;
        if (!principal) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (principal.type === "customer") {
            const customer = await customer_modal_1.default.findById(principal.sub);
            if (!customer) {
                return res.status(404).json({ success: false, message: "Account not found" });
            }
            if (name !== undefined)
                customer.name = name;
            if (email !== undefined)
                customer.email = email.trim().toLowerCase();
            if (phone !== undefined)
                customer.phone = phone;
            if (address !== undefined)
                customer.address = address;
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
        const updatedUser = await user_Modal_1.default.findByIdAndUpdate(principal.sub, { name, email: email.trim().toLowerCase(), phone }, { new: true, runValidators: true });
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
    }
    catch (err) {
        const e = err;
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
exports.UpdateUser = UpdateUser;
const getData = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (principal.type === "customer") {
            const customer = await customer_modal_1.default.findById(principal.sub);
            if (!customer) {
                return res.status(404).json({ success: false, message: "Account not found" });
            }
            return res.status(200).json({
                success: true,
                data: customer.toJSON(),
            });
        }
        const user = await user_Modal_1.default.findById(principal.sub);
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
    }
    catch (err) {
        console.error("Get data error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getData = getData;
const changePassword = async (req, res) => {
    try {
        const { password, newPassword, confirmPassword } = req.body;
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
        const principal = req.user;
        if (!principal) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (principal.type === "customer") {
            const customer = await customer_modal_1.default.findById(principal.sub).select("+password");
            if (!customer) {
                return res.status(404).json({ success: false, message: "Account not found" });
            }
            if (!customer.password) {
                return res.status(400).json({
                    success: false,
                    message: "No password set for this account",
                });
            }
            const valid = await bcryptjs_1.default.compare(password, customer.password);
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
            customer.password = await bcryptjs_1.default.hash(newPassword, BCRYPT_SALT_ROUNDS);
            await customer.save();
            return res.status(200).json({
                success: true,
                message: "Password updated successfully",
            });
        }
        const user = await user_Modal_1.default.findById(principal.sub).select("+password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
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
        const hashedNew = await bcryptjs_1.default.hash(newPassword, BCRYPT_SALT_ROUNDS);
        user.password = hashedNew;
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Password updated successfully",
        });
    }
    catch (err) {
        console.error("Change password error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.changePassword = changePassword;
const requestCode = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== "string" || email.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }
        const normalized = email.trim().toLowerCase();
        let target = null;
        const user = await user_Modal_1.default.findOne({ email: normalized });
        if (user) {
            target = {
                generateOTP: () => user.generateOTP(),
                email: user.email,
                type: "user",
            };
        }
        else {
            const customer = await customer_modal_1.default.findOne({ email: normalized });
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
            await (0, mail_1.sendEmail)({
                to: normalized,
                ...mail_1.templates.passwordResetCode(code),
            });
        }
        catch (mailErr) {
            console.warn("Reset email failed to send:", mailErr);
        }
        return res.status(200).json({
            success: true,
            message: "If the email is registered, a code has been sent.",
        });
    }
    catch (err) {
        console.error("Request code error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.requestCode = requestCode;
const forgetPasswordVerifyCode = async (req, res) => {
    try {
        const { enteredCode, email, otp } = req.body;
        const code = enteredCode || otp;
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: "Email and verification code are required",
            });
        }
        const normalized = email.trim().toLowerCase();
        let account = null;
        let accountType = null;
        const user = await user_Modal_1.default.findOne({ email: normalized }).select("+verificationCode +verificationCodeExpires +password");
        if (user) {
            account = user;
            accountType = "user";
        }
        else {
            const customer = await customer_modal_1.default.findOne({ email: normalized }).select("+verificationCode +verificationCodeExpires +password");
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
        const { token } = (0, resetToken_1.issueResetToken)(account._id.toString(), account.email);
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
    }
    catch (err) {
        console.error("Verify code error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.forgetPasswordVerifyCode = forgetPasswordVerifyCode;
const setNewPassword = async (req, res) => {
    try {
        const { resetToken: bodyToken, newPassword, confirmPassword, email } = req.body;
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
        const cookieToken = req
            .cookies?.[RESET_TOKEN_RESPONSE_COOKIE];
        const token = cookieToken || bodyToken;
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Reset token is required",
            });
        }
        const payload = (0, resetToken_1.verifyResetToken)(token);
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
        const customer = await customer_modal_1.default.findById(payload.sub).select("+password");
        if (customer) {
            customer.password = await bcryptjs_1.default.hash(newPassword, BCRYPT_SALT_ROUNDS);
            await customer.save();
            updated = true;
        }
        else {
            const user = await user_Modal_1.default.findById(payload.sub).select("+password");
            if (user) {
                user.password = await bcryptjs_1.default.hash(newPassword, BCRYPT_SALT_ROUNDS);
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
    }
    catch (err) {
        console.error("Set new password error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.setNewPassword = setNewPassword;
const handleRefreshToken = async (req, res) => {
    try {
        const cookieToken = req
            .cookies?.refreshToken;
        const customerCookie = req
            .cookies?.customerRefreshToken;
        const bodyToken = req.body?.refreshToken;
        const refreshToken = cookieToken || customerCookie || bodyToken;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token is required",
            });
        }
        try {
            const payload = (0, token_1.verifyUserRefreshToken)(refreshToken);
            const user = await user_Modal_1.default.findById(payload.sub);
            if (user) {
                if (!user.isActive) {
                    return res.status(403).json({
                        success: false,
                        message: "Account is disabled",
                    });
                }
                const newAccessToken = (0, token_1.signUserAccessToken)(user);
                const newRefreshToken = (0, token_1.signUserRefreshToken)(user);
                (0, cookie_1.setRefreshTokenCookie)(res, newRefreshToken);
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
        }
        catch {
            // fall through to customer
        }
        try {
            const payload = (0, token_1.verifyCustomerRefreshToken)(refreshToken);
            const customer = await customer_modal_1.default.findById(payload.sub);
            if (!customer || !customer.isActive) {
                return res.status(403).json({
                    success: false,
                    message: "Invalid refresh token",
                });
            }
            const newAccessToken = (0, token_1.signCustomerAccessToken)(customer);
            const newRefreshToken = (0, token_1.signCustomerRefreshToken)(customer);
            (0, cookie_1.setCustomerRefreshTokenCookie)(res, newRefreshToken);
            return res.status(200).json({
                success: true,
                message: "Token refreshed successfully",
                data: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                },
            });
        }
        catch (innerErr) {
            const e = innerErr;
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
    }
    catch (err) {
        console.error("Refresh token error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error during token refresh",
        });
    }
};
exports.handleRefreshToken = handleRefreshToken;
const logout = async (_req, res) => {
    (0, cookie_1.clearRefreshTokenCookie)(res);
    (0, cookie_1.clearCustomerRefreshTokenCookie)(res);
    return res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
};
exports.logout = logout;
