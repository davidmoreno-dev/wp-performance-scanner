"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

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

interface ScanWithResult {
  id: string;
  public_token: string;
  original_url: string;
  normalized_url: string;
  final_url: string | null;
  status: string;
  score: number | null;
  wp_detected: boolean | null;
  wp_version: string | null;
  error_message: string | null;
  queued_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  scan_results: ScanResult | null;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
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

function getScoreLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 60) return "Poor";
  return "Critical";
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

function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

function ResourceRow({ url, size, type }: { url: string; size: number; type: string }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = url.length > 60;

  return (
    <div style={resourceRowStyle}>
      <div style={resourceUrlStyle}>
        <span style={resourceTypeIconStyle(type)}>
          {type === "image" ? "🖼" : type === "script" ? "📜" : "🎨"}
        </span>
        <span
          style={{ ...resourceUrlTextStyle, cursor: truncated ? "pointer" : "default" }}
          onClick={() => truncated && setExpanded(!expanded)}
          title={url}
        >
          {expanded ? url : (truncated ? url.substring(0, 60) + "..." : url)}
        </span>
      </div>
      <span style={{ ...resourceSizeStyle, color: size > 500 * 1024 ? "#ef4444" : size > 200 * 1024 ? "#f59e0b" : "#6b7280" }}>
        {formatBytes(size)}
      </span>
    </div>
  );
}

