"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCustomersPaged = exports.changeCustomerPassword = exports.loginCustomer = exports.registerCustomer = exports.customerLogout = exports.handleCustomerRefreshToken = exports.qtyChange = exports.removeFromCart = exports.addToCart = exports.getAllCustomers = exports.deleteCustomer = exports.getCustomer = exports.updateCustomer = exports.createCustomer = exports.verifyLoginOTP = exports.requestCode = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const customer_modal_1 = __importDefault(require("../model/customer.modal"));
const mail_1 = require("../util/mail");
const cookie_1 = require("../util/cookie");
const token_1 = require("../util/token");
const BCRYPT_SALT_ROUNDS = 12;
const requireCustomerId = (req, res) => {
    const principal = req.user;
    if (!principal || principal.type !== "customer" || !principal.sub) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return null;
    }
    return principal.sub;
};
const assertOwnershipOrAdmin = async (req, res, resourceCustomerId) => {
    const principal = req.user;
    if (!principal) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return false;
    }
    if (principal.role === "admin" || principal.role === "superadmin") {
        return true;
    }
    if (principal.type === "customer" &&
        principal.sub === resourceCustomerId.toString()) {
        return true;
    }
    res.status(403).json({ success: false, message: "Forbidden" });
    return false;
};
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
        const customer = await customer_modal_1.default.findOneAndUpdate({ email: normalized }, {
            $setOnInsert: { name: "New Customer", role: "customer" },
        }, { new: true, upsert: true, setDefaultsOnInsert: true });
        const code = await customer.generateOTP();
        try {
            await (0, mail_1.sendEmail)({ to: normalized, ...mail_1.templates.customerOtp(code) });
        }
        catch (mailErr) {
            console.warn("OTP email failed to send:", mailErr);
        }
        return res.status(200).json({
            success: true,
            message: "If the email is valid, an OTP has been sent.",
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
const verifyLoginOTP = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: "Email and verification code are required",
            });
        }
        const normalized = email.trim().toLowerCase();
        const customer = await customer_modal_1.default.findOne({ email: normalized }).select("+verificationCode +verificationCodeExpires");
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
        const accessToken = (0, token_1.signCustomerAccessToken)(customer);
        const refreshToken = (0, token_1.signCustomerRefreshToken)(customer);
        (0, cookie_1.setCustomerRefreshTokenCookie)(res, refreshToken);
        const safeCustomer = customer.toJSON();
        return res.status(200).json((0, token_1.buildAuthResponse)(safeCustomer, accessToken, refreshToken, "Login successful"));
    }
    catch (err) {
        console.error("Verify login OTP error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.verifyLoginOTP = verifyLoginOTP;
const createCustomer = async (req, res) => {
    try {
        const { name, email, phone, address, password } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }
        const normalized = email.trim().toLowerCase();
        const existing = await customer_modal_1.default.findOne({ email: normalized }).select("+password");
        let customer;
        let isNew = false;
        if (existing) {
            existing.name = name ?? existing.name;
            existing.phone = phone ?? existing.phone;
            existing.address = address ?? existing.address;
            if (password && password.length >= 8) {
                existing.password = await bcryptjs_1.default.hash(password, 12);
            }
            await existing.save();
            customer = existing;
        }
        else {
            isNew = true;
            const hashedPassword = password && password.length >= 8
                ? await bcryptjs_1.default.hash(password, 12)
                : undefined;
            const created = await customer_modal_1.default.create({
                name,
                email: normalized,
                phone,
                address,
                password: hashedPassword,
                role: "customer",
                isActive: true,
            });
            customer = await customer_modal_1.default.findById(created._id).select("+password");
        }
        const accessToken = (0, token_1.signCustomerAccessToken)(customer);
        const refreshToken = (0, token_1.signCustomerRefreshToken)(customer);
        (0, cookie_1.setCustomerRefreshTokenCookie)(res, refreshToken);
        const safeCustomer = customer.toJSON();
        return res.status(isNew ? 201 : 200).json((0, token_1.buildAuthResponse)(safeCustomer, accessToken, refreshToken, isNew ? "Customer created successfully" : "Customer updated successfully"));
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
        console.error("Create customer error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.createCustomer = createCustomer;
const updateCustomer = async (req, res) => {
    try {
        const { customerId, name, email, phone, address } = req.body;
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
        if (!(await assertOwnershipOrAdmin(req, res, customerId)))
            return;
        const customer = await customer_modal_1.default.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }
        if (name !== undefined)
            customer.name = name;
        if (email !== undefined)
            customer.email = email;
        if (phone !== undefined)
            customer.phone = phone;
        if (address !== undefined)
            customer.address = address;
        await customer.save();
        return res.status(200).json({
            success: true,
            data: customer,
        });
    }
    catch (err) {
        console.error("Update customer error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.updateCustomer = updateCustomer;
const getCustomer = async (req, res) => {
    try {
        const customerId = req.params.customerId ||
            req.query.customerId ||
            req.body.customerId;
        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer ID is required",
            });
        }
        if (!(await assertOwnershipOrAdmin(req, res, customerId)))
            return;
        const customer = await customer_modal_1.default.findById(customerId);
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
    }
    catch (err) {
        console.error("Get customer error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getCustomer = getCustomer;
const deleteCustomer = async (req, res) => {
    try {
        const customerId = req.params.customerId ||
            req.query.customerId ||
            req.body.customerId;
        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer ID is required",
            });
        }
        if (!(await assertOwnershipOrAdmin(req, res, customerId)))
            return;
        const customer = await customer_modal_1.default.findByIdAndUpdate(customerId, { isActive: false }, { new: true });
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
    }
    catch (err) {
        console.error("Delete customer error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.deleteCustomer = deleteCustomer;
const getAllCustomers = async (_req, res) => {
    try {
        const customers = await customer_modal_1.default.find({ isActive: true });
        return res.status(200).json({
            success: true,
            data: customers,
        });
    }
    catch (err) {
        console.error("Get all customers error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getAllCustomers = getAllCustomers;
const addToCart = async (req, res) => {
    try {
        const customerId = requireCustomerId(req, res);
        if (!customerId)
            return;
        const { productId, quantity, discount } = req.body;
        if (!productId || !quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Product ID and valid quantity are required",
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid productId" });
        }
        const customer = await customer_modal_1.default.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }
        const existingItemIndex = customer.cart.findIndex((item) => item.productId.toString() === productId);
        if (existingItemIndex >= 0) {
            const existing = customer.cart[existingItemIndex];
            if (existing) {
                existing.quantity += quantity;
                if (discount !== undefined)
                    existing.discount = discount;
            }
        }
        else {
            customer.cart.push({
                productId: new mongoose_1.default.Types.ObjectId(productId),
                quantity,
                discount,
            });
        }
        await customer.save();
        return res.status(200).json({
            success: true,
            data: customer.cart,
        });
    }
    catch (err) {
        console.error("Add to cart error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.addToCart = addToCart;
const removeFromCart = async (req, res) => {
    try {
        const customerId = requireCustomerId(req, res);
        if (!customerId)
            return;
        const { productId } = req.body;
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required",
            });
        }
        const customer = await customer_modal_1.default.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }
        customer.cart = customer.cart.filter((item) => item.productId.toString() !== productId);
        await customer.save();
        return res.status(200).json({
            success: true,
            data: customer.cart,
        });
    }
    catch (err) {
        console.error("Remove from cart error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.removeFromCart = removeFromCart;
const qtyChange = async (req, res) => {
    try {
        const customerId = requireCustomerId(req, res);
        if (!customerId)
            return;
        const { productId, quantity } = req.body;
        if (!productId || quantity === undefined || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Product ID and quantity (>= 1) are required",
            });
        }
        const customer = await customer_modal_1.default.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }
        const itemIndex = customer.cart.findIndex((item) => item.productId.toString() === productId);
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
    }
    catch (err) {
        console.error("Quantity change error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.qtyChange = qtyChange;
const handleCustomerRefreshToken = async (req, res) => {
    try {
        const cookieToken = req
            .cookies?.customerRefreshToken;
        const bodyToken = req.body?.refreshToken;
        const refreshToken = cookieToken || bodyToken;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token is required",
            });
        }
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
    catch (err) {
        const e = err;
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
exports.handleCustomerRefreshToken = handleCustomerRefreshToken;
const customerLogout = async (_req, res) => {
    (0, cookie_1.clearCustomerRefreshTokenCookie)(res);
    return res.status(200).json({
        success: true,
        message: "Customer logged out successfully",
    });
};
exports.customerLogout = customerLogout;
const registerCustomer = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
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
        const existing = await customer_modal_1.default.findOne({ email: normalized });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }
        const hashed = await bcryptjs_1.default.hash(password, BCRYPT_SALT_ROUNDS);
        const customer = await customer_modal_1.default.create({
            name: name?.trim() || "New Customer",
            email: normalized,
            phone: phone?.trim() || undefined,
            password: hashed,
            role: "customer",
            isVerified: true,
            isActive: true,
        });
        const accessToken = (0, token_1.signCustomerAccessToken)(customer);
        const refreshToken = (0, token_1.signCustomerRefreshToken)(customer);
        (0, cookie_1.setCustomerRefreshTokenCookie)(res, refreshToken);
        const safeCustomer = customer.toJSON();
        try {
            await (0, mail_1.sendEmail)({ to: normalized, ...mail_1.templates.welcome(name?.trim() || "Customer") });
        }
        catch (mailErr) {
            console.warn("Welcome email failed to send:", mailErr);
        }
        return res.status(201).json((0, token_1.buildAuthResponse)(safeCustomer, accessToken, refreshToken, "Customer registered successfully"));
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
exports.registerCustomer = registerCustomer;
const loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;
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
        const customer = await customer_modal_1.default.findOne({ email: normalized }).select("+password");
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
        const isValid = await bcryptjs_1.default.compare(password, customer.password);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }
        customer.lastLoginAt = new Date();
        await customer.save();
        const accessToken = (0, token_1.signCustomerAccessToken)(customer);
        const refreshToken = (0, token_1.signCustomerRefreshToken)(customer);
        (0, cookie_1.setCustomerRefreshTokenCookie)(res, refreshToken);
        const safeCustomer = customer.toJSON();
        return res.status(200).json((0, token_1.buildAuthResponse)(safeCustomer, accessToken, refreshToken, "Login successful"));
    }
    catch (err) {
        console.error("Login customer error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.loginCustomer = loginCustomer;
const changeCustomerPassword = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
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
        if (password === newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from current password",
            });
        }
        const customer = await customer_modal_1.default.findById(principal.sub).select("+password");
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }
        if (!customer.password) {
            return res.status(400).json({
                success: false,
                message: "Password login is not enabled for this account",
            });
        }
        const valid = await bcryptjs_1.default.compare(password, customer.password);
        if (!valid) {
            return res.status(400).json({ success: false, message: "Current password is incorrect" });
        }
        customer.password = await bcryptjs_1.default.hash(newPassword, BCRYPT_SALT_ROUNDS);
        await customer.save();
        return res.status(200).json({
            success: true,
            message: "Password updated successfully",
        });
    }
    catch (err) {
        console.error("Change customer password error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.changeCustomerPassword = changeCustomerPassword;
const getAllCustomersPaged = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        const [customers, total] = await Promise.all([
            customer_modal_1.default.find({ isActive: true })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            customer_modal_1.default.countDocuments({ isActive: true }),
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
    }
    catch (err) {
        console.error("Get all customers paged error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getAllCustomersPaged = getAllCustomersPaged;
