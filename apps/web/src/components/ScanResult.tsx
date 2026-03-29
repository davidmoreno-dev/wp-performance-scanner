"use client";

import { useEffect, useState } from "react";

interface ScanData {
  id: string;
  public_token: string;
  original_url: string;
  normalized_url: string;
  status: string;
}

interface ScanResult {
  id: string;
  page_title: string | null;
  load_time_ms: number | null;
  dom_content_loaded_ms: number | null;
  request_count: number | null;
  total_bytes: number | null;
  image_count: number | null;
  heavy_images_count: number | null;
  heavy_images: { url: string; size_bytes: number; type: string }[];
  script_count: number | null;
  heavy_scripts_count: number | null;
  heavy_scripts: { url: string; size_bytes: number; type: string }[];
  stylesheet_count: number | null;
  heavy_stylesheets_count: number | null;
  heavy_stylesheets: { url: string; size_bytes: number; type: string }[];
  lazy_loading_implemented: boolean | null;
  lazy_images_count: number | null;
  non_lazy_images_count: number | null;
  recommendations: {
    type: "error" | "warning" | "info";
    category: string;
    title: string;
    description: string;
    url?: string;
  }[];
  created_at: string;
}

interface ScanWithResult extends ScanData {
  score: number | null;
  wp_detected: boolean | null;
  wp_version: string | null;
  error_message: string | null;
  finished_at: string | null;
  scan_results: ScanResult | null;
}

interface ScanResultProps {
  data: ScanData;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getScoreColor(score: number | null): string {
  if (score === null) return "#6b7280";
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  return "#ef4444";
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    queued: "Queued",
    running: "Scanning...",
    completed: "Completed",
    failed: "Failed",
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: "#f3f4f6", text: "#6b7280" },
    queued: { bg: "#dbeafe", text: "#1d4ed8" },
    running: { bg: "#fef3c7", text: "#b45309" },
    completed: { bg: "#dcfce7", text: "#15803d" },
    failed: { bg: "#fee2e2", text: "#b91c1c" },
  };
  return colors[status]?.bg || "#f3f4f6";
}

