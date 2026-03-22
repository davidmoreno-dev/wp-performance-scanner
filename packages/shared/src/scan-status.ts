export const SCAN_STATUSES = [
  "pending",
  "queued",
  "running",
  "completed",
  "failed"
] as const;

export type ScanStatus = (typeof SCAN_STATUSES)[number];
