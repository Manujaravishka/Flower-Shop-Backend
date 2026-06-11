import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_ENABLED = (process.env.REDIS_ENABLED ?? "false").toLowerCase() !== "false";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType | null> | null = null;
let warned = false;

const warnOnce = (msg: string) => {
    if (!warned) {
        console.warn(`[redis] ${msg} — running without cache`);
        warned = true;
    }
};

export const getRedisClient = async (): Promise<RedisClientType | null> => {
    if (!REDIS_ENABLED) return null;

    if (client && client.isOpen) return client;

    if (!client) {
        client = createClient({ url: REDIS_URL });

        client.on("error", (err) => {
            const code = (err as NodeJS.ErrnoException)?.code;
            if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
                warnOnce(`unavailable at ${REDIS_URL} (${code})`);
            } else {
                console.error("Redis Client Error", err);
            }
        });

        client.on("ready", () => {
            console.log("Redis connected");
            warned = false;
        });
    }

    if (connecting) return connecting;

    connecting = (async () => {
        try {
            await client!.connect();
            return client;
        } catch (err) {
            const code = (err as NodeJS.ErrnoException)?.code;
            warnOnce(`connect failed (${code ?? "unknown"})`);
            client = null;
            return null;
        } finally {
            connecting = null;
        }
    })();

    return connecting;
};

export const closeRedis = async (): Promise<void> => {
    if (client && client.isOpen) {
        await client.quit();
    }
    client = null;
};
