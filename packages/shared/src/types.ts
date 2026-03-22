import type { ScanStatus } from "./scan-status";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  public_token: string;
  user_id: string | null;
  original_url: string;
  normalized_url: string;
  final_url: string | null;
  status: ScanStatus;
  score: number | null;
  wp_detected: boolean | null;
  wp_version: string | null;
  error_message: string | null;
  queued_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScanResult {
  id: string;
  scan_id: string;
  page_title: string | null;
  load_time_ms: number | null;
  dom_content_loaded_ms: number | null;
  request_count: number | null;
  total_bytes: number | null;
  image_count: number | null;
  heavy_images_count: number | null;
  heavy_images: HeavyResource[];
  script_count: number | null;
  heavy_scripts_count: number | null;
  heavy_scripts: HeavyResource[];
  stylesheet_count: number | null;
  heavy_stylesheets_count: number | null;
  heavy_stylesheets: HeavyResource[];
  lazy_loading_implemented: boolean | null;
  lazy_images_count: number | null;
  non_lazy_images_count: number | null;
  recommendations: Recommendation[];
  raw_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HeavyResource {
  url: string;
  size_bytes: number;
  type: string;
}

export interface Recommendation {
  type: "error" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  url?: string;
}

export interface ScanEvent {
  id: number;
  scan_id: string;
  event_type: string;
  message: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface ScanWithResult extends Scan {
  result: ScanResult | null;
}
