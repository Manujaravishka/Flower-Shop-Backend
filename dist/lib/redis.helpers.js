"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisDelPrefix = exports.redisDel = exports.redisSet = exports.redisGet = void 0;
const redis_1 = require("./redis");
const redisGet = async (key) => {
    try {
        const client = await (0, redis_1.getRedisClient)();
        if (!client)
            return null;
        return await client.get(key);
    }
    catch {
        return null;
    }
};
exports.redisGet = redisGet;
const redisSet = async (key, value, ttlSeconds) => {
    try {
        const client = await (0, redis_1.getRedisClient)();
        if (!client)
            return false;
        if (ttlSeconds) {
            await client.set(key, value, { EX: ttlSeconds });
        }
        else {
            await client.set(key, value);
        }
        return true;
    }
    catch {
        return false;
    }
};
exports.redisSet = redisSet;
const redisDel = async (key) => {
    try {
        const client = await (0, redis_1.getRedisClient)();
        if (!client)
            return false;
        await client.del(key);
        return true;
    }
    catch {
        return false;
    }
};
exports.redisDel = redisDel;
const redisDelPrefix = async (prefix) => {
    try {
        const client = await (0, redis_1.getRedisClient)();
        if (!client)
            return 0;
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
    }
    catch {
        return 0;
    }
};
exports.redisDelPrefix = redisDelPrefix;
