import { Request, Response } from "express";
import Customer from "../model/customer.modal";
import { AuthRequest } from "../middleware/auth";
export const getMyProfile = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const customer = await Customer.findById(principal.sub);
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
    } catch (err) {
        console.error("Get my profile error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const updateMyProfile = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const { name, phone, address } = req.body as {
            name?: string;
            phone?: string;
            address?: string;
        };

        if (name === undefined && phone === undefined && address === undefined) {
            return res.status(400).json({
                success: false,
                message: "At least one field is required to update",
            });
        }

        const customer = await Customer.findById(principal.sub);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        if (name !== undefined) customer.name = name;
        if (phone !== undefined) customer.phone = phone;
        if (address !== undefined) customer.address = address;

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
    } catch (err) {
        console.error("Update my profile error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const deleteMyAccount = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const customer = await Customer.findByIdAndUpdate(
            principal.sub,
            { isActive: false },
            { new: true }
        );
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Account deactivated successfully",
        });
    } catch (err) {
        console.error("Delete my account error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getMyCart = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const customer = await Customer.findById(principal.sub).populate({
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
    } catch (err) {
        console.error("Get my cart error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const clearMyCart = async (req: Request, res: Response) => {
    try {
        const principal = (req as AuthRequest).user;
        if (!principal || principal.type !== "customer") {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const customer = await Customer.findById(principal.sub);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        customer.cart = [];
        await customer.save();

        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
        });
    } catch (err) {
        console.error("Clear my cart error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