function CategorySection({ title, items, icon }: { title: string; items: { url: string; size_bytes: number; type: string }[]; icon: string }) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  return (
    <div style={categorySectionStyle}>
      <button style={categoryHeaderStyle} onClick={() => setExpanded(!expanded)}>
        <span>{icon} {title}</span>
        <span style={categoryCountStyle}>{items.length}</span>
        <span style={categoryChevronStyle(expanded)}>▶</span>
      </button>
      {expanded && (
        <div style={categoryContentStyle}>
          {items.map((item, i) => (
            <ResourceRow key={i} url={item.url} size={item.size_bytes} type={item.type} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ScanReport({ token }: { token: string }) {
  const [scan, setScan] = useState<ScanWithResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchScan() {
    try {
      const res = await fetch(`/api/scan/${token}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to load scan");
        setLoading(false);
        return;
      }
      const data: ScanWithResult = await res.json();
      setScan(data);
      setLoading(false);
      return data;
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchScan();

    const interval = setInterval(async () => {
      const data = await fetchScan();
      if (data?.status === "completed" || data?.status === "failed") {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div style={reportContainerStyle}>
        <div style={loadingCardStyle}>
          <div style={spinnerStyle} />
          <p style={loadingTextStyle}>Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div style={reportContainerStyle}>
        <div style={errorCardStyle}>
          <h2 style={errorTitleStyle}>Report not found</h2>
          <p style={errorTextStyle}>{error || "This scan does not exist."}</p>
          <Link href="/" style={backLinkStyle}>← Back to scanner</Link>
        </div>
      </div>
    );
  }

  if (scan.status === "failed") {
    return (
      <div style={reportContainerStyle}>
        <div style={reportHeaderStyle}>
          <Link href="/" style={backLinkStyle}>← New scan</Link>
        </div>
        <div style={failedCardStyle}>
          <div style={failedIconStyle}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 style={failedTitleStyle}>Scan Failed</h2>
          <p style={failedUrlStyle}>{scan.original_url}</p>
          <p style={failedErrorStyle}>
            {scan.error_message || "An error occurred while scanning this site."}
          </p>
          <p style={failedHintStyle}>
            The site may be offline, blocking requests, or the URL may be invalid.
          </p>
        </div>
      </div>
    );
  }

  if (scan.status !== "completed") {
    return (
      <div style={reportContainerStyle}>
        <div style={reportHeaderStyle}>
          <Link href="/" style={backLinkStyle}>← New scan</Link>
        </div>
        <div style={scanningCardStyle}>
          <div style={spinnerStyle} />
          <h2 style={scanningTitleStyle}>Scan in Progress</h2>
          <p style={scanningUrlStyle}>{scan.original_url}</p>
          <div style={progressBarStyle}>
            <div style={progressFillStyle} />
          </div>
          <p style={scanningStatusStyle}>
            Status: <strong>{getStatusLabel(scan.status)}</strong>
          </p>
          <p style={scanningHintStyle}>
            This page will update automatically. You can also bookmark this URL.
          </p>
          <button style={refreshButtonStyle} onClick={fetchScan}>
            Check now
          </button>
        </div>
      </div>
    );
  }

  const result = scan.scan_results;
  const score = scan.score ?? 0;
  const scoreColor = getScoreColor(score);

  const errors = result?.recommendations.filter((r) => r.type === "error") ?? [];
  const warnings = result?.recommendations.filter((r) => r.type === "warning") ?? [];
  const infos = result?.recommendations.filter((r) => r.type === "info") ?? [];

  return (
    <div style={reportContainerStyle}>
      <div style={reportHeaderStyle}>
        <Link href="/" style={backLinkStyle}>← New scan</Link>
        <div style={reportMetaStyle}>
          <span style={reportMetaTextStyle}>{getRelativeTime(scan.finished_at)}</span>
          <span style={reportMetaDotStyle}>·</span>
          <a
            href={scan.final_url || scan.original_url}
            target="_blank"
            rel="noopener noreferrer"
            style={reportUrlStyle}
          >
            {scan.final_url || scan.original_url} ↗
          </a>
        </div>
      </div>

      <div style={scoreCardStyle}>
        <div style={scoreLeftStyle}>
          <div style={{ ...scoreCircleStyle(score), borderColor: scoreColor }}>
            <span style={{ ...scoreValueStyle, color: scoreColor }}>{score}</span>
            <span style={scoreMaxStyle}>/ 100</span>
          </div>
          <div style={scoreInfoStyle}>
            <p style={scoreLabelStyle}>{getScoreLabel(score)}</p>
            <p style={scoreTitleStyle}>Performance Score</p>
            {scan.wp_detected ? (
              <span style={wpBadgeStyle}>
                WordPress {scan.wp_version || ""}
              </span>
            ) : (
              <span style={notWpBadgeStyle}>Not WordPress</span>
            )}
          </div>
        </div>

        <div style={scoreRightStyle}>
          <div style={metricPairStyle}>
            <span style={metricValueStyle}>{formatMs(result?.load_time_ms ?? null)}</span>
            <span style={metricLabelStyle}>Load Time</span>
          </div>
          <div style={metricPairStyle}>
            <span style={metricValueStyle}>{formatMs(result?.dom_content_loaded_ms ?? null)}</span>
            <span style={metricLabelStyle}>DOM Ready</span>
          </div>
          <div style={metricPairStyle}>
            <span style={metricValueStyle}>{result?.request_count ?? 0}</span>
            <span style={metricLabelStyle}>Requests</span>
          </div>
          <div style={metricPairStyle}>
            <span style={metricValueStyle}>{formatBytes(result?.total_bytes ?? null)}</span>
            <span style={metricLabelStyle}>Page Weight</span>
          </div>
        </div>
      </div>

      <div style={recommendationsSectionStyle}>
        <h3 style={sectionTitleStyle}>
          Recommendations ({errors.length + warnings.length + infos.length})
        </h3>

        {errors.length > 0 && (
          <div style={recGroupStyle}>
            <h4 style={recGroupTitleStyle("#ef4444")}>
              Errors ({errors.length})
            </h4>
            {errors.map((rec, i) => (
              <div key={i} style={recItemStyle("#fef2f2", "#fecaca")}>
                <span style={recIconStyle("#ef4444")}>✕</span>
                <div>
                  <p style={recTitleStyle}>{rec.title}</p>
                  <p style={recDescStyle}>{rec.description}</p>
                  {rec.url && (
                    <a href={rec.url} target="_blank" rel="noopener noreferrer" style={recUrlStyle}>
                      {rec.url.length > 50 ? rec.url.substring(0, 50) + "..." : rec.url}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div style={recGroupStyle}>
            <h4 style={recGroupTitleStyle("#f59e0b")}>
              Warnings ({warnings.length})
            </h4>
            {warnings.map((rec, i) => (
              <div key={i} style={recItemStyle("#fffbeb", "#fde68a")}>
                <span style={recIconStyle("#f59e0b")}>⚠</span>
                <div>
                  <p style={recTitleStyle}>{rec.title}</p>
                  <p style={recDescStyle}>{rec.description}</p>
                  {rec.url && (
                    <a href={rec.url} target="_blank" rel="noopener noreferrer" style={recUrlStyle}>
                      {rec.url.length > 50 ? rec.url.substring(0, 50) + "..." : rec.url}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {infos.length > 0 && (
          <div style={recGroupStyle}>
            <h4 style={recGroupTitleStyle("#6b7280")}>
              Info ({infos.length})
            </h4>
            {infos.map((rec, i) => (
              <div key={i} style={recItemStyle("#f9fafb", "#e5e7eb")}>
                <span style={recIconStyle("#6b7280")}>ℹ</span>
                <div>
                  <p style={recTitleStyle}>{rec.title}</p>
                  <p style={recDescStyle}>{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {errors.length === 0 && warnings.length === 0 && infos.length === 0 && (
          <p style={noRecsStyle}>No recommendations generated.</p>
        )}
      </div>

      <div style={resourcesSectionStyle}>
        <h3 style={sectionTitleStyle}>Resource Analysis</h3>
        <div style={resourcesSummaryStyle}>
          <div style={resourceStatStyle}>
            <span style={resourceStatValueStyle}>{result?.image_count ?? 0}</span>
            <span style={resourceStatLabelStyle}>Images</span>
          </div>
          <div style={resourceStatStyle}>
            <span style={{ ...resourceStatValueStyle, color: (result?.heavy_images_count ?? 0) > 0 ? "#ef4444" : "#22c55e" }}>
              {result?.heavy_images_count ?? 0}
            </span>
            <span style={resourceStatLabelStyle}>Heavy Images</span>
          </div>
          <div style={resourceStatStyle}>
            <span style={resourceStatValueStyle}>{result?.script_count ?? 0}</span>
            <span style={resourceStatLabelStyle}>Scripts</span>
          </div>
          <div style={resourceStatStyle}>
            <span style={{ ...resourceStatValueStyle, color: (result?.heavy_scripts_count ?? 0) > 0 ? "#ef4444" : "#22c55e" }}>
              {result?.heavy_scripts_count ?? 0}
            </span>
            <span style={resourceStatLabelStyle}>Heavy Scripts</span>
          </div>
          <div style={resourceStatStyle}>
            <span style={resourceStatValueStyle}>{result?.stylesheet_count ?? 0}</span>
            <span style={resourceStatLabelStyle}>Stylesheets</span>
          </div>
          <div style={resourceStatStyle}>
            <span style={{ ...resourceStatValueStyle, color: (result?.heavy_stylesheets_count ?? 0) > 0 ? "#ef4444" : "#22c55e" }}>
              {result?.heavy_stylesheets_count ?? 0}
            </span>
            <span style={resourceStatLabelStyle}>Heavy CSS</span>
          </div>
        </div>

        <CategorySection
          title="Heavy Images"
          icon="🖼"
          items={result?.heavy_images ?? []}
        />
        <CategorySection
          title="Heavy Scripts"
          icon="📜"
          items={result?.heavy_scripts ?? []}
        />
        <CategorySection
          title="Heavy Stylesheets"
          icon="🎨"
          items={result?.heavy_stylesheets ?? []}
        />

        <div style={lazyLoadSectionStyle}>
          <h4 style={lazyLoadTitleStyle}>Lazy Loading</h4>
          <p style={lazyLoadTextStyle}>
            {result?.lazy_loading_implemented
              ? `✓ Implemented — ${result.lazy_images_count ?? 0} lazy-loaded images, ${result.non_lazy_images_count ?? 0} eager-loaded`
              : `✕ Not implemented — ${result?.non_lazy_images_count ?? 0} images load eagerly (no lazy loading)`}
          </p>
        </div>
      </div>

      <div style={footerStyle}>
        <p style={footerTextStyle}>
          Generated by WP Performance Scanner ·{" "}
          <a href={scan.final_url || scan.original_url} target="_blank" rel="noopener noreferrer" style={footerLinkStyle}>
            {scan.original_url}
          </a>
        </p>
      </div>
    </div>
  );
}

const reportContainerStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f9fafb",
  padding: "0 16px 48px",
};

const reportHeaderStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: "0 auto",
  padding: "24px 0 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
};

const backLinkStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 500,
};

const reportMetaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "0.75rem",
  color: "#6b7280",
};

const reportMetaTextStyle: React.CSSProperties = { color: "#9ca3af" };
const reportMetaDotStyle: React.CSSProperties = { color: "#d1d5db" };

const reportUrlStyle: React.CSSProperties = {
  color: "#6b7280",
  textDecoration: "none",
};

const loadingCardStyle: React.CSSProperties = {
  maxWidth: 400,
  margin: "80px auto",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "48px",
  textAlign: "center",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
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

const errorCardStyle: React.CSSProperties = {
  maxWidth: 400,
  margin: "80px auto",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "48px",
  textAlign: "center",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const errorTitleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#111827",
  margin: "0 0 8px",
};

const errorTextStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
  margin: "0 0 24px",
};

const failedCardStyle: React.CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "48px",
  textAlign: "center",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const failedIconStyle: React.CSSProperties = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  backgroundColor: "#fee2e2",
  color: "#ef4444",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 16px",
};

const failedTitleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 8px",
};

const failedUrlStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
  margin: "0 0 16px",
  wordBreak: "break-all",
};

const failedErrorStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#dc2626",
  backgroundColor: "#fef2f2",
  padding: "12px",
  borderRadius: "8px",
  margin: "0 0 12px",
};

const failedHintStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "#6b7280",
  margin: 0,
};

const scanningCardStyle: React.CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "48px",
  textAlign: "center",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
};

const scanningTitleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#111827",
  margin: 0,
};

const scanningUrlStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
  margin: 0,
  wordBreak: "break-all",
};

const progressBarStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 300,
  height: "4px",
  backgroundColor: "#e5e7eb",
  borderRadius: "2px",
  overflow: "hidden",
  margin: "8px 0",
};

const progressFillStyle: React.CSSProperties = {
  width: "60%",
  height: "100%",
  backgroundColor: "#2563eb",
  borderRadius: "2px",
  animation: "pulse 1.5s ease-in-out infinite",
};

const scanningStatusStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b7280",
  margin: 0,
};

const scanningHintStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#9ca3af",
  margin: 0,
};

const refreshButtonStyle: React.CSSProperties = {
  marginTop: "8px",
  padding: "8px 20px",
  fontSize: "0.875rem",
  color: "#2563eb",
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "6px",
  cursor: "pointer",
};

const scoreCardStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: "0 auto 16px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  display: "flex",
  gap: "32px",
  alignItems: "center",
};

const scoreLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
  flexShrink: 0,
};

const scoreCircleStyle = (score: number): React.CSSProperties => ({
  width: "100px",
  height: "100px",
  borderRadius: "50%",
  border: `6px solid`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const scoreValueStyle: React.CSSProperties = {
  fontSize: "2rem",
  fontWeight: 700,
  lineHeight: 1,
};

const scoreMaxStyle: React.CSSProperties = {
  fontSize: "0.625rem",
  color: "#9ca3af",
};

const scoreInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const scoreLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: 0,
};

const scoreTitleStyle: React.CSSProperties = {
  fontSize: "1.125rem",
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
  margin: "4px 0 0",
  display: "inline-block",
};

const notWpBadgeStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#6b7280",
  backgroundColor: "#f3f4f6",
  padding: "2px 8px",
  borderRadius: "9999px",
  margin: "4px 0 0",
  display: "inline-block",
};

const scoreRightStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "16px 32px",
  flex: 1,
};

const metricPairStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const metricValueStyle: React.CSSProperties = {
  fontSize: "1.125rem",
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#9ca3af",
  margin: 0,
};

const recommendationsSectionStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: "0 auto 16px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  color: "#111827",
  margin: "0 0 16px",
};

const recGroupStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const recGroupTitleStyle = (color: string): React.CSSProperties => ({
  fontSize: "0.75rem",
  fontWeight: 600,
  color,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: "0 0 8px",
});

const recItemStyle = (bg: string, border: string): React.CSSProperties => ({
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  padding: "10px 12px",
  backgroundColor: bg,
  borderLeft: `3px solid ${border}`,
  borderRadius: "6px",
  marginBottom: "6px",
});

const recIconStyle = (color: string): React.CSSProperties => ({
  fontSize: "0.875rem",
  color,
  flexShrink: 0,
  lineHeight: "1.5",
});

const recTitleStyle: React.CSSProperties = {
  fontSize: "0.875rem",
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

const recUrlStyle: React.CSSProperties = {
  fontSize: "0.6875rem",
  color: "#2563eb",
  textDecoration: "none",
  display: "block",
  marginTop: "4px",
  wordBreak: "break-all",
};

const noRecsStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#9ca3af",
  margin: 0,
  textAlign: "center",
  padding: "24px",
};

const resourcesSectionStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: "0 auto 16px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const resourcesSummaryStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: "8px",
  marginBottom: "20px",
  padding: "16px",
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
};

const resourceStatStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2px",
};

const resourceStatValueStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

const resourceStatLabelStyle: React.CSSProperties = {
  fontSize: "0.625rem",
  color: "#9ca3af",
  textAlign: "center",
  margin: 0,
};

const categorySectionStyle: React.CSSProperties = {
  marginBottom: "8px",
};

const categoryHeaderStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 0",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#374151",
  textAlign: "left",
};

const categoryCountStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#9ca3af",
  backgroundColor: "#f3f4f6",
  padding: "1px 6px",
  borderRadius: "9999px",
};

const categoryChevronStyle = (expanded: boolean): React.CSSProperties => ({
  marginLeft: "auto",
  fontSize: "0.625rem",
  color: "#9ca3af",
  transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
  transition: "transform 0.2s",
});

const categoryContentStyle: React.CSSProperties = {
  paddingLeft: "24px",
  borderLeft: "2px solid #f3f4f6",
  marginLeft: "8px",
};

const resourceRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
  gap: "8px",
};

const resourceUrlStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flex: 1,
  minWidth: 0,
};

const resourceTypeIconStyle = (type: string): React.CSSProperties => ({
  fontSize: "0.75rem",
  flexShrink: 0,
});

const resourceUrlTextStyle: React.CSSProperties = {
  fontSize: "0.6875rem",
  color: "#6b7280",
  fontFamily: "monospace",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const resourceSizeStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 500,
  flexShrink: 0,
};

const lazyLoadSectionStyle: React.CSSProperties = {
  marginTop: "16px",
  padding: "12px 16px",
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
};

const lazyLoadTitleStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#111827",
  margin: "0 0 4px",
};

const lazyLoadTextStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "#6b7280",
  margin: 0,
};

const footerStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: "0 auto",
  paddingTop: "16px",
  textAlign: "center",
};

const footerTextStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#9ca3af",
  margin: 0,
};

const footerLinkStyle: React.CSSProperties = {
  color: "#9ca3af",
  textDecoration: "none",
};
