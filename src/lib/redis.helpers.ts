import { getRedisClient } from "./redis";

export const redisGet = async (key: string): Promise<string | null> => {
    try {
        const client = await getRedisClient();
        if (!client) return null;
        return await client.get(key);
    } catch {
        return null;
    }
};

export const redisSet = async (
    key: string,
    value: string,
    ttlSeconds?: number
): Promise<boolean> => {
    try {
        const client = await getRedisClient();
        if (!client) return false;
        if (ttlSeconds) {
            await client.set(key, value, { EX: ttlSeconds });
        } else {
            await client.set(key, value);
        }
        return true;
    } catch {
        return false;
    }
};

export const redisDel = async (key: string): Promise<boolean> => {
    try {
        const client = await getRedisClient();
        if (!client) return false;
        await client.del(key);
        return true;
    } catch {
        return false;
    }
};

export const redisDelPrefix = async (prefix: string): Promise<number> => {
    try {
        const client = await getRedisClient();
        if (!client) return 0;
        let cursor = "0";
        let removed = 0;
        do {
            const result = await client.scan(cursor, { MATCH: `${prefix}*`, COUNT: 100 });
            cursor = result.cursor.toString();
            if (result.keys.length > 0) {
                await client.del(result.keys);
                removed += result.keys.length;
            }
        } while (cursor !== "0");
        return removed;
    } catch {
        return 0;
    }
};
