"use client";

import { useState } from "react";
import { ScanForm } from "@/components/ScanForm";
import { ScanResult } from "@/components/ScanResult";

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

        {lastScan && <ScanResult data={lastScan} />}

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

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  marginTop: "32px"
};

const footerTextStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#9ca3af",
  margin: 0
};
