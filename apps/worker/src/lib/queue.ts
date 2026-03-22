import { Worker, Job } from "bullmq";
import { ScanJobData, ScanJobResult, SCAN_JOB_NAME } from "@wps/shared";
import { getRedisConnection } from "./redis";
import { processScanJob } from "../jobs/scan";

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_USERNAME = process.env.REDIS_USERNAME || undefined;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const SCAN_QUEUE_NAME = process.env.BULLMQ_SCAN_QUEUE || "scan-jobs";
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "2", 10);

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  username: REDIS_USERNAME,
  password: REDIS_PASSWORD
};

let scanWorker: Worker<ScanJobData, ScanJobResult> | null = null;

export async function startScanWorker(): Promise<Worker<ScanJobData, ScanJobResult>> {
  if (scanWorker) {
    return scanWorker;
  }

  scanWorker = new Worker<ScanJobData, ScanJobResult>(
    SCAN_QUEUE_NAME,
    async (job: Job<ScanJobData, ScanJobResult>) => {
      console.log(`[Worker] Processing job ${job.id} for scan ${job.data.scanId}`);

      try {
        const result = await processScanJob(job.data);
        console.log(`[Worker] Job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        console.error(`[Worker] Job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: WORKER_CONCURRENCY,
      limiter: {
        max: 5,
        duration: 1000
      }
    }
  );

  scanWorker.on("completed", (job: Job<ScanJobData, ScanJobResult>) => {
    console.log(`[Worker] Job ${job.id} completed for scan ${job.data.scanId}`);
  });

  scanWorker.on("failed", (job: Job<ScanJobData, ScanJobResult> | undefined, error: Error) => {
    console.error(`[Worker] Job ${job?.id} failed:`, error.message);
  });

  scanWorker.on("error", (error: Error) => {
    console.error("[Worker] Worker error:", error.message);
  });

  console.log(`[Worker] Scan worker started on queue "${SCAN_QUEUE_NAME}" with concurrency ${WORKER_CONCURRENCY}`);

  return scanWorker;
}

export async function stopScanWorker(): Promise<void> {
  if (scanWorker) {
    await scanWorker.close();
    scanWorker = null;
    console.log("[Worker] Scan worker stopped");
  }
}

export function getScanWorker(): Worker<ScanJobData, ScanJobResult> | null {
  return scanWorker;
}