export function ScanResult({ data }: ScanResultProps) {
  const [scan, setScan] = useState<ScanWithResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data.public_token) return;

    let interval: ReturnType<typeof setInterval>;

    async function fetchScan() {
      try {
        const res = await fetch(`/api/scan/${data.public_token}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Failed to load scan");
          setLoading(false);
          return;
        }
        const result: ScanWithResult = await res.json();
        setScan(result);
        setLoading(false);

        if (result.status === "completed" || result.status === "failed") {
          return;
        }
      } catch {
        setError("Failed to connect");
        setLoading(false);
      }
    }

    fetchScan();

    interval = setInterval(fetchScan, 3000);

    return () => clearInterval(interval);
  }, [data.public_token]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>
          <div style={spinnerStyle} />
          <p style={loadingTextStyle}>Loading scan results...</p>
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div style={containerStyle}>
        <div style={{ ...errorBoxStyle }}>
          <p style={{ margin: 0, color: "#dc2626", fontSize: "0.875rem" }}>
            {error || "Failed to load scan"}
          </p>
        </div>
      </div>
    );
  }

  if (scan.status === "failed") {
    return (
      <div style={containerStyle}>
        <div style={failedStyle}>
          <div style={failedIconStyle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h3 style={failedTitleStyle}>Scan Failed</h3>
          <p style={failedTextStyle}>
            {scan.error_message || "An error occurred during the scan."}
          </p>
        </div>
      </div>
    );
  }

  if (scan.status !== "completed") {
    return (
      <div style={containerStyle}>
        <div style={scanningStyle}>
          <div style={spinnerStyle} />
          <h3 style={scanningTitleStyle}>Scanning in Progress</h3>
          <p style={scanningTextStyle}>The scanner is analyzing <strong>{scan.original_url}</strong>. This usually takes 10-30 seconds.</p>
          <p style={scanningStatusStyle}>
            Status: <span style={{ ...statusBadgeStyle(scan.status) }}>{getStatusLabel(scan.status)}</span>
          </p>
        </div>
      </div>
    );
  }

  const result = scan.scan_results;
  const score = scan.score ?? 0;

  return (
    <div style={containerStyle}>
      <div style={scoreSectionStyle}>
        <div style={scoreCircleStyle(score)}>
          <span style={{ ...scoreNumberStyle, color: getScoreColor(score) }}>{score}</span>
          <span style={scoreLabelStyle}>/ 100</span>
        </div>
        <div style={scoreInfoStyle}>
          <h3 style={scoreTitleStyle}>Performance Score</h3>
          {scan.wp_detected ? (
            <p style={wpBadgeStyle}>
              WordPress {scan.wp_version || "detected"}
            </p>
          ) : (
            <p style={notWpStyle}>No WordPress detected</p>
          )}
          <span style={{ ...statusBadgeStyle("completed"), display: "inline-block", marginTop: "4px" }}>
            {getStatusLabel(scan.status)}
          </span>
        </div>
      </div>

      {result && (
        <>
          <div style={metricsGridStyle}>
            <div style={metricCardStyle}>
              <span style={metricValueStyle}>{formatMs(result.load_time_ms)}</span>
              <span style={metricLabelStyle}>Load Time</span>
            </div>
            <div style={metricCardStyle}>
              <span style={metricValueStyle}>{result.request_count ?? 0}</span>
              <span style={metricLabelStyle}>Requests</span>
            </div>
            <div style={metricCardStyle}>
              <span style={metricValueStyle}>{formatBytes(result.total_bytes)}</span>
              <span style={metricLabelStyle}>Page Weight</span>
            </div>
            <div style={metricCardStyle}>
              <span style={metricValueStyle}>{result.image_count ?? 0}</span>
              <span style={metricLabelStyle}>Images</span>
            </div>
          </div>

          <div style={resourcesStyle}>
            <div style={resourceRowStyle}>
              <span style={resourceLabelStyle}>Scripts</span>
              <span style={resourceValueStyle}>{result.script_count ?? 0} ({result.heavy_scripts_count ?? 0} heavy)</span>
            </div>
            <div style={resourceRowStyle}>
              <span style={resourceLabelStyle}>Stylesheets</span>
              <span style={resourceValueStyle}>{result.stylesheet_count ?? 0} ({result.heavy_stylesheets_count ?? 0} heavy)</span>
            </div>
            <div style={resourceRowStyle}>
              <span style={resourceLabelStyle}>Lazy Loading</span>
              <span style={resourceValueStyle}>
                {result.lazy_loading_implemented
                  ? `${result.lazy_images_count ?? 0} lazy, ${result.non_lazy_images_count ?? 0} eager`
                  : `Not implemented (${result.non_lazy_images_count ?? 0} images)`}
              </span>
            </div>
          </div>

          {result.recommendations.length > 0 && (
            <div style={recommendationsStyle}>
              <h4 style={recsTitleStyle}>Recommendations</h4>
              {result.recommendations.map((rec, i) => (
                <div key={i} style={recItemStyle(rec.type)}>
                  <span style={recIconStyle(rec.type)}>
                    {rec.type === "error" ? "✕" : rec.type === "warning" ? "⚠" : "ℹ"}
                  </span>
                  <div>
                    <p style={recTitleStyle}>{rec.title}</p>
                    <p style={recDescStyle}>{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p style={footerInfoStyle}>
        Scanned <strong>{scan.original_url}</strong> •{" "}
        {scan.finished_at
          ? `Completed ${new Date(scan.finished_at).toLocaleString()}`
          : "Just now"}
      </p>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  overflow: "hidden",
};

const loadingStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "48px",
  gap: "16px",
};

const spinnerStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  border: "3px solid #e5e7eb",
  borderTopColor: "#2563eb",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const loadingTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: "0.875rem",
};

const errorBoxStyle: React.CSSProperties = {
  padding: "16px",
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
};

const failedStyle: React.CSSProperties = {
  padding: "24px",
  textAlign: "center",
};

const failedIconStyle: React.CSSProperties = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  backgroundColor: "#fee2e2",
  color: "#ef4444",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 16px",
};

const failedTitleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#991b1b",
  margin: "0 0 8px",
};

const failedTextStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
  margin: 0,
};

const scanningStyle: React.CSSProperties = {
  padding: "32px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
};

const scanningTitleStyle: React.CSSProperties = {
  fontSize: "1.125rem",
  fontWeight: 600,
  color: "#111827",
  margin: 0,
};

const scanningTextStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
  margin: 0,
};

const scanningStatusStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
  margin: 0,
  display: "flex",
  gap: "8px",
  alignItems: "center",
};

const scoreSectionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "24px",
  padding: "24px",
  borderBottom: "1px solid #f3f4f6",
};

const scoreCircleStyle = (score: number): React.CSSProperties => ({
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  border: `6px solid ${getScoreColor(score)}`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const scoreNumberStyle: React.CSSProperties = {
  fontSize: "1.75rem",
  fontWeight: 700,
  lineHeight: 1,
};

const scoreLabelStyle: React.CSSProperties = {
  fontSize: "0.625rem",
  color: "#9ca3af",
};

const scoreInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const scoreTitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  color: "#111827",
  margin: 0,
};

const wpBadgeStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#059669",
  backgroundColor: "#d1fae5",
  padding: "2px 8px",
  borderRadius: "9999px",
  margin: 0,
  display: "inline-block",
};

const notWpStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#6b7280",
  margin: 0,
};

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: "#f3f4f6", text: "#6b7280" },
    queued: { bg: "#dbeafe", text: "#1d4ed8" },
    running: { bg: "#fef3c7", text: "#b45309" },
    completed: { bg: "#dcfce7", text: "#15803d" },
    failed: { bg: "#fee2e2", text: "#b91c1c" },
  };
  const c = colors[status] || { bg: "#f3f4f6", text: "#6b7280" };
  return {
    fontSize: "0.75rem",
    fontWeight: 500,
    padding: "2px 8px",
    backgroundColor: c.bg,
    color: c.text,
    borderRadius: "9999px",
    textTransform: "uppercase" as const,
  };
};

const metricsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "1px",
  backgroundColor: "#f3f4f6",
  borderBottom: "1px solid #f3f4f6",
};

const metricCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "16px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const metricValueStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#9ca3af",
  margin: 0,
};

const resourcesStyle: React.CSSProperties = {
  padding: "16px 24px",
  borderBottom: "1px solid #f3f4f6",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const resourceRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const resourceLabelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
};

const resourceValueStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#111827",
};

const recommendationsStyle: React.CSSProperties = {
  padding: "16px 24px",
  borderBottom: "1px solid #f3f4f6",
};

const recsTitleStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#111827",
  margin: "0 0 12px",
};

const recItemStyle = (type: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; border: string; icon: string }> = {
    error: { bg: "#fef2f2", border: "#fecaca", icon: "#ef4444" },
    warning: { bg: "#fffbeb", border: "#fde68a", icon: "#f59e0b" },
    info: { bg: "#eff6ff", border: "#bfdbfe", icon: "#3b82f6" },
  };
  const c = colors[type] || colors.info;
  return {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    padding: "10px 12px",
    backgroundColor: c.bg,
    borderLeft: `3px solid ${c.border}`,
    borderRadius: "6px",
    marginBottom: "8px",
  };
};

const recIconStyle = (type: string): React.CSSProperties => {
  const colors: Record<string, string> = {
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };
  return {
    fontSize: "0.875rem",
    color: colors[type] || "#3b82f6",
    flexShrink: 0,
    lineHeight: "1.4",
  };
};

const recTitleStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#111827",
  margin: 0,
  marginBottom: "2px",
};

const recDescStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#6b7280",
  margin: 0,
};

const footerInfoStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#9ca3af",
  margin: 0,
  padding: "12px 24px",
  textAlign: "center",
};
