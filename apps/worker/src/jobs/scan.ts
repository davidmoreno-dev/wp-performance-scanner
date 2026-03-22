import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ScanJobData, ScanJobResult } from "@wps/shared";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabaseClient;
}

async function updateScanStatus(
  scanId: string,
  status: "queued" | "running" | "completed" | "failed",
  errorMessage?: string
): Promise<void> {
  const supabase = getSupabase();

  const updateData: Record<string, unknown> = { status };

  if (status === "queued") {
    updateData.queued_at = new Date().toISOString();
  } else if (status === "running") {
    updateData.started_at = new Date().toISOString();
  } else if (status === "completed" || status === "failed") {
    updateData.finished_at = new Date().toISOString();
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
  }

  const { error } = await supabase
    .from("scans")
    .update(updateData)
    .eq("id", scanId);

  if (error) {
    console.error(`[ScanJob] Failed to update scan ${scanId} status:`, error);
  }
}

async function addScanEvent(
  scanId: string,
  eventType: string,
  message: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.from("scan_events").insert({
    scan_id: scanId,
    event_type: eventType,
    message,
    meta
  });

  if (error) {
    console.error(`[ScanJob] Failed to add scan event:`, error);
  }
}

export async function processScanJob(data: ScanJobData): Promise<ScanJobResult> {
  const { scanId, url, publicToken } = data;

  console.log(`[ScanJob] Starting scan ${scanId} for URL: ${url}`);

  try {
    await updateScanStatus(scanId, "running");
    await addScanEvent(scanId, "started", `Starting scan for ${url}`);

    console.log(`[ScanJob] Scan ${scanId} is running. Playwright analysis will be implemented in next phase.`);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await updateScanStatus(scanId, "completed");
    await addScanEvent(scanId, "completed", "Scan completed successfully");

    console.log(`[ScanJob] Scan ${scanId} completed`);

    return {
      scanId,
      success: true
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    console.error(`[ScanJob] Scan ${scanId} failed:`, errorMessage);

    await updateScanStatus(scanId, "failed", errorMessage);
    await addScanEvent(scanId, "failed", `Scan failed: ${errorMessage}`);

    return {
      scanId,
      success: false,
      error: errorMessage
    };
  }
}
