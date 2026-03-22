export interface ScanJobData {
  scanId: string;
  url: string;
  publicToken: string;
}

export interface ScanJobResult {
  scanId: string;
  success: boolean;
  error?: string;
}

export const SCAN_JOB_NAME = "scan";
