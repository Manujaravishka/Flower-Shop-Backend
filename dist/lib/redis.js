"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedis = exports.getRedisClient = void 0;
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const REDIS_ENABLED = (process.env.REDIS_ENABLED ?? "false").toLowerCase() !== "false";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let client = null;
let connecting = null;
let warned = false;
const warnOnce = (msg) => {
    if (!warned) {
        console.warn(`[redis] ${msg} — running without cache`);
        warned = true;
    }
};
const getRedisClient = async () => {
    if (!REDIS_ENABLED)
        return null;
    if (client && client.isOpen)
        return client;
    if (!client) {
        client = (0, redis_1.createClient)({ url: REDIS_URL });
        client.on("error", (err) => {
            const code = err?.code;
            if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
                warnOnce(`unavailable at ${REDIS_URL} (${code})`);
            }
            else {
                console.error("Redis Client Error", err);
            }
        });
        client.on("ready", () => {
            console.log("Redis connected");
            warned = false;
        });
    }
    if (connecting)
        return connecting;
    connecting = (async () => {
        try {
            await client.connect();
            return client;
        }
        catch (err) {
            const code = err?.code;
            warnOnce(`connect failed (${code ?? "unknown"})`);
            client = null;
            return null;
        }
        finally {
            connecting = null;
        }
    })();
    return connecting;
};
exports.getRedisClient = getRedisClient;
const closeRedis = async () => {
    if (client && client.isOpen) {
        await client.quit();
    }
    client = null;
};
exports.closeRedis = closeRedis;
