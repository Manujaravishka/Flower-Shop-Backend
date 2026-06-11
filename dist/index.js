"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const user_router_1 = __importDefault(require("./routes/user.router"));
const gift_router_1 = __importDefault(require("./routes/gift.router"));
const customer_router_1 = __importDefault(require("./routes/customer.router"));
const customer_auth_router_1 = __importDefault(require("./routes/customer.auth.router"));
const customer_profile_router_1 = __importDefault(require("./routes/customer.profile.router"));
const customer_order_router_1 = __importDefault(require("./routes/customer.order.router"));
const orders_routers_1 = __importDefault(require("./routes/orders.routers"));
const payment_router_1 = __importDefault(require("./routes/payment.router"));
const payment_webhook_router_1 = __importDefault(require("./routes/payment.webhook.router"));
const library_router_1 = __importDefault(require("./routes/library.router"));
const ai_router_1 = __importDefault(require("./routes/ai.router"));
const review_router_1 = __importDefault(require("./routes/review.router"));
const dashboard_router_1 = __importDefault(require("./routes/dashboard.router"));
const cart_router_1 = __importDefault(require("./routes/cart.router"));
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI;
const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const REQUIRED_ENV = [
    "MONGO_URI",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key] || process.env[key] === "");
if (missingEnv.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missingEnv.join(", ")}`);
    process.exit(1);
}
const PLACEHOLDER_PATTERN = /^replace_with_/i;
const placeholderEnv = REQUIRED_ENV.filter((key) => PLACEHOLDER_PATTERN.test(process.env[key] || ""));
if (placeholderEnv.length > 0) {
    console.error(`FATAL: Placeholder values detected for: ${placeholderEnv.join(", ")}. Replace them with strong, random values.`);
    process.exit(1);
}
const app = (0, express_1.default)();
app.set("trust proxy", 1);
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "https://flower-boquet-frontend.vercel.app",
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestLogger_1.requestLogger);
app.use("/uploads", express_1.default.static(path_1.default.resolve(process.cwd(), "uploads")));
app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running",
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});
app.use("/api/v1/auth", user_router_1.default);
app.use("/api/v1/gift", gift_router_1.default);
app.use("/api/v1/customer/auth", customer_auth_router_1.default);
app.use("/api/v1/customer", customer_profile_router_1.default);
app.use("/api/v1/customer", customer_order_router_1.default);
app.use("/api/v1/customer", customer_router_1.default);
app.use("/api/v1/order", orders_routers_1.default);
app.use("/api/v1/payment", payment_router_1.default);
app.use("/api/v1/payment", payment_webhook_router_1.default);
app.use("/api/v1/library", library_router_1.default);
app.use("/api/v1/ai", ai_router_1.default);
app.use("/api/v1/review", review_router_1.default);
app.use("/api/v1/dashboard", dashboard_router_1.default);
app.use("/api/v1/cart", cart_router_1.default);
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
mongoose_1.default.set("strictQuery", true);
let server = null;
const startServer = async () => {
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log("Database connected successfully");
        server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT} (${NODE_ENV})`);
        });
    }
    catch (err) {
        console.error("Database connection failed:", err);
        process.exit(1);
    }
};
startServer();
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    if (server) {
        server.close();
    }
    try {
        await mongoose_1.default.connection.close();
        console.log("MongoDB connection closed.");
    }
    catch (err) {
        console.error("Error closing MongoDB connection:", err);
    }
    process.exit(0);
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
exports.default = app;
