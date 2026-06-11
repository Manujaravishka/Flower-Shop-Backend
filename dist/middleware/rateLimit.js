"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpRateLimit = exports.authRateLimit = exports.rateLimit = void 0;
const store = new Map();
const defaultMessage = "Too many requests, please try again later.";
const rateLimit = (options) => {
    const { windowMs, max, keyPrefix = "rl", message = defaultMessage } = options;
    return (req, res, next) => {
        const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
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
exports.rateLimit = rateLimit;
exports.authRateLimit = (0, exports.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyPrefix: "auth",
    message: "Too many authentication attempts. Please try again later.",
});
exports.otpRateLimit = (0, exports.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyPrefix: "otp",
    message: "Too many OTP requests. Please try again later.",
});
