import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../model/user.Modal";
import Customer from "../model/customer.modal";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const dropCustomerTtlIndex = async (): Promise<void> => {
    const db = mongoose.connection.db;
    if (!db) {
        console.log("No DB connection; skipping index drop");
        return;
    }
    try {
        const indexes = await db.collection("customers").indexes();
        const ttl = indexes.find(
            (i) =>
                i.key &&
                (i.key as Record<string, number>).createdAt === 1 &&
                i.expireAfterSeconds !== undefined
        );
        if (ttl && ttl.name) {
            await db.collection("customers").dropIndex(ttl.name);
            console.log(`Dropped TTL index: ${ttl.name}`);
        } else {
            console.log("No TTL index found on customers.createdAt; nothing to drop");
        }
    } catch (err) {
        console.error("Failed to drop TTL index:", err);
    }
};

const backfillUserRoles = async (): Promise<void> => {
    const usersWithoutRole = await User.find({
        $or: [{ role: { $exists: false } }, { role: null }, { role: "" }],
    });
    if (usersWithoutRole.length === 0) {
        console.log("All users already have a role");
        return;
    }
    const total = await User.countDocuments();
    for (const user of usersWithoutRole) {
        user.role = total === 1 ? "superadmin" : "admin";
        await user.save();
    }
    console.log(`Backfilled role for ${usersWithoutRole.length} user(s)`);
};

const backfillCustomerRoles = async (): Promise<void> => {
    const result = await Customer.updateMany(
        { $or: [{ role: { $exists: false } }, { role: null }, { role: "" }] },
        { $set: { role: "customer" } }
    );
    console.log(
        `Backfilled role for ${result.modifiedCount} customer(s)`
    );
};

const backfillCustomerIsActive = async (): Promise<void> => {
    const result = await Customer.updateMany(
        { $or: [{ isActive: { $exists: false } }, { isActive: null }] },
        { $set: { isActive: true } }
    );
    console.log(`Backfilled isActive for ${result.modifiedCount} customer(s)`);
};

const backfillUserIsActive = async (): Promise<void> => {
    const result = await User.updateMany(
        { $or: [{ isActive: { $exists: false } }, { isActive: null }] },
        { $set: { isActive: true } }
    );
    console.log(`Backfilled isActive for ${result.modifiedCount} user(s)`);
};

const main = async () => {
    if (!MONGO_URI) {
        console.error("MONGO_URI is required");
        process.exit(1);
    }
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");
        await dropCustomerTtlIndex();
        await backfillUserRoles();
        await backfillUserIsActive();
        await backfillCustomerRoles();
        await backfillCustomerIsActive();
        console.log("Migration complete");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

main();
