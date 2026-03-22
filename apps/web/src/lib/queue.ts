import { Queue } from "bullmq";
import { ScanJobData, SCAN_JOB_NAME } from "@wps/shared";

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_USERNAME = process.env.REDIS_USERNAME || undefined;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const SCAN_QUEUE_NAME = process.env.BULLMQ_SCAN_QUEUE || "scan-jobs";

const CONNECTION_TIMEOUT_MS = 5000;

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  username: REDIS_USERNAME,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  connectTimeout: CONNECTION_TIMEOUT_MS,
  commandTimeout: CONNECTION_TIMEOUT_MS,
  retryStrategy: () => null
};

export class RedisConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisConnectionError";
  }
}

export class QueueConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueueConnectionError";
  }
}

let scanQueue: Queue<ScanJobData> | null = null;
let connectionChecked = false;

async function checkRedisConnection(): Promise<boolean> {
  const Redis = (await import("ioredis")).default;

  return new Promise((resolve) => {
    const client = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      username: REDIS_USERNAME,
      password: REDIS_PASSWORD,
      connectTimeout: CONNECTION_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null
    });

    const timeout = setTimeout(() => {
      client.disconnect();
      resolve(false);
    }, CONNECTION_TIMEOUT_MS);

    client.on("connect", () => {
      clearTimeout(timeout);
      client.disconnect();
      resolve(true);
    });

    client.on("error", () => {
      clearTimeout(timeout);
      client.disconnect();
      resolve(false);
    });
  });
}

export async function ensureRedisAvailable(): Promise<void> {
  if (connectionChecked) {
    return;
  }

  const available = await checkRedisConnection();

  if (!available) {
    throw new RedisConnectionError(
      `Redis is not available at ${REDIS_HOST}:${REDIS_PORT}. Please start Redis first.`
    );
  }

  connectionChecked = true;
}

export function getScanQueue(): Queue<ScanJobData> {
  if (!scanQueue) {
    scanQueue = new Queue<ScanJobData>(SCAN_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000
        },
        removeOnComplete: {
          count: 100
        },
        removeOnFail: {
          count: 500
        }
      }
    });
  }
  return scanQueue;
}

export async function addScanJob(data: ScanJobData): Promise<string> {
  await ensureRedisAvailable();

  const queue = getScanQueue();

  try {
    const job = await queue.add(SCAN_JOB_NAME, data, {
      jobId: data.scanId
    });

    return job.id || data.scanId;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Connection is closed")) {
      throw new QueueConnectionError(
        "Redis connection was lost. Please refresh and try again."
      );
    }
    throw error;
  }
}

export async function closeScanQueue(): Promise<void> {
  if (scanQueue) {
    await scanQueue.close();
    scanQueue = null;
  }
}
