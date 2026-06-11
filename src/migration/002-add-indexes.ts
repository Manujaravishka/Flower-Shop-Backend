import mongoose from "mongoose";
import dotenv from "dotenv";
import OrderModel from "../model/Order.modal";
import Gift from "../model/gift.modal";
import Customer from "../model/customer.modal";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const ensureIndexes = async (): Promise<void> => {
    console.log("Ensuring OrderModel indexes...");
    await OrderModel.syncIndexes();
    console.log("Ensuring Gift indexes...");
    await Gift.syncIndexes();
    console.log("Ensuring Customer indexes...");
    await Customer.syncIndexes();
};

const main = async () => {
    if (!MONGO_URI) {
        console.error("MONGO_URI is required");
        process.exit(1);
    }
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");
        await ensureIndexes();
        console.log("Index migration complete");
        process.exit(0);
    } catch (err) {
        console.error("Index migration failed:", err);
        process.exit(1);
    }
};

main();

