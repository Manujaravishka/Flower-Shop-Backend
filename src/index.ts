import express, { Request, Response } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";

import userRouter from "./routes/user.router";
import giftRouter from "./routes/gift.router";
import customerRouter from "./routes/customer.router";
import customerAuthRouter from "./routes/customer.auth.router";
import customerProfileRouter from "./routes/customer.profile.router";
import customerOrderRouter from "./routes/customer.order.router";
import orderRouter from "./routes/orders.routers";
import paymentRouter from "./routes/payment.router";
import paymentWebhookRouter from "./routes/payment.webhook.router";
import libraryRouter from "./routes/library.router";
import aiRouter from "./routes/ai.router";
import reviewRouter from "./routes/review.router";
import dashboardRouter from "./routes/dashboard.router";
import cartRouter from "./routes/cart.router";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";

dotenv.config();

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
    console.error(
        `FATAL: Missing required environment variables: ${missingEnv.join(", ")}`
    );
    process.exit(1);
}

const PLACEHOLDER_PATTERN = /^replace_with_/i;
const placeholderEnv = REQUIRED_ENV.filter((key) =>
    PLACEHOLDER_PATTERN.test(process.env[key] || "")
);
if (placeholderEnv.length > 0) {
    console.error(
        `FATAL: Placeholder values detected for: ${placeholderEnv.join(", ")}. Replace them with strong, random values.`
    );
    process.exit(1);
}

const app = express();

app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "https://flower-boquet-frontend.vercel.app",
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error(`CORS: origin ${origin} not allowed`));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestLogger);

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "Server is running",
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

app.use("/api/v1/auth", userRouter);
app.use("/api/v1/gift", giftRouter);
app.use("/api/v1/customer/auth", customerAuthRouter);
app.use("/api/v1/customer", customerProfileRouter);
app.use("/api/v1/customer", customerOrderRouter);
app.use("/api/v1/customer", customerRouter);
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/payment", paymentRouter);
app.use("/api/v1/payment", paymentWebhookRouter);
app.use("/api/v1/library", libraryRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/review", reviewRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/cart", cartRouter);

app.use(notFoundHandler);
app.use(errorHandler);

mongoose.set("strictQuery", true);

let server: ReturnType<typeof app.listen> | null = null;

const startServer = async () => {
    try {
        await mongoose.connect(MONGO_URI as string);
        console.log("Database connected successfully");
        server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT} (${NODE_ENV})`);
        });
    } catch (err) {
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

const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    if (server) {
        server.close();
    }
    try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
    } catch (err) {
        console.error("Error closing MongoDB connection:", err);
    }
    process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
