"use client";

import { useState } from "react";
import { ScanForm } from "@/components/ScanForm";
import Link from "next/link";

interface ScanData {
  id: string;
  public_token: string;
  original_url: string;
  normalized_url: string;
  status: string;
}

export default function HomePage() {
  const [lastScan, setLastScan] = useState<ScanData | null>(null);

  return (
    <main style={mainStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <h1 style={titleStyle}>WP Performance Scanner</h1>
          <p style={subtitleStyle}>
            Analyze your WordPress site and get detailed performance insights
          </p>
        </header>

        <section style={formSectionStyle}>
          <ScanForm onScanCreated={setLastScan} />
        </section>

        {lastScan && (
          <div style={reportLinkStyle}>
            <div style={reportLinkIconStyle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
            </div>
            <div style={reportLinkContentStyle}>
              <p style={reportLinkTitleStyle}>Scan created</p>
              <p style={reportLinkUrlStyle}>{lastScan.original_url}</p>
              <p style={reportLinkTokenStyle}>
                Token: <code style={tokenStyle}>{lastScan.public_token}</code>
              </p>
            </div>
            <Link
              href={`/report/${lastScan.public_token}`}
              style={viewReportButtonStyle}
            >
              View Report →
            </Link>
          </div>
        )}

        <footer style={footerStyle}>
          <p style={footerTextStyle}>
            Powered by Playwright + Supabase
          </p>
        </footer>
      </div>
    </main>
  );
}

const mainStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "32px",
  backgroundColor: "#f9fafb"
};

const containerStyle: React.CSSProperties = {
  maxWidth: 640,
  width: "100%"
};

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "32px"
};

const titleStyle: React.CSSProperties = {
  fontSize: "2.5rem",
  fontWeight: 700,
  color: "#111827",
  margin: 0,
  marginBottom: "8px"
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "1.125rem",
  color: "#6b7280",
  margin: 0
};

const formSectionStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "24px",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  marginBottom: "24px"
};

const reportLinkStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "20px 24px",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginBottom: "24px",
};

const reportLinkIconStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "8px",
  backgroundColor: "#dcfce7",
  color: "#22c55e",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const reportLinkContentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const reportLinkTitleStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#111827",
  margin: 0,
  marginBottom: "2px",
};

const reportLinkUrlStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#6b7280",
  margin: 0,
  marginBottom: "4px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const reportLinkTokenStyle: React.CSSProperties = {
  fontSize: "0.6875rem",
  color: "#9ca3af",
  margin: 0,
};

const tokenStyle: React.CSSProperties = {
  fontFamily: "monospace",
  backgroundColor: "#f3f4f6",
  padding: "1px 4px",
  borderRadius: "3px",
};

const viewReportButtonStyle: React.CSSProperties = {
  padding: "10px 20px",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#ffffff",
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  textDecoration: "none",
  flexShrink: 0,
  whiteSpace: "nowrap",
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  marginTop: "32px"
};

const footerTextStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#9ca3af",
  margin: 0
};
