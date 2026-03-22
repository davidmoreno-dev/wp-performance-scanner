interface ScanResultProps {
  data: {
    id: string;
    public_token: string;
    original_url: string;
    normalized_url: string;
    status: string;
  };
}

export function ScanResult({ data }: ScanResultProps) {
  return (
    <div style={containerStyle}>
      <div style={successIconStyle}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20,6 9,17 4,12" />
        </svg>
      </div>

      <h3 style={titleStyle}>Scan Created</h3>

      <div style={detailsStyle}>
        <div style={detailRowStyle}>
          <span style={detailLabelStyle}>URL:</span>
          <span style={detailValueStyle}>{data.original_url}</span>
        </div>
        <div style={detailRowStyle}>
          <span style={detailLabelStyle}>Status:</span>
          <span style={statusBadgeStyle}>{data.status}</span>
        </div>
        <div style={detailRowStyle}>
          <span style={detailLabelStyle}>Token:</span>
          <code style={tokenStyle}>{data.public_token}</code>
        </div>
      </div>

      <p style={infoStyle}>
        Your scan is now queued. The scanner will analyze your WordPress site
        and generate a performance report. Note: The worker is not yet
        connected. Integration with BullMQ/Redis coming in the next phase.
      </p>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  padding: "24px",
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "12px"
};

const successIconStyle: React.CSSProperties = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  backgroundColor: "#22c55e",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "16px"
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#166534",
  marginTop: 0,
  marginBottom: "16px"
};

const detailsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "16px"
};

const detailRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "baseline"
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#374151",
  minWidth: "60px"
};

const detailValueStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#111827"
};

const statusBadgeStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 500,
  padding: "2px 8px",
  backgroundColor: "#fef3c7",
  color: "#92400e",
  borderRadius: "9999px",
  textTransform: "uppercase"
};

const tokenStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontFamily: "monospace",
  backgroundColor: "#f3f4f6",
  padding: "2px 6px",
  borderRadius: "4px",
  wordBreak: "break-all"
};

const infoStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "#6b7280",
  margin: 0,
  padding: "12px",
  backgroundColor: "#fefce8",
  borderRadius: "8px",
  border: "1px solid #fef08a"
};
