import { createClient, type RedisClientType } from "redis";


export const redis: RedisClientType = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
export const redisSub = redis.duplicate();
redis.on("error", (err) =>
    console.error("Redis error:", err));
export async function connectRedis() {
    if (!redis.isOpen) await redis.connect();
    if (!redisSub.isOpen) await redisSub.connect();
}