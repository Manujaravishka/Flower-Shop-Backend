"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Order_modal_1 = __importDefault(require("../model/Order.modal"));
const gift_modal_1 = __importDefault(require("../model/gift.modal"));
const customer_modal_1 = __importDefault(require("../model/customer.modal"));
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI;
const ensureIndexes = async () => {
    console.log("Ensuring OrderModel indexes...");
    await Order_modal_1.default.syncIndexes();
    console.log("Ensuring Gift indexes...");
    await gift_modal_1.default.syncIndexes();
    console.log("Ensuring Customer indexes...");
    await customer_modal_1.default.syncIndexes();
};
const main = async () => {
    if (!MONGO_URI) {
        console.error("MONGO_URI is required");
        process.exit(1);
    }
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log("Connected to MongoDB");
        await ensureIndexes();
        console.log("Index migration complete");
        process.exit(0);
    }
    catch (err) {
        console.error("Index migration failed:", err);
        process.exit(1);
    }
};
main();
