"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearMyCart = exports.getMyCart = exports.deleteMyAccount = exports.updateMyProfile = exports.getMyProfile = void 0;
const customer_modal_1 = __importDefault(require("../model/customer.modal"));
const getMyProfile = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const customer = await customer_modal_1.default.findById(principal.sub);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }
        return res.status(200).json({
            success: true,
            data: {
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                isVerified: customer.isVerified,
                role: customer.role,
                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt,
            },
        });
    }
    catch (err) {
        console.error("Get my profile error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.getMyProfile = getMyProfile;
const updateMyProfile = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const { name, phone, address } = req.body;
        if (name === undefined && phone === undefined && address === undefined) {
            return res.status(400).json({
                success: false,
                message: "At least one field is required to update",
            });
        }
        const customer = await customer_modal_1.default.findById(principal.sub);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }
        if (name !== undefined)
            customer.name = name;
        if (phone !== undefined)
            customer.phone = phone;
        if (address !== undefined)
            customer.address = address;
        await customer.save();
        return res.status(200).json({
            success: true,
            data: {
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                role: customer.role,
            },
        });
    }
    catch (err) {
        console.error("Update my profile error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.updateMyProfile = updateMyProfile;
const deleteMyAccount = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const customer = await customer_modal_1.default.findByIdAndUpdate(principal.sub, { isActive: false }, { new: true });
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }
        return res.status(200).json({
            success: true,
            message: "Account deactivated successfully",
        });
    }
    catch (err) {
        console.error("Delete my account error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.deleteMyAccount = deleteMyAccount;
const getMyCart = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const customer = await customer_modal_1.default.findById(principal.sub).populate({
            path: "cart.productId",
            model: "Gift",
        });
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }
        return res.status(200).json({
            success: true,
            data: customer.cart,
        });
    }
    catch (err) {
        console.error("Get my cart error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.getMyCart = getMyCart;
const clearMyCart = async (req, res) => {
    try {
        const principal = req.user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const customer = await customer_modal_1.default.findById(principal.sub);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }
        customer.cart = [];
        await customer.save();
        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
        });
    }
    catch (err) {
        console.error("Clear my cart error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.clearMyCart = clearMyCart;
