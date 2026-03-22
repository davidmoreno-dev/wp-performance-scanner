import "./config";

import { APP_NAME } from "@wps/shared";
import { startScanWorker, stopScanWorker } from "./lib/queue";
import { closeRedis, pingRedis } from "./lib/redis";

function validateEnvironment(): void {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "REDIS_HOST",
    "REDIS_PORT"
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`[Worker] Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl.startsWith("https://")) {
    console.error("[Worker] NEXT_PUBLIC_SUPABASE_URL must use HTTPS");
    process.exit(1);
  }

  if (!serviceRoleKey.startsWith("eyJ")) {
    console.warn("[Worker] Warning: SUPABASE_SERVICE_ROLE_KEY might be invalid (should start with 'eyJ')");
  }
}

async function bootstrap() {
  console.log(`[${APP_NAME}] Worker starting...`);

  validateEnvironment();

  console.log("[Worker] Environment validated");

  const redisConnected = await pingRedis();
  if (!redisConnected) {
    console.error("[Worker] Redis connection failed. Make sure Redis is running.");
    console.log("[Worker] To start Redis locally: docker run -d -p 6379:6379 redis:alpine");
    process.exit(1);
  }

  console.log("[Worker] Redis connection successful");

  try {
    await startScanWorker();
    console.log(`[${APP_NAME}] Worker is ready and processing jobs`);
    console.log(`[${APP_NAME}] Queue: ${process.env.BULLMQ_SCAN_QUEUE || "scan-jobs"}`);
    console.log(`[${APP_NAME}] Concurrency: ${process.env.WORKER_CONCURRENCY || "2"}`);
  } catch (error) {
    console.error("[Worker] Failed to start scan worker:", error);
    process.exit(1);
  }

  process.on("SIGTERM", async () => {
    console.log("[Worker] Received SIGTERM, shutting down gracefully...");
    await stopScanWorker();
    await closeRedis();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[Worker] Received SIGINT, shutting down gracefully...");
    await stopScanWorker();
    await closeRedis();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});
