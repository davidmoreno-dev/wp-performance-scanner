import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ScanJobData, ScanJobResult } from "@wps/shared";
import { scanPage } from "../lib/scanner";

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
  extra?: {
    score?: number;
    wpDetected?: boolean;
    wpVersion?: string | null;
    finalUrl?: string;
    errorMessage?: string;
  }
): Promise<void> {
  const supabase = getSupabase();

  const updateData: Record<string, unknown> = { status };

  if (status === "queued") {
    updateData.queued_at = new Date().toISOString();
  } else if (status === "running") {
    updateData.started_at = new Date().toISOString();
  } else if (status === "completed" || status === "failed") {
    updateData.finished_at = new Date().toISOString();
    if (extra?.errorMessage) {
      updateData.error_message = extra.errorMessage;
    }
    if (status === "completed") {
      if (extra?.score !== undefined) updateData.score = extra.score;
      if (extra?.wpDetected !== undefined) updateData.wp_detected = extra.wpDetected;
      if (extra?.wpVersion !== undefined) updateData.wp_version = extra.wpVersion;
      if (extra?.finalUrl) updateData.final_url = extra.finalUrl;
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

async function saveScanResults(
  scanId: string,
  report: Awaited<ReturnType<typeof scanPage>>
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.from("scan_results").upsert(
    {
      scan_id: scanId,
      page_title: report.pageTitle,
      load_time_ms: report.loadTimeMs,
      dom_content_loaded_ms: report.domContentLoadedMs,
      request_count: report.requestCount,
      total_bytes: report.totalBytes,
      image_count: report.imageCount,
      heavy_images_count: report.heavyImagesCount,
      heavy_images: report.heavyImages,
      script_count: report.scriptCount,
      heavy_scripts_count: report.heavyScriptsCount,
      heavy_scripts: report.heavyScripts,
      stylesheet_count: report.stylesheetCount,
      heavy_stylesheets_count: report.heavyStylesheetsCount,
      heavy_stylesheets: report.heavyStylesheets,
      lazy_loading_implemented: report.lazyLoadingImplemented,
      lazy_images_count: report.lazyImagesCount,
      non_lazy_images_count: report.nonLazyImagesCount,
      recommendations: report.recommendations,
      raw_data: {
        wp_detected: report.wpDetected,
        wp_version: report.wpVersion,
        wp_plugins: report.wpPlugins,
        final_url: report.finalUrl,
      }
    },
    { onConflict: "scan_id" }
  );

  if (error) {
    console.error(`[ScanJob] Failed to save scan results for ${scanId}:`, error);
  } else {
    console.log(`[ScanJob] Scan results saved for ${scanId}`);
  }
}

function calculateScore(report: Awaited<ReturnType<typeof scanPage>>): number {
  let score = 100;

  if (report.loadTimeMs > 5000) score -= 20;
  else if (report.loadTimeMs > 3000) score -= 10;

  score -= Math.min(20, report.heavyImagesCount * 3);
  score -= Math.min(15, report.heavyScriptsCount * 5);
  score -= Math.min(10, report.heavyStylesheetsCount * 3);

  if (!report.lazyLoadingImplemented && report.nonLazyImagesCount > 5) {
    score -= 10;
  }

  if (report.totalBytes > 5 * 1024 * 1024) score -= 10;
  else if (report.totalBytes > 2 * 1024 * 1024) score -= 5;

  return Math.max(0, Math.min(100, score));
}

export async function processScanJob(data: ScanJobData): Promise<ScanJobResult> {
  const { scanId, url, publicToken } = data;

  const startTime = Date.now();

  console.log(`[ScanJob] Starting scan ${scanId} for URL: ${url}`);

  try {
    await updateScanStatus(scanId, "running");
    await addScanEvent(scanId, "started", `Starting scan for ${url}`, {
      url,
      publicToken,
      worker_pid: process.pid
    });

    console.log(`[ScanJob] Running Playwright scan for ${url}`);

    const report = await scanPage({ url, timeout: 30000 });

    const score = calculateScore(report);

    console.log(`[ScanJob] Scan ${scanId} report generated:`);
    console.log(`  - WP detected: ${report.wpDetected} (v${report.wpVersion || "?"})`);
    console.log(`  - Load time: ${report.loadTimeMs}ms`);
    console.log(`  - Score: ${score}`);
    console.log(`  - Images: ${report.imageCount} (${report.heavyImagesCount} heavy)`);
    console.log(`  - Scripts: ${report.scriptCount} (${report.heavyScriptsCount} heavy)`);
    console.log(`  - Recommendations: ${report.recommendations.length}`);

    await saveScanResults(scanId, report);

    const duration = Date.now() - startTime;

    await updateScanStatus(scanId, "completed", {
      score,
      wpDetected: report.wpDetected,
      wpVersion: report.wpVersion,
      finalUrl: report.finalUrl,
    });
    await addScanEvent(scanId, "completed", `Scan completed successfully`, {
      duration_ms: duration,
      url,
      score,
      wp_detected: report.wpDetected,
      wp_version: report.wpVersion,
    });

    console.log(`[ScanJob] Scan ${scanId} completed in ${duration}ms (score: ${score})`);

    return {
      scanId,
      success: true
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const duration = Date.now() - startTime;

    console.error(`[ScanJob] Scan ${scanId} failed after ${duration}ms:`, errorMessage);

    await updateScanStatus(scanId, "failed", { errorMessage });
    await addScanEvent(scanId, "failed", `Scan failed: ${errorMessage}`, {
      duration_ms: duration,
      error: errorMessage
    });

    return {
      scanId,
      success: false,
      error: errorMessage
    };
  }
}
