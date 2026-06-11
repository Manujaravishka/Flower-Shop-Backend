"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_Modal_1 = __importDefault(require("../model/user.Modal"));
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI;
const seedSuperAdmin = async () => {
    const email = process.env.SUPERADMIN_EMAIL || "admin@petaldreams.local";
    const password = process.env.SUPERADMIN_PASSWORD || "ChangeMe123!";
    const name = process.env.SUPERADMIN_NAME || "Atelier Admin";
    const existing = await user_Modal_1.default.findOne({ email }).select("+password");
    if (existing) {
        console.log(`Superadmin already exists: ${email}`);
        return;
    }
    const bcrypt = await Promise.resolve().then(() => __importStar(require("bcryptjs")));
    const hashedPassword = await bcrypt.hash(password, 12);
    await user_Modal_1.default.create({
        name,
        email,
        password: hashedPassword,
        role: "superadmin",
        isActive: true,
    });
    console.log(`Superadmin created: ${email}`);
    console.log(`Default password: ${password}`);
    console.log("Please change this password after first login.");
};
const main = async () => {
    if (!MONGO_URI) {
        console.error("MONGO_URI is required");
        process.exit(1);
    }
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log("Connected to MongoDB");
        await seedSuperAdmin();
        process.exit(0);
    }
    catch (err) {
        console.error("Seed failed:", err);
        process.exit(1);
    }
};
main();
