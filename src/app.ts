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

let cachedDb: mongoose.Mongoose | null = null;
let connecting: Promise<void> | null = null;

export const connectDB = async (): Promise<mongoose.Mongoose | null> => {
  if (cachedDb) return cachedDb;
  if (connecting) {
    await connecting;
    return cachedDb;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("MONGO_URI not set — running without database");
    return null;
  }

  connecting = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 })
    .then((db) => {
      cachedDb = db;
      console.log("Database connected successfully");
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Database connection failed:", message);
      cachedDb = null;
    })
    .finally(() => {
      connecting = null;
    });

  await connecting;
  return cachedDb;
};

mongoose.set("strictQuery", true);

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
      if (process.env.NODE_ENV === "production") {
        return callback(null, true);
      }
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
    environment: process.env.NODE_ENV || "development",
    dbConnected: !!cachedDb,
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

export default app;
