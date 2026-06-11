import { Request, Response, NextFunction } from "express";

interface Bucket {
    count: number;
    resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitOptions {
    windowMs: number;
    max: number;
    keyPrefix?: string;
    message?: string;
}

const defaultMessage = "Too many requests, please try again later.";

export const rateLimit = (options: RateLimitOptions) => {
    const { windowMs, max, keyPrefix = "rl", message = defaultMessage } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        const ip =
            (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
            req.socket.remoteAddress ||
            "unknown";
        const key = `${keyPrefix}:${ip}:${req.method}:${req.path}`;

        const now = Date.now();
        const bucket = store.get(key);

        if (!bucket || bucket.resetAt < now) {
            store.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (bucket.count >= max) {
            const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
            res.setHeader("Retry-After", String(retryAfter));
            return res.status(429).json({
                success: false,
                message,
            });
        }

        bucket.count += 1;
        return next();
    };
};

export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyPrefix: "auth",
    message: "Too many authentication attempts. Please try again later.",
});

export const otpRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyPrefix: "otp",
    message: "Too many OTP requests. Please try again later.",
});
