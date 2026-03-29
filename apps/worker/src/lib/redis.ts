import Redis, { type RedisOptions } from "ioredis";

const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_USERNAME = process.env.REDIS_USERNAME || undefined;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const redisConfig: RedisOptions = UPSTASH_REDIS_URL
  ? { url: UPSTASH_REDIS_URL, maxRetriesPerRequest: null, enableReadyCheck: false, lazyConnect: true } as RedisOptions
  : {
      host: REDIS_HOST,
      port: REDIS_PORT,
      username: REDIS_USERNAME,
      password: REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true
    };

let redisClient: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);
  }
  return redisClient;
}

export async function connectRedis(): Promise<Redis> {
  const client = getRedisConnection();
  await client.connect();
  return client;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export async function pingRedis(): Promise<boolean> {
  try {
    const client = getRedisConnection();
    const result = await client.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}
