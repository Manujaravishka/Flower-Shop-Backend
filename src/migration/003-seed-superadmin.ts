import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../model/user.Modal";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const seedSuperAdmin = async (): Promise<void> => {
    const email = process.env.SUPERADMIN_EMAIL || "admin@petaldreams.local";
    const password = process.env.SUPERADMIN_PASSWORD || "ChangeMe123!";
    const name = process.env.SUPERADMIN_NAME || "Atelier Admin";

    const existing = await User.findOne({ email }).select("+password");
    if (existing) {
        console.log(`Superadmin already exists: ${email}`);
        return;
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
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
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");
        await seedSuperAdmin();
        process.exit(0);
    } catch (err) {
        console.error("Seed failed:", err);
        process.exit(1);
    }
};

main();
