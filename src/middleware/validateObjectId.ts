import { Request, Response, NextFunction, RequestHandler } from "express";
import mongoose from "mongoose";

export const validateObjectId =
    (field: string = "id"): RequestHandler =>
    (req: Request, res: Response, next: NextFunction) => {
        const value = req.params[field] || req.body?.[field];
        if (!value || !mongoose.Types.ObjectId.isValid(value)) {
            return res.status(400).json({
                success: false,
                message: `Invalid ${field}`,
            });
        }
        return next();
    };
