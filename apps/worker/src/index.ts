import { APP_NAME } from "@wps/shared";
import { startScanWorker, stopScanWorker } from "./lib/queue";
import { closeRedis, pingRedis } from "./lib/redis";

async function bootstrap() {
  console.log(`[${APP_NAME}] Worker starting...`);

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
